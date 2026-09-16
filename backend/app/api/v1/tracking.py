from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.lms import User, Activity, CourseSection, Course, Enrollment, VideoWatchProgress, QuizAttempt
from app.schemas.tracking import VideoHeartbeatRequest, VideoHeartbeatResponse, DwellCompleteRequest, ActivityCompletionResponse
from app.api.v1.deps import get_current_user

router = APIRouter()

async def recalculate_course_progress(db: AsyncSession, user_id: UUID, course_id: UUID) -> tuple[float, str]:
    # 1. Total activities in this course
    total_acts_res = await db.execute(
        select(func.count(Activity.id))
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(CourseSection.course_id == course_id)
    )
    total_activities = total_acts_res.scalar() or 0
    if total_activities == 0:
        return 0.0, "not_started"

    # 2. Completed video activities
    completed_video_res = await db.execute(
        select(func.count(VideoWatchProgress.id))
        .join(Activity, VideoWatchProgress.activity_id == Activity.id)
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(
            CourseSection.course_id == course_id,
            VideoWatchProgress.user_id == user_id,
            VideoWatchProgress.is_completed == True
        )
    )
    completed_videos = completed_video_res.scalar() or 0

    # 3. Passed quizzes
    passed_quiz_res = await db.execute(
        select(func.count(QuizAttempt.id.distinct()))
        .join(Activity, QuizAttempt.activity_id == Activity.id)
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(
            CourseSection.course_id == course_id,
            QuizAttempt.user_id == user_id,
            QuizAttempt.passed == True
        )
    )
    passed_quizzes = passed_quiz_res.scalar() or 0

    completed_count = completed_videos + passed_quizzes
    progress = round(min(100.0, (completed_count / total_activities) * 100.0), 1)
    status_str = "completed" if progress >= 100.0 else ("in_progress" if progress > 0 else "not_started")

    # Update enrollment record if exists
    enr_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id
        )
    )
    enrollment = enr_res.scalars().first()
    if enrollment:
        enrollment.progress_percentage = progress
        enrollment.status = status_str
        db.add(enrollment)

    return progress, status_str

@router.post("/video-heartbeat", response_model=VideoHeartbeatResponse)
async def update_video_heartbeat(
    payload: VideoHeartbeatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch activity and its parent course
    act_res = await db.execute(
        select(Activity, CourseSection.course_id)
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(Activity.id == payload.activity_id)
    )
    row = act_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity, course_id = row[0], row[1]

    # Fetch or create progress record
    prog_res = await db.execute(
        select(VideoWatchProgress).where(
            VideoWatchProgress.user_id == current_user.id,
            VideoWatchProgress.activity_id == payload.activity_id
        )
    )
    progress_record = prog_res.scalars().first()

    if not progress_record:
        progress_record = VideoWatchProgress(
            user_id=current_user.id,
            activity_id=payload.activity_id,
            max_watched_seconds=min(payload.current_time_seconds, 15.0), # cap initial jump
            duration_seconds=payload.duration_seconds,
            percent_completed=0.0,
            is_completed=False
        )
        db.add(progress_record)
    else:
        # Anti-skip check: Don't allow max_watched to jump forward by more than 15s beyond what's already watched
        if payload.current_time_seconds <= progress_record.max_watched_seconds + 15.0:
            if payload.current_time_seconds > progress_record.max_watched_seconds:
                progress_record.max_watched_seconds = payload.current_time_seconds

        if payload.duration_seconds > 0:
            progress_record.duration_seconds = payload.duration_seconds
            pct = (progress_record.max_watched_seconds / progress_record.duration_seconds) * 100.0
            progress_record.percent_completed = round(min(100.0, pct), 1)

            # Completion threshold: 90% watched
            if progress_record.percent_completed >= 90.0:
                progress_record.is_completed = True

        db.add(progress_record)

    await db.commit()
    await db.refresh(progress_record)

    # Recalculate overall course progress
    c_progress, c_status = await recalculate_course_progress(db, current_user.id, course_id)
    await db.commit()

    return VideoHeartbeatResponse(
        activity_id=payload.activity_id,
        max_watched_seconds=progress_record.max_watched_seconds,
        percent_completed=progress_record.percent_completed,
        is_completed=progress_record.is_completed,
        course_progress_percentage=c_progress,
        course_status=c_status
    )

@router.post("/dwell-complete", response_model=ActivityCompletionResponse)
async def complete_dwell_activity(
    payload: DwellCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    act_res = await db.execute(
        select(Activity, CourseSection.course_id)
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(Activity.id == payload.activity_id)
    )
    row = act_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity, course_id = row[0], row[1]
    
    if payload.dwell_time_seconds < activity.required_dwell_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum required dwell time is {activity.required_dwell_seconds} seconds."
        )

    # Mark completion in VideoWatchProgress or general activity completion
    prog_res = await db.execute(
        select(VideoWatchProgress).where(
            VideoWatchProgress.user_id == current_user.id,
            VideoWatchProgress.activity_id == payload.activity_id
        )
    )
    progress_record = prog_res.scalars().first()
    if not progress_record:
        progress_record = VideoWatchProgress(
            user_id=current_user.id,
            activity_id=payload.activity_id,
            max_watched_seconds=float(payload.dwell_time_seconds),
            duration_seconds=float(activity.required_dwell_seconds),
            percent_completed=100.0,
            is_completed=True
        )
        db.add(progress_record)
    else:
        progress_record.percent_completed = 100.0
        progress_record.is_completed = True
        db.add(progress_record)

    await db.commit()

    c_progress, c_status = await recalculate_course_progress(db, current_user.id, course_id)
    await db.commit()

    return ActivityCompletionResponse(
        activity_id=payload.activity_id,
        is_completed=True,
        course_progress_percentage=c_progress,
        course_status=c_status
    )
