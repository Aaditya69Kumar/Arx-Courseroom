"""
Attendance — Sessions, Records, and Audit Log
"""
import uuid
from django.db import models
from django.conf import settings


class AttendanceSession(models.Model):
    """A classroom attendance roll-call session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="attendance_sessions",
    )
    date = models.DateField()
    topic = models.CharField(max_length=200, blank=True, help_text="e.g. Lecture 12: Raft Consensus")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_attendance_sessions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] Session on {self.date}"


class AttendanceRecord(models.Model):
    """Individual student attendance mark in a session."""

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name="records",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        limit_choices_to={"role": "student"},
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
    )
    remarks = models.CharField(max_length=255, blank=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    
    # Audit trail for authorized corrections
    modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_modifications",
    )
    audit_note = models.CharField(
        max_length=255,
        blank=True,
        help_text="Reason for attendance status modification (e.g. Deanery medical excuse approved)",
    )

    class Meta:
        unique_together = ["session", "student"]
        ordering = ["student__first_name"]

    def __str__(self):
        return f"{self.student.email} -> {self.session.course.code} ({self.status})"
