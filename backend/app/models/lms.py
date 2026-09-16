import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class UserRole(str, Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    MANAGER = "manager"
    STUDENT = "student"

class ActivityType(str, Enum):
    VIDEO = "video"
    DOCUMENT = "document"
    QUIZ = "quiz"
    ASSIGNMENT = "assignment"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(50), default="student", nullable=False)
    azure_oid = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    enrollments = relationship("Enrollment", back_populates="user", cascade="all, delete-orphan")
    video_progress = relationship("VideoWatchProgress", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("AssignmentSubmission", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    is_published = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sections = relationship("CourseSection", back_populates="course", order_by="CourseSection.sort_order", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class CourseSection(Base):
    __tablename__ = "course_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    title = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=1)

    course = relationship("Course", back_populates="sections")
    activities = relationship("Activity", back_populates="section", order_by="Activity.sort_order", cascade="all, delete-orphan")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_id = Column(UUID(as_uuid=True), ForeignKey("course_sections.id"), nullable=False)
    title = Column(String(255), nullable=False)
    activity_type = Column(String(50), nullable=False)  # video, document, quiz, assignment
    content_url = Column(String(500), nullable=True)
    content_body = Column(Text, nullable=True)
    required_dwell_seconds = Column(Integer, default=30)
    sort_order = Column(Integer, default=1)

    section = relationship("CourseSection", back_populates="activities")
    video_progress = relationship("VideoWatchProgress", back_populates="activity", cascade="all, delete-orphan")
    questions = relationship("QuizQuestion", back_populates="activity", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="activity", cascade="all, delete-orphan")
    submissions = relationship("AssignmentSubmission", back_populates="activity", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    progress_percentage = Column(Float, default=0.0)
    status = Column(String(50), default="not_started")  # not_started, in_progress, completed
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class VideoWatchProgress(Base):
    __tablename__ = "video_watch_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    max_watched_seconds = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    percent_completed = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="video_progress")
    activity = relationship("Activity", back_populates="video_progress")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # [{'id': 1, 'text': '...', 'is_correct': True, 'feedback': '...'}]
    marks = Column(Float, default=1.0)
    sort_order = Column(Integer, default=1)

    activity = relationship("Activity", back_populates="questions")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    score = Column(Float, default=0.0)
    total_marks = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    answers = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="quiz_attempts")
    activity = relationship("Activity", back_populates="quiz_attempts")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    submission_text = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    grade = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(String(50), default="submitted")  # submitted, graded
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    activity = relationship("Activity", back_populates="submissions")
