from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.lms import User, Activity, CourseSection, QuizQuestion, QuizAttempt
from app.schemas.quiz import (
    QuizQuestionPublic, QuizOptionPublic, QuizSubmitRequest,
    QuizAttemptResponse, QuestionResult
)
from app.api.v1.deps import get_current_user
from app.api.v1.tracking import recalculate_course_progress

router = APIRouter()

@router.get("/{activity_id}", response_model=List[QuizQuestionPublic])
async def get_quiz_questions(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.activity_id == activity_id)
        .order_by(QuizQuestion.sort_order)
    )
    questions = result.scalars().all()
    if not questions:
        raise HTTPException(status_code=404, detail="No quiz questions found for this activity")

    public_questions = []
    for q in questions:
        # Sanitize options so is_correct is not leaked to client before submission
        sanitized_options = [
            QuizOptionPublic(id=opt.get("id"), text=opt.get("text"))
            for opt in (q.options or [])
        ]
        public_questions.append(
            QuizQuestionPublic(
                id=q.id,
                activity_id=q.activity_id,
                question_text=q.question_text,
                options=sanitized_options,
                marks=q.marks,
                sort_order=q.sort_order
            )
        )
    return public_questions

@router.post("/{activity_id}/submit", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    activity_id: UUID,
    payload: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch activity and its parent course
    act_res = await db.execute(
        select(Activity, CourseSection.course_id)
        .join(CourseSection, Activity.section_id == CourseSection.id)
        .where(Activity.id == activity_id)
    )
    row = act_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity, course_id = row[0], row[1]

    # Fetch DB questions with answer keys
    result = await db.execute(
        select(QuizQuestion)
        .where(QuizQuestion.activity_id == activity_id)
        .order_by(QuizQuestion.sort_order)
    )
    db_questions = result.scalars().all()
    if not db_questions:
        raise HTTPException(status_code=404, detail="Quiz questions not found")

    user_answers_map = {ans.question_id: ans.selected_option_id for ans in payload.answers}

    total_marks = 0.0
    earned_marks = 0.0
    question_results: List[QuestionResult] = []

    for q in db_questions:
        total_marks += q.marks
        user_selected = user_answers_map.get(q.id)

        # Find correct option in question JSON
        correct_option_id = None
        feedback_text = None
        is_user_correct = False

        for opt in (q.options or []):
            if opt.get("is_correct") is True:
                correct_option_id = opt.get("id")
            if user_selected is not None and opt.get("id") == user_selected:
                feedback_text = opt.get("feedback")

        if user_selected is not None and user_selected == correct_option_id:
            is_user_correct = True
            earned_marks += q.marks

        question_results.append(
            QuestionResult(
                question_id=q.id,
                question_text=q.question_text,
                selected_option_id=user_selected if user_selected is not None else -1,
                is_correct=is_user_correct,
                correct_option_id=correct_option_id or 0,
                feedback=feedback_text,
                earned_marks=q.marks if is_user_correct else 0.0,
                max_marks=q.marks
            )
        )

    percentage = round((earned_marks / total_marks * 100.0) if total_marks > 0 else 0.0, 1)
    passed = percentage >= 70.0  # 70% passing threshold

    # Save attempt with stringified UUIDs for JSON column serialization
    serialized_answers = [
        {
            "question_id": str(ans.question_id),
            "selected_option_id": ans.selected_option_id,
        }
        for ans in payload.answers
    ]

    attempt = QuizAttempt(
        user_id=current_user.id,
        activity_id=activity_id,
        score=earned_marks,
        total_marks=total_marks,
        passed=passed,
        answers=serialized_answers
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Recalculate course progress
    c_progress, c_status = await recalculate_course_progress(db, current_user.id, course_id)
    await db.commit()

    return QuizAttemptResponse(
        id=attempt.id,
        activity_id=activity_id,
        score=earned_marks,
        total_marks=total_marks,
        passed=passed,
        percentage=percentage,
        results=question_results,
        course_progress_percentage=c_progress,
        course_status=c_status
    )
