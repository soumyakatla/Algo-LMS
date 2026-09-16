from fastapi import APIRouter
from app.api.v1 import auth, courses, tracking, quizzes, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(courses.router, prefix="/courses", tags=["Courses"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["Tracking & Progress"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Portal"])
