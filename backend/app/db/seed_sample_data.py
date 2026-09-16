import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

import asyncpg
from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.models.lms import (
    Base, User, Course, CourseSection, Activity, QuizQuestion, 
    Enrollment, VideoWatchProgress, QuizAttempt
)
from app.core.security import get_password_hash

async def ensure_database_exists():
    """
    Connects to PostgreSQL server, provisions role if needed, and creates database algo_lms if missing.
    """
    print(f"Checking PostgreSQL server at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}...")
    conn = None
    connected_as_fallback = False

    # Try connecting with configured user
    try:
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            database="postgres"
        )
    except Exception as e:
        err_str = str(e).lower()
        if "password" in err_str or "role" in err_str or "authentication" in err_str:
            print(f"User '{settings.POSTGRES_USER}' not yet established. Connecting with superuser 'postgres'...")
            try:
                # Try common passwords: the one from .env, or 'postgres'
                try:
                    conn = await asyncpg.connect(
                        user="postgres",
                        password=settings.POSTGRES_PASSWORD,
                        host=settings.POSTGRES_SERVER,
                        port=settings.POSTGRES_PORT,
                        database="postgres"
                    )
                except Exception:
                    conn = await asyncpg.connect(
                        user="postgres",
                        password="postgres",
                        host=settings.POSTGRES_SERVER,
                        port=settings.POSTGRES_PORT,
                        database="postgres"
                    )
                connected_as_fallback = True
                print("Successfully connected using 'postgres' superuser!")
            except Exception as e2:
                print(f"\n[ERROR] Could not authenticate with PostgreSQL: {e2}")
                print("Please ensure your PostgreSQL password in backend/.env is correct.\n")
                raise e
        elif "refused" in err_str or "1225" in err_str:
            print(f"\n[ERROR] Connection refused at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}.")
            print("PostgreSQL service is not running. Please start the PostgreSQL service in Windows!\n")
            raise e
        else:
            raise e

    if conn:
        try:
            # If connected via fallback, ensure the configured role exists
            if connected_as_fallback and settings.POSTGRES_USER != "postgres":
                role_exists = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", settings.POSTGRES_USER)
                if not role_exists:
                    print(f"Creating user role '{settings.POSTGRES_USER}'...")
                    await conn.execute(f"CREATE ROLE \"{settings.POSTGRES_USER}\" WITH LOGIN PASSWORD '{settings.POSTGRES_PASSWORD}' SUPERUSER CREATEDB;")
                    print(f"Role '{settings.POSTGRES_USER}' created!")

            # Check if algo_lms exists
            exists = await conn.fetchval(
                "SELECT 1 FROM pg_database WHERE datname = $1", settings.POSTGRES_DB
            )
            if not exists:
                print(f"Database '{settings.POSTGRES_DB}' does not exist. Creating database '{settings.POSTGRES_DB}'...")
                await conn.execute(f'CREATE DATABASE "{settings.POSTGRES_DB}" OWNER "{settings.POSTGRES_USER}"')
                print(f"Database '{settings.POSTGRES_DB}' created successfully!")
            else:
                print(f"Database '{settings.POSTGRES_DB}' already exists.")
        finally:
            await conn.close()

