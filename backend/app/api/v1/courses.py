from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.lms import Course, CourseSection, Activity, Enrollment, VideoWatchProgress, QuizAttempt
from app.schemas.course import CourseSummaryResponse, CourseDetailResponse, EnrollmentResponse
from app.api.v1.deps import get_current_user, get_current_user_optional
from app.models.lms import User

router = APIRouter()

@router.get("", response_model=List[CourseSummaryResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Course)
        .options(
            selectinload(Course.sections).selectinload(CourseSection.activities),
            selectinload(Course.enrollments)
        )
        .where(Course.is_published == True)
        .order_by(Course.created_at.desc())
    )
    courses = result.scalars().all()
    
    summaries = []
    for c in courses:
        total_activities = sum(len(s.activities) for s in c.sections if hasattr(s, "activities"))
        enrolled_count = len(c.enrollments) if hasattr(c, "enrollments") else 0

        summaries.append(CourseSummaryResponse(
            id=c.id,
            slug=c.slug,
            title=c.title,
            description=c.description,
            thumbnail_url=c.thumbnail_url,
            is_published=c.is_published,
            created_at=c.created_at,
            total_activities=total_activities,
            enrolled_count=enrolled_count
        ))
    return summaries

@router.get("/{slug}", response_model=CourseDetailResponse)
async def get_course_detail(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    result = await db.execute(
        select(Course)
        .options(
            selectinload(Course.sections).selectinload(CourseSection.activities)
        )
        .where(Course.slug == slug)
    )
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    user_enrolled = False
    progress_percentage = 0.0
    completed_activity_ids = set()

    if current_user:
        enr_res = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == current_user.id,
                Enrollment.course_id == course.id
            )
        )
        enrollment = enr_res.scalars().first()
        if enrollment:
            user_enrolled = True
            progress_percentage = enrollment.progress_percentage

            # Check completed videos
            vid_res = await db.execute(
                select(VideoWatchProgress.activity_id).where(
                    VideoWatchProgress.user_id == current_user.id,
                    VideoWatchProgress.is_completed == True
                )
            )
            for row in vid_res.scalars().all():
                completed_activity_ids.add(row)

            # Check passed quizzes
            quiz_res = await db.execute(
                select(QuizAttempt.activity_id).where(
                    QuizAttempt.user_id == current_user.id,
                    QuizAttempt.passed == True
                )
            )
            for row in quiz_res.scalars().all():
                completed_activity_ids.add(row)

    # Format sections and activities
    sections_out = []
    for s in course.sections:
        activities_out = []
        for a in s.activities:
            act_dict = {
                "id": a.id,
                "section_id": a.section_id,
                "title": a.title,
                "activity_type": a.activity_type,
                "content_url": a.content_url,
                "content_body": a.content_body,
                "required_dwell_seconds": a.required_dwell_seconds,
                "sort_order": a.sort_order,
                "is_completed": a.id in completed_activity_ids
            }
            activities_out.append(act_dict)
        sections_out.append({
            "id": s.id,
            "course_id": s.course_id,
            "title": s.title,
            "sort_order": s.sort_order,
            "activities": activities_out
        })

    return CourseDetailResponse(
        id=course.id,
        slug=course.slug,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        is_published=course.is_published,
        created_at=course.created_at,
        sections=sections_out,
        user_enrolled=user_enrolled,
        progress_percentage=progress_percentage
    )

@router.post("/{course_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course_res = await db.execute(select(Course).where(Course.id == course_id))
    course = course_res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enr_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id
        )
    )
    existing_enr = enr_res.scalars().first()
    if existing_enr:
        return existing_enr

    new_enr = Enrollment(
        user_id=current_user.id,
        course_id=course_id,
        progress_percentage=0.0,
        status="in_progress"
    )
    db.add(new_enr)
    await db.commit()
    await db.refresh(new_enr)
    return new_enr
