"""
Courses — Models
"""
import uuid
import secrets
import string
from django.db import models
from django.conf import settings


def generate_join_code(length=7):
    """Generate a clean, unambiguous uppercase join code."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(length))


class Course(models.Model):
    """A course / classroom offered by an instructor."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, help_text="e.g. CS-401")
    title = models.CharField(max_length=200, help_text="e.g. Distributed Systems")
    description = models.TextField(blank=True)
    section = models.CharField(max_length=30, default="Section A")
    semester = models.CharField(max_length=30, default="Fall 2026")
    year = models.IntegerField(default=2026)
    
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses_teaching",
        limit_choices_to={"role__in": ["instructor", "admin"]},
    )
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    is_active = models.BooleanField(default=True)
    join_code = models.CharField(
        max_length=12,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    allow_code_join = models.BooleanField(
        default=True,
        help_text="If enabled, students can self-enroll using the join_code.",
    )
    max_students = models.IntegerField(default=60)
    cover_color = models.CharField(max_length=20, default="#4F46E5")
    schedule_info = models.CharField(
        max_length=100,
        blank=True,
        default="Mon, Wed • 10:00 AM - 11:30 AM",
    )
    room_location = models.CharField(
        max_length=100,
        blank=True,
        default="Room 402, Engineering Block",
    )
    enable_leaderboard = models.BooleanField(
        default=True,
        help_text="Faculty toggle to enable or disable class leaderboard.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} — {self.title} ({self.section})"

    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = generate_join_code()
        super().save(*args, **kwargs)

    @property
    def enrollment_count(self):
        return self.enrollments.filter(status=Enrollment.Status.ACTIVE).count()



class Enrollment(models.Model):
    """Tracks student enrollment in courses."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DROPPED = "dropped", "Dropped"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
        limit_choices_to={"role": "student"},
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "course"]
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.student.email} -> {self.course.code} ({self.status})"


class Announcement(models.Model):
    """Course stream announcements posted by instructors."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="announcements_authored",
    )
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] {self.title or self.content[:30]}"
