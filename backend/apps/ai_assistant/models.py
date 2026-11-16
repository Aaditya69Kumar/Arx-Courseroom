"""
AI Assistant — AI Studio (Faculty Drafts & Approval) and AI Playground
"""
import uuid
from django.db import models
from django.conf import settings


class AIGeneratedDraft(models.Model):
    """
    Faculty drafting workspace for learning materials, quizzes, and exercises.
    Requires explicit faculty review and approval before publishing to classrooms.
    """

    class DraftType(models.TextChoices):
        QUIZ_QUESTION = "quiz_question", "Quiz Question Bank"
        LESSON_SUMMARY = "lesson_summary", "Lesson Concept Summary"
        CODING_CHALLENGE = "coding_challenge", "Coding Lab Problem"
        STUDY_GUIDE = "study_guide", "Exam Study Guide"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="ai_drafts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_drafts",
    )
    draft_type = models.CharField(
        max_length=30,
        choices=DraftType.choices,
        default=DraftType.QUIZ_QUESTION,
    )
    title = models.CharField(max_length=200)
    prompt = models.TextField()
    generated_content = models.TextField()
    edited_content = models.TextField(blank=True)
    is_approved = models.BooleanField(
        default=False,
        help_text="Requires explicit faculty sign-off before being converted into live coursework.",
    )
    published_target = models.CharField(
        max_length=50,
        blank=True,
        help_text="e.g. 'quiz', 'material', 'assignment'",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.course.code}] AI Draft: {self.title} (Approved: {self.is_approved})"


class AIPlaygroundPrompt(models.Model):
    """Interactive experimentation session for faculty & advanced users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_playground_prompts",
    )
    system_prompt = models.TextField(blank=True)
    user_prompt = models.TextField()
    model_name = models.CharField(max_length=50, default="gpt-4o-mini")
    temperature = models.DecimalField(max_digits=3, decimal_places=2, default=0.7)
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - Playground prompt ({self.model_name})"
