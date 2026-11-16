"""
Attendance — API Views
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import AttendanceSession, AttendanceRecord
from .serializers import AttendanceSessionSerializer, AttendanceRecordSerializer
from apps.courses.models import Course, Enrollment


class AttendanceSessionListCreateView(APIView):
    """
    GET  /api/v1/attendance/sessions/ — List sessions for course.
    POST /api/v1/attendance/sessions/ — Create session (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        qs = AttendanceSession.objects.select_related("course", "created_by").prefetch_related("records__student").all()

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = AttendanceSessionSerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can start attendance sessions.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.data.get("course")
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course not found.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date_val = request.data.get("date") or timezone.now().date()
        topic = request.data.get("topic", "")

        session, created = AttendanceSession.objects.get_or_create(
            course=course,
            date=date_val,
            defaults={
                "topic": topic,
                "created_by": request.user,
            },
        )
        if not created and topic and session.topic != topic:
            session.topic = topic
            session.save(update_fields=["topic"])

        return Response(
            {
                "success": True,
                "message": f"Attendance roll session {'created' if created else 'retrieved'} for {session.date}.",
                "data": AttendanceSessionSerializer(session).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AttendanceRollCallView(APIView):
    """
    POST /api/v1/attendance/sessions/<pk>/roll-call/
    Bulk submits attendance records for a session.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only instructors can submit roll call.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = AttendanceSession.objects.select_related("course").get(pk=pk)
        except AttendanceSession.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Session not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        records_data = request.data.get("records", [])
        saved_count = 0

        for r in records_data:
            student_id = r.get("student_id")
            st = r.get("status", AttendanceRecord.Status.PRESENT)
            remarks = r.get("remarks", "")

            if student_id:
                AttendanceRecord.objects.update_or_create(
                    session=session,
                    student_id=student_id,
                    defaults={"status": st, "remarks": remarks},
                )
                saved_count += 1

        updated_session = AttendanceSession.objects.prefetch_related("records__student").get(pk=session.id)
        return Response({
            "success": True,
            "message": f"Attendance recorded for {saved_count} students.",
            "data": AttendanceSessionSerializer(updated_session).data,
        })


class AttendanceRecordCorrectionView(APIView):
    """
    PATCH /api/v1/attendance/records/<pk>/correct/
    Authorized corrections with mandatory audit trail log.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can adjust attendance records.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            record = AttendanceRecord.objects.select_related("session__course", "student").get(pk=pk)
        except AttendanceRecord.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Attendance record not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get("status")
        audit_note = request.data.get("audit_note", "").strip()

        if not new_status:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "New status is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not audit_note:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Audit reason is required for attendance correction.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record.status = new_status
        record.modified_by = request.user
        record.audit_note = audit_note
        record.save()

        return Response({
            "success": True,
            "message": f"Attendance record updated with audit note: '{audit_note}'",
            "data": AttendanceRecordSerializer(record).data,
        })


class StudentAttendanceSummaryView(APIView):
    """
    GET /api/v1/attendance/my-summary/
    Subject-wise attendance breakdown and history for the authenticated student.
    Never fabricates statistics; computes directly from AttendanceRecord objects.
    Accounts for late enrollment date: sessions conducted prior to a student's enrollment
    are marked as 'late_entry' and excluded from the attendance percentage penalty.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")
        enrolled_courses = Course.objects.filter(
            enrollments__student=user,
            enrollments__status=Enrollment.Status.ACTIVE,
        ).select_related("instructor")
        if course_id:
            enrolled_courses = enrolled_courses.filter(pk=course_id)

        summaries = []
        for course in enrolled_courses:
            instructor_name = (
                f"{course.instructor.first_name} {course.instructor.last_name}".strip()
                or course.instructor.username
                if course.instructor else "Faculty"
            )
            enrollment = Enrollment.objects.filter(
                student=user,
                course=course,
                status=Enrollment.Status.ACTIVE,
            ).first()

            enrolled_date = enrollment.enrolled_at.date() if (enrollment and enrollment.enrolled_at) else None

            sessions = list(AttendanceSession.objects.filter(course=course).order_by("-date", "-created_at"))
            records = {
                r.session_id: r
                for r in AttendanceRecord.objects.filter(session__course=course, student=user).select_related("session")
            }

            eligible_sessions = []
            late_entry_sessions = []

            for s in sessions:
                if enrolled_date and s.date < enrolled_date:
                    late_entry_sessions.append(s)
                else:
                    eligible_sessions.append(s)

            total_sessions = len(sessions)
            total_eligible = len(eligible_sessions)
            late_entry_count = len(late_entry_sessions)

            present_count = sum(
                1 for s in eligible_sessions
                if s.id in records and records[s.id].status == AttendanceRecord.Status.PRESENT
            )
            late_count = sum(
                1 for s in eligible_sessions
                if s.id in records and records[s.id].status == AttendanceRecord.Status.LATE
            )
            absent_count = sum(
                1 for s in eligible_sessions
                if s.id in records and records[s.id].status == AttendanceRecord.Status.ABSENT
            )
            excused_count = sum(
                1 for s in eligible_sessions
                if s.id in records and records[s.id].status == AttendanceRecord.Status.EXCUSED
            )

            attended = present_count + late_count
            if total_eligible > 0:
                pct = round((attended / total_eligible) * 100, 1)
            else:
                pct = 100.0

            status_tag = "Safe"
            if pct < 65:
                status_tag = "Critical"
            elif pct < 75:
                status_tag = "Warning"

            history = []
            for s in sessions:
                is_late_entry = bool(enrolled_date and s.date < enrolled_date)
                if is_late_entry:
                    st_val = "late_entry"
                    st_label = "Late Entry"
                    rem = f"Enrolled on {enrolled_date.strftime('%b %d, %Y')}"
                    modified = False
                    audit_note = ""
                elif s.id in records:
                    rec = records[s.id]
                    st_val = rec.status
                    st_label = rec.get_status_display()
                    rem = rec.remarks
                    modified = bool(rec.modified_by)
                    audit_note = rec.audit_note
                else:
                    st_val = "pending"
                    st_label = "Unmarked"
                    rem = "Lecture conducted"
                    modified = False
                    audit_note = ""

                history.append({
                    "session_id": str(s.id),
                    "date": s.date.strftime("%Y-%m-%d"),
                    "date_display": s.date.strftime("%a, %b %d, %Y"),
                    "topic": s.topic or "Course Lecture",
                    "status": st_val,
                    "status_display": st_label,
                    "remarks": rem,
                    "is_late_entry": is_late_entry,
                    "corrected": modified,
                    "audit_note": audit_note,
                })

            summaries.append({
                "course_id": str(course.id),
                "course_code": course.code,
                "course_title": course.title,
                "instructor_name": instructor_name,
                "enrolled_at": enrollment.enrolled_at if enrollment else None,
                "total_sessions": total_sessions,
                "eligible_sessions": total_eligible,
                "late_entry_count": late_entry_count,
                "attended": attended,
                "present": present_count,
                "late": late_count,
                "absent": absent_count,
                "excused": excused_count,
                "percentage": f"{pct}%",
                "percentage_num": pct,
                "status_tag": status_tag,
                "history": history,
            })

        return Response({
            "success": True,
            "data": {
                "student_name": f"{user.first_name} {user.last_name}",
                "student_id": user.institution_id,
                "courses": summaries,
            }
        })
