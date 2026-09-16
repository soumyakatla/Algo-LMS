from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class ActivityBase(BaseModel):
    title: str
    activity_type: str  # video, document, quiz, assignment
    content_url: Optional[str] = None
    content_body: Optional[str] = None
    required_dwell_seconds: int = 30
    sort_order: int = 1

class ActivityCreate(ActivityBase):
    section_id: UUID

class ActivityResponse(ActivityBase):
    id: UUID
    section_id: UUID
    is_completed: Optional[bool] = False

    class Config:
        from_attributes = True

class CourseSectionBase(BaseModel):
    title: str
    sort_order: int = 1

class CourseSectionResponse(CourseSectionBase):
    id: UUID
    course_id: UUID
    activities: List[ActivityResponse] = []

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: bool = True

class CourseCreate(CourseBase):
    pass

class CourseSummaryResponse(CourseBase):
    id: UUID
    created_at: datetime
    total_activities: int = 0
    enrolled_count: int = 0

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseBase):
    id: UUID
    created_at: datetime
    sections: List[CourseSectionResponse] = []
    user_enrolled: bool = False
    progress_percentage: float = 0.0

    class Config:
        from_attributes = True

class EnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    progress_percentage: float
    status: str
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
