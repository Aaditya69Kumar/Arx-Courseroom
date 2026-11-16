"""
Communication — Forums, Shorts, Forms, Anonymous Feedback, Notifications, and Help Desk
"""
import uuid
from django.db import models
from django.conf import settings


# ============================================================================
# 1. Course Discussion Forum
# ============================================================================

class ForumTopic(models.Model):
    """Discussion thread within a course."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="forum_topics",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forum_topics",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] {self.title}"


class ForumReply(models.Model):
    """Reply in a forum discussion thread."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(
        ForumTopic,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forum_replies",
    )
    content = models.TextField()
    is_accepted_answer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_accepted_answer", "created_at"]

    def __str__(self):
        return f"Reply by {self.author.email} on {self.topic.title}"


# ============================================================================
# 2. Shorts (Quick Classroom Polls & Micro-Activities)
# ============================================================================

class ShortActivity(models.Model):
    """Bite-sized classroom poll or micro-quiz."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="shorts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_shorts",
    )
    title = models.CharField(max_length=200)
    prompt = models.TextField()
    options = models.JSONField(
        default=list,
        help_text="List of choices: ['Strongly Agree', 'Agree', 'Disagree'] or quiz choices",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Short: {self.title} ({self.course.code})"


class ShortResponse(models.Model):
    """Student answer to a short activity."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    short = models.ForeignKey(
        ShortActivity,
        on_delete=models.CASCADE,
        related_name="responses",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="short_responses",
        limit_choices_to={"role": "student"},
    )
    selected_option = models.CharField(max_length=255)
    responded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["short", "student"]

    def __str__(self):
        return f"{self.student.email} -> {self.selected_option}"


# ============================================================================
# 3. Forms & Strictly Anonymous Feedback
# ============================================================================

class CourseForm(models.Model):
    """Faculty-created questionnaire or feedback form."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="forms",
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_forms",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    questions = models.JSONField(
        default=list,
        help_text="List of questions: [{'id': 1, 'text': '...', 'type': 'text|mcq', 'required': true, 'options': []}]",
    )
    deadline = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Form: {self.title} ({self.course.code})"


class FormResponse(models.Model):
    """Response submitted to a CourseForm."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    form = models.ForeignKey(
        CourseForm,
        on_delete=models.CASCADE,
        related_name="responses",
    )
    respondent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="form_responses",
    )
    answers = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response to {self.form.title} on {self.submitted_at}"


class AnonymousFeedback(models.Model):
    """
    CRITICAL SECURITY & PRIVACY REQUIREMENT:
    Zero reference to the submitting user in schema or database.
    True server-side anonymity preventing deanery or instructors from correlating identity.
    """

    class Category(models.TextChoices):
        PACING = "pacing", "Lecture Pacing & Speed"
        DIFFICULTY = "difficulty", "Course Difficulty"
        MATERIALS = "materials", "Clarity of Notes & Slides"
        EXAMS = "exams", "Assessments & Grading"
        GENERAL = "general", "General Academic Feedback"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="anonymous_feedbacks",
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    rating = models.IntegerField(default=5, help_text="Rating out of 5")
    feedback_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.course.code}] Anonymous {self.category} ({self.rating}/5)"


# ============================================================================
# 4. Institutional Notifications & Help Desk Tickets
# ============================================================================

class Notification(models.Model):
    """User notifications generated by course activities."""

    class NotificationType(models.TextChoices):
        ANNOUNCEMENT = "announcement", "Announcement"
        MATERIAL = "material", "New Material"
        ASSIGNMENT = "assignment", "Assignment Deadline"
        GRADE = "grade", "Grade Released"
        TIMETABLE = "timetable", "Schedule Change"
        SYSTEM = "system", "System Notice"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=255, blank=True)
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.email} - {self.title}"


class HelpDeskTicket(models.Model):
    """Support tickets and bug/suggestion reporting."""

    class TicketType(models.TextChoices):
        BUG = "bug", "Bug Report"
        SUGGESTION = "suggestion", "Platform Suggestion"
        HELP = "help", "Help Desk Request"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    ticket_type = models.CharField(
        max_length=20,
        choices=TicketType.choices,
        default=TicketType.HELP,
    )
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.ticket_type.upper()}] {self.subject} ({self.status})"
