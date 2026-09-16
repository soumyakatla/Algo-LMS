from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class VideoHeartbeatRequest(BaseModel):
    activity_id: UUID
    current_time_seconds: float
    duration_seconds: float

class VideoHeartbeatResponse(BaseModel):
    activity_id: UUID
    max_watched_seconds: float
    percent_completed: float
    is_completed: bool
    course_progress_percentage: float
    course_status: str

class DwellCompleteRequest(BaseModel):
    activity_id: UUID
    dwell_time_seconds: int

class ActivityCompletionResponse(BaseModel):
    activity_id: UUID
    is_completed: bool
    course_progress_percentage: float
    course_status: str