async def seed_comprehensive_sample_data():
    await ensure_database_exists()
    print("Connecting to database and applying schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database schema verified!")

    async with AsyncSessionLocal() as session:
        # Check existing admin
        res = await session.execute(select(User).where(User.email == "admin@algolms.com"))
        admin = res.scalars().first()

        if not admin:
            print("Creating Admin account...")
            admin = User(
                id=uuid.uuid4(),
                email="admin@algolms.com",
                hashed_password=get_password_hash("Admin@123"),
                full_name="System Administrator",
                role="admin",
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
            )
            session.add(admin)
            await session.flush()
        else:
            print(f"Admin account found ({admin.email}).")

        # 1. Create or ensure sample users
        sample_users_data = [
            ("student@algolms.com", "Student@123", "Soumya Katla", "student", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"),
            ("alex.chen@algolms.com", "Alex@123", "Alex Chen", "student", "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"),
            ("priya.sharma@algolms.com", "Priya@123", "Priya Sharma", "student", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"),
            ("david.miller@algolms.com", "David@123", "David Miller", "student", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"),
            ("sarah.jenkins@algolms.com", "Sarah@123", "Sarah Jenkins", "student", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"),
        ]

        users_map = {"admin": admin}
        for email, password, full_name, role, avatar in sample_users_data:
            u_res = await session.execute(select(User).where(User.email == email))
            existing_user = u_res.scalars().first()
            if not existing_user:
                new_user = User(
                    id=uuid.uuid4(),
                    email=email,
                    hashed_password=get_password_hash(password),
                    full_name=full_name,
                    role=role,
                    avatar_url=avatar
                )
                session.add(new_user)
                await session.flush()
                users_map[email] = new_user
                print(f"Created student: {full_name} ({email})")
            else:
                users_map[email] = existing_user
                print(f"Found student: {full_name} ({email})")

        # 2. Courses Creation
        courses_def = [
            {
                "slug": "ai-system-design",
                "title": "Enterprise AI & Scalable Microservices",
                "description": "Master full-stack AI engineering, distributed event streaming, gatekept LMS tracking, and Microsoft Teams integration.",
                "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
                "sections": [
                    {
                        "title": "Module 1: Architecture & Platform Overview",
                        "sort_order": 1,
                        "activities": [
                            {
                                "title": "1.1 Introduction to AlgoLMS Cloud Engine",
                                "activity_type": "video",
                                "content_url": "/media/videos/demo_lecture_1.mp4",
                                "required_dwell_seconds": 60,
                                "sort_order": 1
                            },
                            {
                                "title": "1.2 Architecture Blueprint & Event Specs",
                                "activity_type": "document",
                                "content_body": "# AlgoLMS Architecture Blueprint\n\nHigh-concurrency async LMS with anti-skip video verification.\n\n### Key Highlights:\n- Asyncpg connection pooling\n- JWT Bearer Authentication\n- Deterministic Heartbeat Telemetry",
                                "required_dwell_seconds": 30,
                                "sort_order": 2
                            }
                        ]
                    },
                    {
                        "title": "Module 2: Anti-Skip Tracking & Gatekeeping",
                        "sort_order": 2,
                        "activities": [
                            {
                                "title": "2.1 Anti-Tamper Heartbeat & Video Verification",
                                "activity_type": "video",
                                "content_url": "/media/videos/demo_lecture_2.mp4",
                                "required_dwell_seconds": 90,
                                "sort_order": 1
                            },
                            {
                                "title": "2.2 Knowledge Check: Gatekeeping & Security",
                                "activity_type": "quiz",
                                "required_dwell_seconds": 0,
                                "sort_order": 2,
                                "questions": [
                                    {
                                        "question_text": "How does the AlgoLMS heartbeat API prevent users from skipping ahead in videos?",
                                        "options": [
                                            {"id": 1, "text": "It requires manual admin approval", "is_correct": False, "feedback": "Incorrect."},
                                            {"id": 2, "text": "It rejects jumps greater than the permitted playback buffer (+15s)", "is_correct": True, "feedback": "Correct! Heartbeats enforce incremental playback bounds."},
                                            {"id": 3, "text": "It disables video controls completely", "is_correct": False, "feedback": "Incorrect."}
                                        ],
                                        "marks": 10.0,
                                        "sort_order": 1
                                    },
                                    {
                                        "question_text": "Which database driver is used for high-concurrency async operations in AlgoLMS?",
                                        "options": [
                                            {"id": 1, "text": "asyncpg", "is_correct": True, "feedback": "Correct! asyncpg provides non-blocking PostgreSQL queries."},
                                            {"id": 2, "text": "sqlite3 standard driver", "is_correct": False, "feedback": "Incorrect."},
                                            {"id": 3, "text": "pyodbc sync connection", "is_correct": False, "feedback": "Incorrect."}
                                        ],
                                        "marks": 10.0,
                                        "sort_order": 2
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "slug": "cloud-native-devops",
                "title": "Cloud-Native DevOps & Kubernetes at Scale",
                "description": "Learn production Kubernetes cluster design, GitOps deployment with ArgoCD, distributed observability with Prometheus, and zero-downtime rollouts.",
                "thumbnail_url": "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800",
                "sections": [
                    {
                        "title": "Module 1: Container Orchestration Fundamentals",
                        "sort_order": 1,
                        "activities": [
                            {
                                "title": "1.1 Docker Multi-Stage Builds & Pod Topologies",
                                "activity_type": "video",
                                "content_url": "/media/videos/demo_lecture_1.mp4",
                                "required_dwell_seconds": 45,
                                "sort_order": 1
                            },
                            {
                                "title": "1.2 Kubernetes Manifests & Ingress Routing",
                                "activity_type": "document",
                                "content_body": "# Kubernetes Cluster Configuration\n\n- Deployments and StatefulSets\n- NGINX Ingress Controller with SSL Termination\n- ConfigMaps and Secrets Management",
                                "required_dwell_seconds": 25,
                                "sort_order": 2
                            }
                        ]
                    },
                    {
                        "title": "Module 2: CI/CD Pipelines & Continuous Delivery",
                        "sort_order": 2,
                        "activities": [
                            {
                                "title": "2.1 Automated Rollouts & Helm Charts",
                                "activity_type": "video",
                                "content_url": "/media/videos/demo_lecture_2.mp4",
                                "required_dwell_seconds": 60,
                                "sort_order": 1
                            },
                            {
                                "title": "2.2 DevOps Certification Quiz",
                                "activity_type": "quiz",
                                "required_dwell_seconds": 0,
                                "sort_order": 2,
                                "questions": [
                                    {
                                        "question_text": "What is the primary benefit of GitOps workflow with ArgoCD?",
                                        "options": [
                                            {"id": 1, "text": "Git is the single source of truth for desired cluster state", "is_correct": True, "feedback": "Correct! Automatic reconciliation ensures cluster matches Git."},
                                            {"id": 2, "text": "It removes all Docker images", "is_correct": False, "feedback": "Incorrect."},
                                            {"id": 3, "text": "It requires manual SSH commands", "is_correct": False, "feedback": "Incorrect."}
                                        ],
                                        "marks": 10.0,
                                        "sort_order": 1
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "slug": "zero-trust-security",
                "title": "Full-Stack Security & Zero Trust Architecture",
                "description": "Enterprise cybersecurity principles, OAuth 2.0 / OpenID Connect, Microsoft Entra ID integration, role-based access control (RBAC), and API threat defense.",
                "thumbnail_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
                "sections": [
                    {
                        "title": "Module 1: Enterprise Identity & OAuth2",
                        "sort_order": 1,
                        "activities": [
                            {
                                "title": "1.1 OAuth 2.0 PKCE & Entra ID Tokens",
                                "activity_type": "video",
                                "content_url": "/media/videos/demo_lecture_1.mp4",
                                "required_dwell_seconds": 50,
                                "sort_order": 1
                            },
                            {
                                "title": "1.2 Zero Trust Security Model Whitepaper",
                                "activity_type": "document",
                                "content_body": "# Zero Trust Architecture Principles\n\n1. Verify explicitly: Always authenticate and authorize based on all available data points.\n2. Use least privilege access: Limit user access with Just-In-Time (JIT) and Just-Enough-Access (JEA).\n3. Assume breach: Minimize blast radius and segment access.",
                                "required_dwell_seconds": 35,
                                "sort_order": 2
                            }
                        ]
                    }
                ]
            }
        ]

        created_courses = []
        activities_map = {}

        for c_data in courses_def:
            c_res = await session.execute(select(Course).where(Course.slug == c_data["slug"]))
            existing_c = c_res.scalars().first()
            if not existing_c:
                course = Course(
                    id=uuid.uuid4(),
                    slug=c_data["slug"],
                    title=c_data["title"],
                    description=c_data["description"],
                    thumbnail_url=c_data["thumbnail_url"],
                    is_published=True,
                    created_by=admin.id
                )
                session.add(course)
                await session.flush()
                print(f"Created Course: {course.title}")

                for s_data in c_data["sections"]:
                    sec = CourseSection(
                        id=uuid.uuid4(),
                        course_id=course.id,
                        title=s_data["title"],
                        sort_order=s_data["sort_order"]
                    )
                    session.add(sec)
                    await session.flush()

                    for a_data in s_data["activities"]:
                        act = Activity(
                            id=uuid.uuid4(),
                            section_id=sec.id,
                            title=a_data["title"],
                            activity_type=a_data["activity_type"],
                            content_url=a_data.get("content_url"),
                            content_body=a_data.get("content_body"),
                            required_dwell_seconds=a_data["required_dwell_seconds"],
                            sort_order=a_data["sort_order"]
                        )
                        session.add(act)
                        await session.flush()
                        activities_map[(course.slug, act.title)] = act

                        if "questions" in a_data:
                            for q_data in a_data["questions"]:
                                q = QuizQuestion(
                                    id=uuid.uuid4(),
                                    activity_id=act.id,
                                    question_text=q_data["question_text"],
                                    options=q_data["options"],
                                    marks=q_data["marks"],
                                    sort_order=q_data["sort_order"]
                                )
                                session.add(q)

                created_courses.append(course)
            else:
                created_courses.append(existing_c)
                print(f"Found Course: {existing_c.title}")

        await session.flush()

        # 3. Enroll students and seed realistic telemetry & quiz scores
        # Fetch all courses to ensure we have IDs
        all_courses_res = await session.execute(select(Course))
        all_courses = all_courses_res.scalars().all()
        c_by_slug = {c.slug: c for c in all_courses}

        # Seed progress profiles
        student_profiles = [
            {
                "email": "student@algolms.com",
                "enrollments": [
                    {"slug": "ai-system-design", "progress": 100.0, "status": "completed"},
                    {"slug": "cloud-native-devops", "progress": 50.0, "status": "in_progress"},
                ]
            },
            {
                "email": "alex.chen@algolms.com",
                "enrollments": [
                    {"slug": "ai-system-design", "progress": 75.0, "status": "in_progress"},
                    {"slug": "zero-trust-security", "progress": 100.0, "status": "completed"},
                ]
            },
            {
                "email": "priya.sharma@algolms.com",
                "enrollments": [
                    {"slug": "ai-system-design", "progress": 100.0, "status": "completed"},
                    {"slug": "cloud-native-devops", "progress": 100.0, "status": "completed"},
                    {"slug": "zero-trust-security", "progress": 100.0, "status": "completed"},
                ]
            },
            {
                "email": "david.miller@algolms.com",
                "enrollments": [
                    {"slug": "cloud-native-devops", "progress": 30.0, "status": "in_progress"},
                ]
            },
            {
                "email": "sarah.jenkins@algolms.com",
                "enrollments": [
                    {"slug": "zero-trust-security", "progress": 80.0, "status": "in_progress"},
                    {"slug": "ai-system-design", "progress": 40.0, "status": "in_progress"},
                ]
            },
        ]

        # Fetch all activities
        act_res = await session.execute(select(Activity))
        all_acts = act_res.scalars().all()
        video_acts = [a for a in all_acts if a.activity_type == "video"]
        quiz_acts = [a for a in all_acts if a.activity_type == "quiz"]

        for profile in student_profiles:
            user = users_map.get(profile["email"])
            if not user:
                continue

            for enr_data in profile["enrollments"]:
                course = c_by_slug.get(enr_data["slug"])
                if not course:
                    continue

                # Check enrollment
                enr_check = await session.execute(
                    select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
                )
                enr = enr_check.scalars().first()
                if not enr:
                    enr = Enrollment(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        course_id=course.id,
                        progress_percentage=enr_data["progress"],
                        status=enr_data["status"],
                        completed_at=datetime.utcnow() if enr_data["status"] == "completed" else None
                    )
                    session.add(enr)
                else:
                    enr.progress_percentage = enr_data["progress"]
                    enr.status = enr_data["status"]
                    if enr_data["status"] == "completed" and not enr.completed_at:
                        enr.completed_at = datetime.utcnow()

            # Seed some video progress records for this student
            for v_act in video_acts[:2]:
                v_check = await session.execute(
                    select(VideoWatchProgress).where(
                        VideoWatchProgress.user_id == user.id,
                        VideoWatchProgress.activity_id == v_act.id
                    )
                )
                if not v_check.scalars().first():
                    session.add(VideoWatchProgress(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        activity_id=v_act.id,
                        max_watched_seconds=v_act.required_dwell_seconds or 60.0,
                        duration_seconds=v_act.required_dwell_seconds or 60.0,
                        percent_completed=100.0,
                        is_completed=True,
                        updated_at=datetime.utcnow() - timedelta(hours=2)
                    ))

            # Seed quiz attempt
            for q_act in quiz_acts:
                q_check = await session.execute(
                    select(QuizAttempt).where(
                        QuizAttempt.user_id == user.id,
                        QuizAttempt.activity_id == q_act.id
                    )
                )
                if not q_check.scalars().first():
                    session.add(QuizAttempt(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        activity_id=q_act.id,
                        score=20.0,
                        total_marks=20.0,
                        passed=True,
                        created_at=datetime.utcnow() - timedelta(hours=1)
                    ))

        await session.commit()
        print("Comprehensive sample data seeded successfully with courses, users, and progress telemetry!")

if __name__ == "__main__":
    asyncio.run(seed_comprehensive_sample_data())
