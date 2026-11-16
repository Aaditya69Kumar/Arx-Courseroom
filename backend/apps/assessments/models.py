"""
Assessments — Assignments, Submissions, Quizzes, and Coding Labs
"""
import uuid
import secrets
from django.db import models
from django.conf import settings


def assignment_attachment_upload_path(instance, filename):
    return f"assignments/attachments/course_{instance.course_id}/{filename}"


class Assignment(models.Model):
    """Course assignment, lab, or project with submission format & late policies."""

    class AssessmentType(models.TextChoices):
        ASSIGNMENT = "assignment", "Assignment"
        QUIZ = "quiz", "Quiz"
        LAB = "lab", "Laboratory Exercise"
        PROJECT = "project", "Term Project"

    class SubmissionFormat(models.TextChoices):
        TEXT = "text", "Online Text"
        FILE = "file", "File Upload"
        BOTH = "both", "Text or File Upload"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assessment_type = models.CharField(
        max_length=20,
        choices=AssessmentType.choices,
        default=AssessmentType.ASSIGNMENT,
    )
    submission_format = models.CharField(
        max_length=20,
        choices=SubmissionFormat.choices,
        default=SubmissionFormat.BOTH,
    )
    due_date = models.DateTimeField(null=True, blank=True)
    max_score = models.IntegerField(default=100)
    weight = models.DecimalField(max_digits=4, decimal_places=2, default=1.0)
    late_submissions_allowed = models.BooleanField(default=True)
    attachment = models.FileField(
        upload_to=assignment_attachment_upload_path,
        max_length=500,
        null=True,
        blank=True,
        help_text="Coursework reference material, assignment brief, or starter code file",
    )
    attachment_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PUBLISHED,
    )
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] {self.title}"


def submission_upload_path(instance, filename):
    return f"submissions/{instance.assignment_id}/{instance.student_id}_{filename}"


class Submission(models.Model):
    """Student submission for an assignment with receipts and grading audit."""

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        GRADED = "graded", "Graded"
        RETURNED = "returned", "Returned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt_id = models.CharField(max_length=32, unique=True, blank=True)
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
        limit_choices_to={"role": "student"},
    )
    content = models.TextField(blank=True)
    file = models.FileField(upload_to=submission_upload_path, max_length=500, null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0)
    is_late = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="graded_submissions",
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["assignment", "student"]
        ordering = ["-submitted_at"]

    def save(self, *args, **kwargs):
        if not self.receipt_id:
            self.receipt_id = f"SUB-{secrets.token_hex(4).upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.email} -> {self.assignment.title} ({self.receipt_id})"


# ============================================================================
# Quizzes & Automated Grading
# ============================================================================

class Quiz(models.Model):
    """Classroom Quiz with timers, attempt limits, and result release controls."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="quizzes",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(default=30, help_text="0 for untimed")
    max_attempts = models.IntegerField(default=1)
    due_date = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    release_results = models.BooleanField(
        default=False,
        help_text="If false, correct answers and detailed scores are withheld from students.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] Quiz: {self.title}"

    @property
    def total_marks(self):
        return sum(q.marks for q in self.questions.all())


class QuizQuestion(models.Model):
    """Question item inside a quiz."""

    class QuestionType(models.TextChoices):
        MCQ = "mcq", "Multiple Choice"
        TRUE_FALSE = "true_false", "True / False"
        SHORT_ANSWER = "short_answer", "Short Answer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.MCQ,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text="List of choices for MCQ / True-False questions",
    )
    correct_answer = models.CharField(
        max_length=500,
        help_text="Server-side ground truth for auto-grading. Kept private from students.",
    )
    explanation = models.TextField(blank=True)
    marks = models.IntegerField(default=5)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.quiz.title} - Q{self.order + 1}: {self.question_text[:30]}"


class QuizAttempt(models.Model):
    """Student attempt record with auto-grading."""

    class Status(models.TextChoices):
        IN_PROGRESS = "in_progress", "In Progress"
        SUBMITTED = "submitted", "Submitted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
        limit_choices_to={"role": "student"},
    )
    answers = models.JSONField(
        default=dict,
        help_text="Mapping of question_id -> student answer string",
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    attempt_number = models.IntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-completed_at"]

    def __str__(self):
        return f"{self.student.email} - {self.quiz.title} (Score: {self.score}/{self.max_score})"


# ============================================================================
# Coding Labs & Sandboxed Judging
# ============================================================================

class CodingProblem(models.Model):
    """Programming assignment with inputs/outputs and test cases."""

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="coding_problems",
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )
    time_limit_sec = models.IntegerField(default=2)
    memory_limit_mb = models.IntegerField(default=128)
    sample_input = models.TextField(blank=True)
    sample_output = models.TextField(blank=True)
    hidden_test_cases = models.JSONField(
        default=list,
        help_text="List of {'input': '...', 'output': '...'} test cases for automated evaluation",
    )
    max_score = models.IntegerField(default=100)
    supported_languages = models.JSONField(
        default=list,
        help_text="List of language keys: ['python', 'javascript']",
    )
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.course.code}] Code Lab: {self.title}"


class CodingSubmission(models.Model):
    """Student code submission judged automatically."""

    class Outcome(models.TextChoices):
        ACCEPTED = "accepted", "Accepted (All Tests Passed)"
        WRONG_ANSWER = "wrong_answer", "Wrong Answer"
        TIME_LIMIT = "time_limit_exceeded", "Time Limit Exceeded"
        RUNTIME_ERROR = "runtime_error", "Runtime Error"
        SYNTAX_ERROR = "syntax_error", "Compilation / Syntax Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    problem = models.ForeignKey(
        CodingProblem,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coding_submissions",
        limit_choices_to={"role": "student"},
    )
    code = models.TextField()
    language = models.CharField(max_length=30, default="python")
    outcome = models.CharField(
        max_length=30,
        choices=Outcome.choices,
        default=Outcome.ACCEPTED,
    )
    passed_tests = models.IntegerField(default=0)
    total_tests = models.IntegerField(default=0)
    execution_time_ms = models.IntegerField(default=45)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    output_log = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.student.email} -> {self.problem.title} ({self.outcome})"
