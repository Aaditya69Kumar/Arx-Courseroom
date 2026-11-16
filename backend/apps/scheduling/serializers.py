"""
Scheduling — Serializers
"""
from rest_framework import serializers
from .models import TimetableSlot, CalendarEvent
from apps.courses.serializers import CourseSerializer


class TimetableSlotSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = TimetableSlot
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "instructor_name",
            "day",
            "start_time",
            "end_time",
            "room",
            "building",
        ]

    def get_instructor_name(self, obj):
        inst = obj.course.instructor
        return f"{inst.first_name} {inst.last_name}" if inst else "TBD"


class CalendarEventSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "course",
            "course_code",
            "title",
            "description",
            "event_type",
            "start_time",
            "end_time",
            "location",
        ]
