"""
Scheduling — API Views for Timetable and Unified Academic Calendar
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import TimetableSlot, CalendarEvent
from .serializers import TimetableSlotSerializer, CalendarEventSerializer
from apps.courses.models import Course, Enrollment
from apps.assessments.models import Assignment, Quiz


class TimetableListView(APIView):
    """
    GET  /api/v1/scheduling/timetable/ — Student or Faculty weekly timetable with conflict detection.
    POST /api/v1/scheduling/timetable/ — Create slot with conflict validation.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")

        qs = TimetableSlot.objects.select_related("course__instructor").all()

        if course_id:
            qs = qs.filter(course_id=course_id)
        elif user.role == "student":
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)
            qs = qs.filter(course_id__in=enrolled_ids)
        elif user.role == "instructor":
            qs = qs.filter(course__instructor=user)

        serializer = TimetableSlotSerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only instructors or administrators can configure schedule slots.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        day = request.data.get("day")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")
        room = request.data.get("room", "")

        # Conflict check: room collision during same day and overlapping time
        conflicts = TimetableSlot.objects.filter(
            day=day,
            room__iexact=room,
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).select_related("course")

        if conflicts.exists():
            conflicting = conflicts.first()
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "CONFLICT",
                        "message": f"Schedule conflict! Room '{room}' is already booked on {day} ({conflicting.start_time}-{conflicting.end_time}) by {conflicting.course.code}.",
                        "details": [],
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = TimetableSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot = serializer.save()

        return Response(
            {
                "success": True,
                "message": f"Timetable slot added for {slot.course.code} on {slot.day}.",
                "data": TimetableSlotSerializer(slot).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CalendarEventListView(APIView):
    """
    GET  /api/v1/scheduling/calendar/
    Returns merged events: Academic calendar items + Course deadlines + Quiz windows.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == "student":
            user_courses = Course.objects.filter(
                enrollments__student=user,
                enrollments__status=Enrollment.Status.ACTIVE,
            )
        else:
            user_courses = Course.objects.filter(instructor=user)

        # 1. Base calendar events (university-wide or course-specific)
        events_qs = CalendarEvent.objects.filter(
            Q(course__isnull=True) | Q(course__in=user_courses)
        ).select_related("course")
        events_data = CalendarEventSerializer(events_qs, many=True).data

        # 2. Merge assignment deadlines
        assignments = Assignment.objects.filter(
            course__in=user_courses,
            is_published=True,
            due_date__isnull=False,
        ).select_related("course")

        for a in assignments:
            events_data.append({
                "id": f"assign-{a.id}",
                "course": str(a.course.id),
                "course_code": a.course.code,
                "title": f"Assignment Due: {a.title}",
                "description": f"Due date for {a.course.code}. Max points: {a.max_score}",
                "event_type": "deadline",
                "start_time": a.due_date,
                "end_time": a.due_date,
                "location": "Online Submission",
            })

        # 3. Merge quiz deadlines
        quizzes = Quiz.objects.filter(
            course__in=user_courses,
            is_published=True,
            due_date__isnull=False,
        ).select_related("course")

        for q in quizzes:
            events_data.append({
                "id": f"quiz-{q.id}",
                "course": str(q.course.id),
                "course_code": q.course.code,
                "title": f"Quiz Due: {q.title}",
                "description": f"Quiz closing window. Time limit: {q.duration_minutes} mins",
                "event_type": "exam",
                "start_time": q.due_date,
                "end_time": q.due_date,
                "location": "Online Assessment",
            })


        return Response({"success": True, "data": events_data})
