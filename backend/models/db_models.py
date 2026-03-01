import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_via = Column(String(20), default="email", nullable=False)  # email, google
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    role = Column(String(20), default="student", server_default="student", nullable=False)  # student | teacher | admin
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    preferences = Column(JSONB, default=dict, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    verifications = relationship("EmailVerification", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("AnalysisResult", back_populates="user", cascade="all, delete-orphan")
    flashcard_sets = relationship("FlashcardSet", back_populates="user", cascade="all, delete-orphan")
    quiz_sets = relationship("QuizSet", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    
    # Phase 5: Classroom relationships
    taught_classrooms = relationship("Classroom", foreign_keys="Classroom.teacher_id", back_populates="teacher", cascade="all, delete-orphan")
    enrollments = relationship("ClassroomEnrollment", foreign_keys="ClassroomEnrollment.student_id", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    grades_received = relationship("Grade", foreign_keys="Grade.student_id", back_populates="student", cascade="all, delete-orphan")
    grades_given = relationship("Grade", foreign_keys="Grade.graded_by", back_populates="grader")


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="verifications")


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_sub", name="uq_provider_sub"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    provider_sub = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="oauth_accounts")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    analysis = Column(JSONB, nullable=False)
    word_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="analyses")
    flashcard_sets = relationship("FlashcardSet", back_populates="analysis", cascade="all, delete-orphan")
    quiz_sets = relationship("QuizSet", back_populates="analysis", cascade="all, delete-orphan")


class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=True)
    difficulty = Column(String(20), default="medium", nullable=False)
    cards = Column(JSONB, nullable=False)
    card_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="flashcard_sets")
    analysis = relationship("AnalysisResult", back_populates="flashcard_sets")


class QuizSet(Base):
    __tablename__ = "quiz_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=True)
    difficulty = Column(String(20), default="medium", nullable=False)
    questions = Column(JSONB, nullable=False)
    question_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="quiz_sets")
    analysis = relationship("AnalysisResult", back_populates="quiz_sets")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=True)
    mode = Column(String(20), default="teacher", nullable=False)  # teacher | helper
    document_context = Column(Text, nullable=True)
    document_filename = Column(String(500), nullable=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id", ondelete="SET NULL"), nullable=True)
    message_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("ChatSession", back_populates="messages")


# ============================================================================
# PHASE 5: CLASSROOM MANAGEMENT MODELS
# ============================================================================


class Classroom(Base):
    """Virtual classroom for managing students and assignments"""
    __tablename__ = "classrooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False)
    grade_level = Column(String(50), nullable=False)
    invite_code = Column(String(10), unique=True, nullable=False, index=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    settings = Column(JSONB, default=dict, nullable=False)  # allow_student_uploads, allow_peer_review, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id], back_populates="taught_classrooms")
    enrollments = relationship("ClassroomEnrollment", back_populates="classroom", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="classroom", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="classroom", cascade="all, delete-orphan")


class ClassroomEnrollment(Base):
    """Student enrollment in a classroom"""
    __tablename__ = "classroom_enrollments"
    __table_args__ = (
        UniqueConstraint("classroom_id", "student_id", name="uq_classroom_student"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="student", nullable=False)  # student | assistant
    status = Column(String(20), default="active", nullable=False)  # active | inactive | pending
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="enrollments")
    student = relationship("User", foreign_keys=[student_id], back_populates="enrollments")


class Assignment(Base):
    """Classroom assignment with submissions and grading"""
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    points_possible = Column(Integer, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="draft", nullable=False)  # draft | published | closed | archived
    settings = Column(JSONB, default=dict, nullable=False)  # allow_late, allow_resubmit, etc.
    rubric = Column(JSONB, nullable=True)  # grading rubric
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    classroom = relationship("Classroom", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="assignment", cascade="all, delete-orphan")


class Submission(Base):
    """Student submission for an assignment"""
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    attachments = Column(JSONB, default=list, nullable=False)  # array of file paths
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(20), default="submitted", nullable=False)  # not_submitted | submitted | graded | returned
    revision_count = Column(Integer, default=0, nullable=False)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    grade = relationship("Grade", uselist=False, back_populates="submission", cascade="all, delete-orphan")


class Grade(Base):
    """Grade for a student submission"""
    __tablename__ = "grades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), unique=True, nullable=False)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True)
    points_earned = Column(Float, nullable=False)
    points_possible = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=True)
    letter_grade = Column(String(2), nullable=True)  # A+, A, A-, B+, B, etc.
    feedback = Column(Text, nullable=True)
    rubric_scores = Column(JSONB, nullable=True)  # scores for each rubric item
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    graded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    submission = relationship("Submission", back_populates="grade")
    assignment = relationship("Assignment", back_populates="grades")
    student = relationship("User", foreign_keys=[student_id], back_populates="grades_received")
    classroom = relationship("Classroom", back_populates="grades")
    grader = relationship("User", foreign_keys=[graded_by], back_populates="grades_given")
