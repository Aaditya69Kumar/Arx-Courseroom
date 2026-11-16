"""
Scheduling — Timetable and Academic Calendar
"""
import uuid
from django.db import models
from django.conf import settings


class TimetableSlot(models.Model):
    """Recurring weekly lecture or lab session."""

    class DayOfWeek(models.TextChoices):
        MONDAY = "Monday", "Monday"
        TUESDAY = "Tuesday", "Tuesday"
        WEDNESDAY = "Wednesday", "Wednesday"
        THURSDAY = "Thursday", "Thursday"
        FRIDAY = "Friday", "Friday"
        SATURDAY = "Saturday", "Saturday"
        SUNDAY = "Sunday", "Sunday"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="timetable_slots",
    )
    day = models.CharField(
        max_length=20,
        choices=DayOfWeek.choices,
        default=DayOfWeek.MONDAY,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, default="Hall 3B")
    building = models.CharField(max_length=100, default="Academic Block")

    class Meta:
        ordering = ["day", "start_time"]

    def __str__(self):
        return f"[{self.course.code}] {self.day} {self.start_time}-{self.end_time} ({self.room})"


class CalendarEvent(models.Model):
    """Academic calendar event, seminar, or deadline."""

    class EventType(models.TextChoices):
        CLASS = "class", "Lecture Session"
        DEADLINE = "deadline", "Assignment Deadline"
        EXAM = "exam", "Exam / Midterm"
        HOLIDAY = "holiday", "Institutional Holiday"
        WORKSHOP = "workshop", "Research Seminar / Workshop"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="calendar_events",
        help_text="Null for university-wide calendar events",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.CLASS,
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    location = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.title} ({self.start_time.strftime('%b %d')})"
