import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import engine, AsyncSessionLocal
from app.models.lms import Base, User, Course, CourseSection, Activity, QuizQuestion, Enrollment
from app.core.security import get_password_hash

async def init_and_seed_db():
    print("Connecting to database and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        res = await session.execute(select(User).where(User.email == "admin@algolms.com"))
        existing_admin = res.scalars().first()
        if existing_admin:
            print("Database already seeded with demo data.")
            return

        print("Seeding demo users...")
        admin = User(
            id=uuid.uuid4(),
            email="admin@algolms.com",
            hashed_password=get_password_hash("Admin@123"),
            full_name="System Administrator",
            role="admin",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        )
        student = User(
            id=uuid.uuid4(),
            email="student@algolms.com",
            hashed_password=get_password_hash("Student@123"),
            full_name="Soumya Katla",
            role="student",
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        )
        session.add_all([admin, student])
        await session.flush()

        print("Seeding demo course...")
        course1 = Course(
            id=uuid.uuid4(),
            slug="ai-system-design",
            title="Enterprise AI & Scalable Microservices",
            description="Master full-stack AI engineering, distributed streaming, gatekept LMS tracking, and Microsoft Teams integration.",
            thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
            is_published=True,
            created_by=admin.id
        )
        session.add(course1)
        await session.flush()

        # Section 1: Foundations
        sec1 = CourseSection(
            id=uuid.uuid4(),
            course_id=course1.id,
            title="Module 1: Architecture & Platform Overview",
            sort_order=1
        )
        # Section 2: Implementation & Tracking
        sec2 = CourseSection(
            id=uuid.uuid4(),
            course_id=course1.id,
            title="Module 2: Anti-Skip Tracking & Gatekeeping",
            sort_order=2
        )
        session.add_all([sec1, sec2])
        await session.flush()

        # Activities for Section 1
        act1 = Activity(
            id=uuid.uuid4(),
            section_id=sec1.id,
            title="1.1 Introduction to AlgoLMS Cloud Engine",
            activity_type="video",
            content_url="/media/videos/demo_lecture_1.mp4",
            required_dwell_seconds=60,
            sort_order=1
        )
        act2 = Activity(
            id=uuid.uuid4(),
            section_id=sec1.id,
            title="1.2 Architecture Blueprint & Event Specs",
            activity_type="document",
            content_body="""# AlgoLMS Architecture Blueprint

Welcome to the **AlgoLMS** technical specification.

### Key Tenets
1. **Asynchronous Throughput**: Powered by FastAPI async routes and asyncpg database connection pooling.
2. **Deterministic Gatekeeping**: Every video segment is logged with periodic heartbeat pulses (every 5 seconds) to prevent skipping forward.
3. **Microsoft 365 / Teams Ready**: Embeds directly with single sign-on via Microsoft Entra ID.

Ensure you spend at least 30 seconds reviewing these specifications before marking complete.""",
            required_dwell_seconds=30,
            sort_order=2
        )

        # Activities for Section 2
        act3 = Activity(
            id=uuid.uuid4(),
            section_id=sec2.id,
            title="2.1 Anti-Tamper Heartbeat & Video Verification",
            activity_type="video",
            content_url="/media/videos/demo_lecture_2.mp4",
            required_dwell_seconds=90,
            sort_order=1
        )
        act4 = Activity(
            id=uuid.uuid4(),
            section_id=sec2.id,
            title="2.2 Knowledge Check: Gatekeeping & Security",
            activity_type="quiz",
            required_dwell_seconds=0,
            sort_order=2
        )
        session.add_all([act1, act2, act3, act4])
        await session.flush()

        # Quiz Questions for act4
        q1 = QuizQuestion(
            id=uuid.uuid4(),
            activity_id=act4.id,
            question_text="How does the AlgoLMS heartbeat API prevent users from skipping ahead in videos?",
            options=[
                {"id": 1, "text": "It requires manual admin approval for every video", "is_correct": False, "feedback": "Incorrect. Verification is automated."},
                {"id": 2, "text": "It rejects jumps greater than the permitted playback buffer (+15s) from highest confirmed position", "is_correct": True, "feedback": "Correct! Heartbeats enforce incremental playback bounds."},
                {"id": 3, "text": "It turns off video controls completely", "is_correct": False, "feedback": "Incorrect. Controls remain accessible, but jumps are validated server-side."},
                {"id": 4, "text": "It only checks completion at the end URL", "is_correct": False, "feedback": "Incorrect. Continuous telemetry is verified."}
            ],
            marks=10.0,
            sort_order=1
        )
        q2 = QuizQuestion(
            id=uuid.uuid4(),
            activity_id=act4.id,
            question_text="Which database driver is used for high-concurrency async operations?",
            options=[
                {"id": 1, "text": "asyncpg", "is_correct": True, "feedback": "Correct! asyncpg provides non-blocking PostgreSQL queries."},
                {"id": 2, "text": "sqlite3 standard driver", "is_correct": False, "feedback": "Incorrect."},
                {"id": 3, "text": "pyodbc sync connection", "is_correct": False, "feedback": "Incorrect."},
                {"id": 4, "text": "memcached", "is_correct": False, "feedback": "Incorrect."}
            ],
            marks=10.0,
            sort_order=2
        )
        session.add_all([q1, q2])

        # Auto-enroll student into course1
        enrollment = Enrollment(
            id=uuid.uuid4(),
            user_id=student.id,
            course_id=course1.id,
            progress_percentage=0.0,
            status="in_progress"
        )
        session.add(enrollment)

        await session.commit()
        print("Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(init_and_seed_db())
