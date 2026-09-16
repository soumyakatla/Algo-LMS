from typing import List, Optional
from uuid import UUID
import uuid
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.lms import User, Course, CourseSection, Activity, Enrollment, VideoWatchProgress, QuizAttempt, QuizQuestion
from app.api.v1.deps import get_current_user

router = APIRouter()

class AdminStatsResponse(BaseModel):
    total_students: int
    total_courses: int
    total_enrollments: int
    avg_progress: float
    total_video_telemetry_records: int
    total_quiz_attempts: int

class StudentDetail(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    enrolled_courses: int
    avg_progress: float
    completed_courses: int

class QuizQuestionCreate(BaseModel):
    question_text: str
    options: List[dict]
    marks: float = 10.0

class CourseCreateRequest(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: bool = True
    section_title: Optional[str] = "Module 1: Core Training"
    activity_type: Optional[str] = "video"  # "video", "quiz", "document", "assignment", "none"
    activity_title: Optional[str] = None
    video_title: Optional[str] = None
    video_url: Optional[str] = None
    content_body: Optional[str] = None
    required_dwell_seconds: Optional[int] = 30
    questions: Optional[List[QuizQuestionCreate]] = None

class AdminEnrollRequest(BaseModel):
    user_id: Optional[UUID] = None  # None means assign to all students
    course_id: UUID

class ActivityCreateRequest(BaseModel):
    title: str
    activity_type: str = "video"  # "video", "document", "quiz", "assignment"
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    required_dwell_seconds: int = 30
    section_id: Optional[UUID] = None
    section_title: Optional[str] = "Module 1: Lessons"
    questions: Optional[List[QuizQuestionCreate]] = None

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    # Count students
    students_res = await db.execute(select(func.count(User.id)).where(User.role == "student"))
    total_students = students_res.scalar() or 0

    # Count courses
    courses_res = await db.execute(select(func.count(Course.id)))
    total_courses = courses_res.scalar() or 0

    # Count enrollments & avg progress
    enr_res = await db.execute(select(func.count(Enrollment.id), func.avg(Enrollment.progress_percentage)))
    enr_row = enr_res.first()
    total_enrollments = enr_row[0] or 0
    avg_progress = round(float(enr_row[1] or 0.0), 1)

    # Count quiz attempts
    quiz_res = await db.execute(select(func.count(QuizAttempt.id)))
    total_quiz_attempts = quiz_res.scalar() or 0

    # Count video progress
    vid_res = await db.execute(select(func.count(VideoWatchProgress.id)))
    total_video_telemetry = vid_res.scalar() or 0

    return AdminStatsResponse(
        total_students=total_students,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        avg_progress=avg_progress,
        total_quiz_attempts=total_quiz_attempts,
        total_video_telemetry_records=total_video_telemetry
    )

@router.get("/students", response_model=List[StudentDetail])
async def get_admin_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    res = await db.execute(
        select(User)
        .options(selectinload(User.enrollments))
        .where(User.role == "student")
    )
    students = res.scalars().all()

    output = []
    for s in students:
        enr_count = len(s.enrollments)
        completed_count = sum(1 for e in s.enrollments if e.status == "completed" or e.progress_percentage >= 100.0)
        avg_prog = (
            sum(e.progress_percentage for e in s.enrollments) / enr_count
            if enr_count > 0 else 0.0
        )
        output.append(StudentDetail(
            id=s.id,
            full_name=s.full_name,
            email=s.email,
            role=s.role,
            enrolled_courses=enr_count,
            avg_progress=round(avg_prog, 1),
            completed_courses=completed_count
        ))

    return output

@router.get("/students/{student_id}")
async def get_student_detail(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    res = await db.execute(
        select(User)
        .options(
            selectinload(User.enrollments).selectinload(Enrollment.course),
            selectinload(User.video_progress).selectinload(VideoWatchProgress.activity),
            selectinload(User.quiz_attempts).selectinload(QuizAttempt.activity)
        )
        .where(User.id == student_id)
    )
    student = res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollments_data = []
    for e in student.enrollments:
        enrollments_data.append({
            "course_id": e.course_id,
            "course_title": e.course.title if e.course else "Unknown Course",
            "progress_percentage": e.progress_percentage,
            "status": e.status,
            "completed_at": e.completed_at
        })

    video_data = []
    for v in student.video_progress:
        video_data.append({
            "activity_id": v.activity_id,
            "activity_title": v.activity.title if v.activity else "Unknown Activity",
            "max_watched_seconds": round(v.max_watched_seconds, 1),
            "duration_seconds": round(v.duration_seconds, 1),
            "percent_completed": round(v.percent_completed, 1),
            "is_completed": v.is_completed,
            "updated_at": v.updated_at
        })

    quiz_data = []
    for q in student.quiz_attempts:
        quiz_data.append({
            "activity_id": q.activity_id,
            "activity_title": q.activity.title if q.activity else "Unknown Quiz",
            "score": q.score,
            "total_marks": q.total_marks,
            "passed": q.passed,
            "created_at": q.created_at
        })

    return {
        "id": student.id,
        "full_name": student.full_name,
        "email": student.email,
        "role": student.role,
        "avatar_url": student.avatar_url,
        "created_at": student.created_at,
        "enrollments": enrollments_data,
        "video_progress": video_data,
        "quiz_attempts": quiz_data
    }

@router.post("/enroll")
async def admin_enroll_user(
    req: AdminEnrollRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    course = await db.get(Course, req.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    target_users = []
    if req.user_id:
        user = await db.get(User, req.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        target_users = [user]
    else:
        u_res = await db.execute(select(User).where(User.role == "student"))
        target_users = u_res.scalars().all()

    enrolled_count = 0
    for u in target_users:
        existing = await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == u.id,
                Enrollment.course_id == req.course_id
            )
        )
        if not existing.scalars().first():
            new_enr = Enrollment(
                id=uuid.uuid4(),
                user_id=u.id,
                course_id=req.course_id,
                progress_percentage=0.0,
                status="in_progress"
            )
            db.add(new_enr)
            enrolled_count += 1

    await db.commit()
    return {"message": f"Successfully enrolled {enrolled_count} learner(s) in {course.title}", "count": enrolled_count}

@router.post("/courses")
async def create_course(
    course_in: CourseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    # Check slug
    existing = await db.execute(select(Course).where(Course.slug == course_in.slug))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A course with this slug already exists")

    course = Course(
        id=uuid.uuid4(),
        slug=course_in.slug,
        title=course_in.title,
        description=course_in.description,
        thumbnail_url=course_in.thumbnail_url or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
        is_published=course_in.is_published,
        created_by=current_user.id
    )
    db.add(course)
    await db.flush()

    # Automatically create initial module and activity if specified
    if course_in.activity_type != "none":
        section = CourseSection(
            id=uuid.uuid4(),
            course_id=course.id,
            title=course_in.section_title or "Module 1: Core Training",
            sort_order=1
        )
        db.add(section)
        await db.flush()

        act_type = course_in.activity_type or "video"
        act_title = course_in.activity_title or course_in.video_title or f"{course_in.title} - Initial Lesson"

        activity = Activity(
            id=uuid.uuid4(),
            section_id=section.id,
            title=act_title,
            activity_type=act_type,
            content_url=course_in.video_url if act_type == "video" else None,
            content_body=course_in.content_body,
            required_dwell_seconds=course_in.required_dwell_seconds or 30 if act_type != "quiz" else 0,
            sort_order=1
        )
        db.add(activity)
        await db.flush()

        if act_type == "quiz" and course_in.questions:
            for idx, q_data in enumerate(course_in.questions):
                q_obj = QuizQuestion(
                    id=uuid.uuid4(),
                    activity_id=activity.id,
                    question_text=q_data.question_text,
                    options=q_data.options,
                    marks=q_data.marks,
                    sort_order=idx + 1
                )
                db.add(q_obj)

    await db.commit()
    await db.refresh(course)
    return course

@router.post("/courses/{course_id}/activities")
async def add_activity_to_course(
    course_id: UUID,
    act_in: ActivityCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    c_res = await db.execute(
        select(Course).options(selectinload(Course.sections).selectinload(CourseSection.activities)).where(Course.id == course_id)
    )
    course = c_res.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    section = None
    if act_in.section_id:
        for s in course.sections:
            if s.id == act_in.section_id:
                section = s
                break

    if not section:
        if course.sections:
            section = course.sections[0]
        else:
            section = CourseSection(
                id=uuid.uuid4(),
                course_id=course.id,
                title=act_in.section_title or "Module 1: Lessons",
                sort_order=1
            )
            db.add(section)
            await db.flush()

    activity = Activity(
        id=uuid.uuid4(),
        section_id=section.id,
        title=act_in.title,
        activity_type=act_in.activity_type,
        content_url=act_in.content_url,
        content_body=act_in.content_body,
        required_dwell_seconds=act_in.required_dwell_seconds,
        sort_order=len(section.activities) + 1 if hasattr(section, "activities") and section.activities else 1
    )
    db.add(activity)
    await db.flush()

    # If quiz activity, add questions
    if act_in.activity_type == "quiz" and act_in.questions:
        for idx, q_data in enumerate(act_in.questions):
            q_obj = QuizQuestion(
                id=uuid.uuid4(),
                activity_id=activity.id,
                question_text=q_data.question_text,
                options=q_data.options,
                marks=q_data.marks,
                sort_order=idx + 1
            )
            db.add(q_obj)

    await db.commit()
    return {"message": "Activity added successfully", "activity_id": str(activity.id)}

@router.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in [".mp4", ".webm", ".mov", ".m4v", ".mkv"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported video format. Please upload .mp4, .webm, or .mov files."
        )

    # Destination: backend/uploads/videos
    uploads_base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
    video_dir = os.path.join(uploads_base, "videos")
    os.makedirs(video_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(video_dir, safe_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Return URL format /media/videos/{safe_name}
    return {
        "filename": file.filename,
        "video_url": f"/media/videos/{safe_name}",
        "size_bytes": file_size,
        "content_type": file.content_type
    }

