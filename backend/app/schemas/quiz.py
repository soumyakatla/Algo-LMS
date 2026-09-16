from uuid import UUID
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class QuizOptionPublic(BaseModel):
    id: int
    text: str

class QuizOptionAdmin(BaseModel):
    id: int
    text: str
    is_correct: bool
    feedback: Optional[str] = None

class QuizQuestionPublic(BaseModel):
    id: UUID
    activity_id: UUID
    question_text: str
    options: List[QuizOptionPublic]
    marks: float
    sort_order: int

    class Config:
        from_attributes = True

class QuizSubmissionAnswer(BaseModel):
    question_id: UUID
    selected_option_id: int

class QuizSubmitRequest(BaseModel):
    activity_id: UUID
    answers: List[QuizSubmissionAnswer]

class QuestionResult(BaseModel):
    question_id: UUID
    question_text: str
    selected_option_id: int
    is_correct: bool
    correct_option_id: int
    feedback: Optional[str] = None
    earned_marks: float
    max_marks: float

class QuizAttemptResponse(BaseModel):
    id: UUID
    activity_id: UUID
    score: float
    total_marks: float
    passed: bool
    percentage: float
    results: List[QuestionResult]
    course_progress_percentage: float
    course_status: str
