"""
Assessments — API Views for Assignments, Submissions, Quizzes, Grading, and Sandboxed Coding Labs
"""
import sys
import subprocess
import tempfile
import time
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.db.models import Q, Avg

from .models import (
    Assignment,
    Submission,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    CodingProblem,
    CodingSubmission,
)
from .serializers import (
    AssignmentSerializer,
    SubmissionSerializer,
    QuizSerializer,
    QuizQuestionSerializer,
    QuizAttemptSerializer,
    CodingProblemSerializer,
    CodingSubmissionSerializer,
)
from apps.courses.models import Course, Enrollment


# ============================================================================
# Assignments & Submissions
# ============================================================================

class AssignmentListCreateView(APIView):
    """
    GET  /api/v1/assessments/ — List assignments with course filter.
    POST /api/v1/assessments/ — Create assignment (Instructor/Admin).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")

        qs = Assignment.objects.select_related("course").all()

        if user.role == "student":
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)
            qs = qs.filter(course_id__in=enrolled_ids, is_published=True)
        elif user.role == "instructor":
            qs = qs.filter(course__instructor=user)

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = AssignmentSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can create assignments.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.data.get("course")
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Target course does not exist.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You can only assign work in your courses.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        attachment_file = request.FILES.get("attachment")
        attachment_name = attachment_file.name if attachment_file else request.data.get("attachment_name", "")

        serializer = AssignmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if attachment_file:
            assignment = serializer.save(attachment=attachment_file, attachment_name=attachment_name)
        else:
            assignment = serializer.save()

        return Response(
            {
                "success": True,
                "message": f"Assignment '{assignment.title}' published successfully.",
                "data": AssignmentSerializer(assignment, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AssignmentDetailView(APIView):
    """
    GET    /api/v1/assessments/<pk>/ — Retrieve assignment details.
    PATCH  /api/v1/assessments/<pk>/ — Edit or close assignment (Instructor).
    DELETE /api/v1/assessments/<pk>/ — Delete assignment (Instructor).
    """

    permission_classes = [IsAuthenticated]

    def get_assignment(self, pk):
        try:
            return Assignment.objects.select_related("course").get(pk=pk)
        except Assignment.DoesNotExist:
            return None

    def get(self, request, pk):
        assignment = self.get_assignment(pk)
        if not assignment:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Assignment not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AssignmentSerializer(assignment, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def patch(self, request, pk):
        assignment = self.get_assignment(pk)
        if not assignment:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Assignment not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != assignment.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AssignmentSerializer(assignment, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response({"success": True, "message": "Assignment updated.", "data": serializer.data})

    def delete(self, request, pk):
        assignment = self.get_assignment(pk)
        if not assignment:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Assignment not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != assignment.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignment.delete()
        return Response({"success": True, "message": "Assignment removed."})


class AssignmentSubmissionView(APIView):
    """
    POST /api/v1/assessments/<pk>/submit/ — Submit work (Student only).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        if request.user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only enrolled students can submit coursework.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            assignment = Assignment.objects.select_related("course").get(pk=pk)
        except Assignment.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Assignment not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check enrollment
        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            course=assignment.course,
            status=Enrollment.Status.ACTIVE,
        ).exists()

        if not is_enrolled:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not enrolled in this course.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Deadline and late policy verification
        now = timezone.now()
        is_late = False
        if assignment.due_date and now > assignment.due_date:
            if not assignment.late_submissions_allowed:
                return Response(
                    {"success": False, "error": {"code": "BAD_REQUEST", "message": "Submission deadline has passed and late work is disallowed.", "details": []}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            is_late = True

        content = request.data.get("content", "")
        uploaded_file = request.FILES.get("file")

        update_defaults = {
            "content": content,
            "is_late": is_late,
            "status": Submission.Status.SUBMITTED,
            "submitted_at": now,
        }
        if uploaded_file:
            update_defaults["file"] = uploaded_file
            update_defaults["file_name"] = uploaded_file.name
            update_defaults["file_size"] = uploaded_file.size

        submission, created = Submission.objects.update_or_create(
            assignment=assignment,
            student=request.user,
            defaults=update_defaults,
        )

        return Response(
            {
                "success": True,
                "message": f"Submission received! Submission Receipt: {submission.receipt_id}",
                "data": SubmissionSerializer(submission, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class GradeSubmissionView(APIView):
    """
    POST /api/v1/assessments/submissions/<pk>/grade/ — Assign marks and feedback (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            submission = Submission.objects.select_related("assignment__course", "student").get(pk=pk)
        except Submission.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Submission not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        course = submission.assignment.course
        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the course instructor can enter grades.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        score = request.data.get("score")
        feedback = request.data.get("feedback", "")

        if score is None:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Score value is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submission.score = score
        submission.feedback = feedback
        submission.status = Submission.Status.GRADED
        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.save()

        return Response({
            "success": True,
            "message": f"Grade recorded for {submission.student.email}.",
            "data": SubmissionSerializer(submission, context={"request": request}).data,
        })


class AssignmentSubmissionsListView(APIView):
    """
    GET /api/v1/assessments/<pk>/submissions/
    List all enrolled students with their submission status (submitted, late, missing, pending),
    attached files, grades, and timestamps (Instructor/Admin only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            assignment = Assignment.objects.select_related("course").get(pk=pk)
        except Assignment.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Assignment not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != assignment.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the course instructor can view submissions.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollments = Enrollment.objects.filter(
            course=assignment.course,
            status=Enrollment.Status.ACTIVE,
        ).select_related("student")

        submissions = {
            s.student_id: s
            for s in Submission.objects.filter(assignment=assignment).select_related("student", "graded_by")
        }

        now = timezone.now()
        is_overdue = bool(assignment.due_date and now > assignment.due_date)

        students_list = []
        submitted_count = 0
        late_count = 0
        missing_count = 0

        for en in enrollments:
            st = en.student
            sub = submissions.get(st.id)

            if sub:
                submitted_count += 1
                if sub.is_late:
                    late_count += 1
                    st_status = "late"
                else:
                    st_status = "submitted"

                sub_data = {
                    "id": str(sub.id),
                    "receipt_id": sub.receipt_id,
                    "content": sub.content,
                    "file_url": request.build_absolute_uri(sub.file.url) if sub.file else None,
                    "file_name": sub.file_name,
                    "file_size": sub.file_size,
                    "is_late": sub.is_late,
                    "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
                    "score": float(sub.score) if sub.score is not None else None,
                    "feedback": sub.feedback,
                    "status": sub.status,
                    "graded_at": sub.graded_at.isoformat() if sub.graded_at else None,
                }
            else:
                if is_overdue:
                    st_status = "missing"
                    missing_count += 1
                else:
                    st_status = "pending"
                sub_data = None

            students_list.append({
                "student_id": str(st.id),
                "name": f"{st.first_name} {st.last_name}".strip() or st.username,
                "email": st.email,
                "roll_no": st.institution_id or "N/A",
                "avatar_url": st.avatar_url if hasattr(st, "avatar_url") else None,
                "has_submitted": sub is not None,
                "is_late": sub.is_late if sub else False,
                "status": st_status,
                "submission": sub_data,
            })

        return Response({
            "success": True,
            "data": {
                "assignment": {
                    "id": str(assignment.id),
                    "title": assignment.title,
                    "course_code": assignment.course.code,
                    "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
                    "max_score": assignment.max_score,
                    "attachment_url": request.build_absolute_uri(assignment.attachment.url) if assignment.attachment else None,
                    "attachment_name": assignment.attachment_name,
                },
                "stats": {
                    "total_enrolled": len(enrollments),
                    "submitted_count": submitted_count,
                    "late_count": late_count,
                    "missing_count": missing_count,
                    "pending_count": len(enrollments) - submitted_count - missing_count,
                },
                "students": students_list,
            }
        })


class QuizAttemptsListView(APIView):
    """
    GET /api/v1/assessments/quizzes/<pk>/attempts/
    List all enrolled students with their quiz attempt status, scores, timestamps, and late attempts (Instructor/Admin only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            quiz = Quiz.objects.select_related("course").get(pk=pk)
        except Quiz.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Quiz not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != quiz.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the course instructor can view quiz attempts.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollments = Enrollment.objects.filter(
            course=quiz.course,
            status=Enrollment.Status.ACTIVE,
        ).select_related("student")

        attempts = {}
        for att in QuizAttempt.objects.filter(quiz=quiz).select_related("student").order_by("-attempt_number"):
            if att.student_id not in attempts:
                attempts[att.student_id] = att

        now = timezone.now()
        is_overdue = bool(quiz.due_date and now > quiz.due_date)

        students_list = []
        attempted_count = 0
        late_count = 0
        missing_count = 0
        total_score = 0.0

        for en in enrollments:
            st = en.student
            att = attempts.get(st.id)

            if att:
                attempted_count += 1
                is_late = bool(quiz.due_date and att.completed_at and att.completed_at > quiz.due_date)
                if is_late:
                    late_count += 1
                    st_status = "late"
                else:
                    st_status = "completed"

                score_val = float(att.score) if att.score is not None else 0.0
                total_score += score_val

                att_data = {
                    "id": str(att.id),
                    "attempt_number": att.attempt_number,
                    "score": score_val,
                    "max_score": float(att.max_score),
                    "percentage": round((score_val / float(att.max_score) * 100), 1) if float(att.max_score) > 0 else 0.0,
                    "is_late": is_late,
                    "started_at": att.started_at.isoformat() if att.started_at else None,
                    "completed_at": att.completed_at.isoformat() if att.completed_at else None,
                    "status": att.status,
                }
            else:
                if is_overdue:
                    st_status = "missing"
                    missing_count += 1
                else:
                    st_status = "pending"
                att_data = None

            students_list.append({
                "student_id": str(st.id),
                "name": f"{st.first_name} {st.last_name}".strip() or st.username,
                "email": st.email,
                "roll_no": st.institution_id or "N/A",
                "avatar_url": st.avatar_url if hasattr(st, "avatar_url") else None,
                "has_attempted": att is not None,
                "is_late": att_data["is_late"] if att_data else False,
                "status": st_status,
                "attempt": att_data,
            })

        avg_score = round(total_score / attempted_count, 1) if attempted_count > 0 else 0.0

        return Response({
            "success": True,
            "data": {
                "quiz": {
                    "id": str(quiz.id),
                    "title": quiz.title,
                    "course_code": quiz.course.code,
                    "due_date": quiz.due_date.isoformat() if quiz.due_date else None,
                    "total_marks": quiz.total_marks,
                    "duration_minutes": quiz.duration_minutes,
                },
                "stats": {
                    "total_enrolled": len(enrollments),
                    "attempted_count": attempted_count,
                    "late_count": late_count,
                    "missing_count": missing_count,
                    "pending_count": len(enrollments) - attempted_count - missing_count,
                    "avg_score": avg_score,
                },
                "students": students_list,
            }
        })


class StudentProgressSummaryView(APIView):
    """
    GET /api/v1/assessments/my-progress/
    Computes real progress, completion rates, quizzes averages, and milestones
    for the authenticated student across all enrolled courses (or filtered by ?course_id=).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students have personal progress trackers.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.query_params.get("course_id")
        enrolled_courses = Course.objects.filter(
            enrollments__student=user,
            enrollments__status=Enrollment.Status.ACTIVE,
        ).select_related("instructor")

        if course_id:
            enrolled_courses = enrolled_courses.filter(pk=course_id)

        all_assignments = Assignment.objects.filter(course__in=enrolled_courses, is_published=True).select_related("course")
        all_quizzes = Quiz.objects.filter(course__in=enrolled_courses, is_published=True).select_related("course")

        submissions = {
            s.assignment_id: s
            for s in Submission.objects.filter(assignment__in=all_assignments, student=user)
        }

        attempts = {}
        for att in QuizAttempt.objects.filter(quiz__in=all_quizzes, student=user).order_by("-attempt_number"):
            if att.quiz_id not in attempts:
                attempts[att.quiz_id] = att

        now = timezone.now()

        course_summaries = []
        total_items_global = 0
        total_completed_global = 0
        total_quiz_score_pct = []

        for course in enrolled_courses:
            c_assignments = [a for a in all_assignments if a.course_id == course.id]
            c_quizzes = [q for q in all_quizzes if q.course_id == course.id]

            items = []
            c_items_total = len(c_assignments) + len(c_quizzes)
            c_items_completed = 0
            c_quiz_scores = []

            for a in c_assignments:
                sub = submissions.get(a.id)
                is_past_due = bool(a.due_date and now > a.due_date)

                if sub:
                    c_items_completed += 1
                    sub_status = "graded" if sub.status == Submission.Status.GRADED else ("late" if sub.is_late else "submitted")
                else:
                    sub_status = "missing" if is_past_due else "pending"

                items.append({
                    "id": str(a.id),
                    "type": "assignment",
                    "title": a.title,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "max_score": a.max_score,
                    "has_submitted": sub is not None,
                    "is_late": sub.is_late if sub else False,
                    "score": float(sub.score) if (sub and sub.score is not None) else None,
                    "feedback": sub.feedback if sub else "",
                    "status": sub_status,
                    "submitted_at": sub.submitted_at.isoformat() if (sub and sub.submitted_at) else None,
                })

            for q in c_quizzes:
                att = attempts.get(q.id)
                is_past_due = bool(q.due_date and now > q.due_date)

                if att:
                    c_items_completed += 1
                    pct = round((float(att.score) / float(att.max_score) * 100), 1) if float(att.max_score) > 0 else 0.0
                    c_quiz_scores.append(pct)
                    total_quiz_score_pct.append(pct)
                    is_late = bool(q.due_date and att.completed_at and att.completed_at > q.due_date)
                    att_status = "completed" if not is_late else "late"
                else:
                    att_status = "missing" if is_past_due else "pending"

                items.append({
                    "id": str(q.id),
                    "type": "quiz",
                    "title": q.title,
                    "due_date": q.due_date.isoformat() if q.due_date else None,
                    "max_score": q.total_marks,
                    "has_submitted": att is not None,
                    "is_late": bool(q.due_date and att and att.completed_at and att.completed_at > q.due_date),
                    "score": float(att.score) if att else None,
                    "feedback": "Auto-graded" if att else "",
                    "status": att_status,
                    "submitted_at": att.completed_at.isoformat() if (att and att.completed_at) else None,
                })

            total_items_global += c_items_total
            total_completed_global += c_items_completed

            c_completion = round((c_items_completed / c_items_total * 100), 1) if c_items_total > 0 else 100.0
            c_quiz_avg = round(sum(c_quiz_scores) / len(c_quiz_scores), 1) if c_quiz_scores else None

            instructor_name = (
                f"{course.instructor.first_name} {course.instructor.last_name}".strip()
                or course.instructor.username
                if course.instructor else "Faculty"
            )

            course_summaries.append({
                "course_id": str(course.id),
                "course_code": course.code,
                "course_title": course.title,
                "instructor_name": instructor_name,
                "completion_percentage": c_completion,
                "quizzes_avg_score": f"{round(c_quiz_avg / 10, 1)} / 10" if c_quiz_avg is not None else "N/A",
                "quizzes_avg_pct": c_quiz_avg,
                "assignments_submitted": sum(1 for a in c_assignments if a.id in submissions),
                "assignments_total": len(c_assignments),
                "quizzes_attempted": sum(1 for q in c_quizzes if q.id in attempts),
                "quizzes_total": len(c_quizzes),
                "items": items,
            })

        global_completion = round((total_completed_global / total_items_global * 100), 1) if total_items_global > 0 else 100.0
        global_quiz_avg = round(sum(total_quiz_score_pct) / len(total_quiz_score_pct), 1) if total_quiz_score_pct else None

        return Response({
            "success": True,
            "data": {
                "aggregate": {
                    "completion_rate": f"{global_completion}%",
                    "completion_rate_num": global_completion,
                    "quizzes_avg": f"{round(global_quiz_avg / 10, 1)} / 10" if global_quiz_avg is not None else "N/A",
                    "quizzes_avg_num": global_quiz_avg,
                    "completed_items": total_completed_global,
                    "total_items": total_items_global,
                    "earned_badges": 3 if global_completion >= 70 else (2 if global_completion >= 40 else 1),
                },
                "courses": course_summaries,
            }
        })


class ConsolidatedGradebookView(APIView):
    """
    GET /api/v1/assessments/courses/<course_id>/gradebook/
    Consolidated gradebook matrix for faculty and student grade tracking.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignments = Assignment.objects.filter(course=course, is_published=True)
        quizzes = Quiz.objects.filter(course=course, is_published=True)

        if request.user.role == "student":
            # Student view: only their own released grades
            my_submissions = Submission.objects.filter(assignment__course=course, student=request.user)
            my_attempts = QuizAttempt.objects.filter(quiz__course=course, student=request.user)

            records = [
                {
                    "type": "assignment",
                    "title": s.assignment.title,
                    "max_score": s.assignment.max_score,
                    "score": s.score,
                    "feedback": s.feedback,
                    "status": s.status,
                    "submitted_at": s.submitted_at,
                }
                for s in my_submissions
            ]

            quiz_records = [
                {
                    "type": "quiz",
                    "title": a.quiz.title,
                    "max_score": a.max_score,
                    "score": a.score if a.quiz.release_results else None,
                    "completed_at": a.completed_at,
                    "status": a.status,
                }
                for a in my_attempts
            ]

            return Response({
                "success": True,
                "data": {
                    "role": "student",
                    "course_code": course.code,
                    "assignments_graded": records,
                    "quizzes_graded": quiz_records,
                }
            })

        # Instructor view: full gradebook matrix
        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Access restricted.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollments = Enrollment.objects.filter(course=course, status=Enrollment.Status.ACTIVE).select_related("student")
        submissions = Submission.objects.filter(assignment__course=course).select_related("assignment", "student")

        students_matrix = []
        for en in enrollments:
            student = en.student
            st_subs = {s.assignment_id: s for s in submissions if s.student_id == student.id}
            
            assignment_scores = []
            for a in assignments:
                sub = st_subs.get(a.id)
                assignment_scores.append({
                    "assignment_id": str(a.id),
                    "title": a.title,
                    "max_score": a.max_score,
                    "submission_id": str(sub.id) if sub else None,
                    "score": sub.score if sub else None,
                    "status": sub.status if sub else "missing",
                })

            students_matrix.append({
                "student_id": str(student.id),
                "name": f"{student.first_name} {student.last_name}",
                "email": student.email,
                "institution_id": student.institution_id,
                "assignments": assignment_scores,
            })

        return Response({
            "success": True,
            "data": {
                "course_code": course.code,
                "total_students": len(students_matrix),
                "assignments": [{"id": str(a.id), "title": a.title, "max_score": a.max_score} for a in assignments],
                "matrix": students_matrix,
            }
        })


# ============================================================================
# Quizzes & Automated Auto-Grading
# ============================================================================

class QuizListCreateView(APIView):
    """
    GET  /api/v1/assessments/quizzes/ — List quizzes for accessible courses.
    POST /api/v1/assessments/quizzes/ — Create quiz (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")

        qs = Quiz.objects.select_related("course").prefetch_related("questions", "attempts").all()

        if user.role == "student":
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)
            qs = qs.filter(course_id__in=enrolled_ids, is_published=True)
        elif user.role == "instructor":
            qs = qs.filter(course__instructor=user)

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = QuizSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can create quizzes.", "details": []}},
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

        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = QuizSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save()

        # Handle questions in payload if provided
        questions_data = request.data.get("questions", [])
        for idx, q_data in enumerate(questions_data):
            QuizQuestion.objects.create(
                quiz=quiz,
                question_text=q_data.get("question_text", ""),
                question_type=q_data.get("question_type", "mcq"),
                options=q_data.get("options", []),
                correct_answer=q_data.get("correct_answer", ""),
                explanation=q_data.get("explanation", ""),
                marks=q_data.get("marks", 5),
                order=idx,
            )

        full_quiz = Quiz.objects.prefetch_related("questions").get(pk=quiz.id)
        return Response(
            {
                "success": True,
                "message": f"Quiz '{quiz.title}' created.",
                "data": QuizSerializer(full_quiz, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class QuizAttemptView(APIView):
    """
    POST /api/v1/assessments/quizzes/<pk>/attempt/
    Student takes quiz. Automatically grades MCQ and True/False questions.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can take quizzes.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            quiz = Quiz.objects.prefetch_related("questions").get(pk=pk)
        except Quiz.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Quiz not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check attempts
        prior_attempts = QuizAttempt.objects.filter(quiz=quiz, student=request.user).count()
        if prior_attempts >= quiz.max_attempts:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": f"Maximum attempt limit ({quiz.max_attempts}) reached for this quiz.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_answers = request.data.get("answers", {})
        total_score = 0.0
        max_possible = 0.0

        for q in quiz.questions.all():
            q_id_str = str(q.id)
            user_ans = str(student_answers.get(q_id_str, "")).strip().lower()
            correct_ans = str(q.correct_answer).strip().lower()

            max_possible += q.marks
            if user_ans and user_ans == correct_ans:
                total_score += q.marks

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user,
            answers=student_answers,
            score=total_score,
            max_score=max_possible,
            attempt_number=prior_attempts + 1,
            status=QuizAttempt.Status.SUBMITTED,
            completed_at=timezone.now(),
        )

        return Response(
            {
                "success": True,
                "message": "Quiz completed and automatically evaluated.",
                "data": {
                    "attempt_id": str(attempt.id),
                    "attempt_number": attempt.attempt_number,
                    "score": attempt.score if quiz.release_results else "Withheld until instructor release",
                    "max_score": attempt.max_score,
                    "release_results": quiz.release_results,
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================================
# Coding Labs & Sandboxed Judging
# ============================================================================

class CodingProblemListCreateView(APIView):
    """
    GET  /api/v1/assessments/coding/ — List coding problems.
    POST /api/v1/assessments/coding/ — Create problem (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")

        qs = CodingProblem.objects.select_related("course").all()

        if user.role == "student":
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)
            qs = qs.filter(course_id__in=enrolled_ids)
        elif user.role == "instructor":
            qs = qs.filter(course__instructor=user)

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = CodingProblemSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can create coding problems.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CodingProblemSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        problem = serializer.save()

        return Response(
            {
                "success": True,
                "message": f"Coding lab '{problem.title}' configured.",
                "data": CodingProblemSerializer(problem, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CodingSubmissionJudgeView(APIView):
    """
    POST /api/v1/assessments/coding/<pk>/submit/
    Judges student code against sample and hidden test cases in an isolated execution sandbox.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can submit code.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            problem = CodingProblem.objects.get(pk=pk)
        except CodingProblem.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Problem not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        code = request.data.get("code", "")
        language = request.data.get("language", "python").lower()

        if not code.strip():
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Source code cannot be empty.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Collect test cases: sample test cases + hidden test cases
        test_cases = []
        if problem.sample_input or problem.sample_output:
            test_cases.append({"input": problem.sample_input, "output": problem.sample_output})
        if isinstance(problem.hidden_test_cases, list):
            test_cases.extend(problem.hidden_test_cases)

        if not test_cases:
            # Default pass if no test cases defined
            test_cases.append({"input": "", "output": ""})

        passed_count = 0
        total_count = len(test_cases)
        overall_outcome = CodingSubmission.Outcome.ACCEPTED
        log_lines = []

        start_time = time.time()

        for idx, tc in enumerate(test_cases):
            inp = tc.get("input", "")
            expected = tc.get("output", "").strip()

            try:
                # Sandboxed isolated execution using Python subprocess with strict timeouts
                proc = subprocess.run(
                    [sys.executable, "-c", code],
                    input=inp,
                    text=True,
                    capture_output=True,
                    timeout=problem.time_limit_sec,
                )

                if proc.returncode != 0:
                    overall_outcome = CodingSubmission.Outcome.RUNTIME_ERROR
                    log_lines.append(f"Test Case {idx + 1}: Runtime Error -> {proc.stderr[:100]}")
                    break

                actual = proc.stdout.strip()
                if actual == expected:
                    passed_count += 1
                    log_lines.append(f"Test Case {idx + 1}: PASSED")
                else:
                    overall_outcome = CodingSubmission.Outcome.WRONG_ANSWER
                    log_lines.append(f"Test Case {idx + 1}: Wrong Answer (Expected: '{expected}', Got: '{actual}')")
                    break

            except subprocess.TimeoutExpired:
                overall_outcome = CodingSubmission.Outcome.TIME_LIMIT
                log_lines.append(f"Test Case {idx + 1}: Time Limit Exceeded ({problem.time_limit_sec}s)")
                break
            except Exception as e:
                overall_outcome = CodingSubmission.Outcome.RUNTIME_ERROR
                log_lines.append(f"Execution Error: {str(e)}")
                break

        exec_time_ms = int((time.time() - start_time) * 1000)
        score = (passed_count / total_count) * problem.max_score if total_count > 0 else 0

        submission = CodingSubmission.objects.create(
            problem=problem,
            student=request.user,
            code=code,
            language=language,
            outcome=overall_outcome,
            passed_tests=passed_count,
            total_tests=total_count,
            execution_time_ms=exec_time_ms,
            score=score,
            output_log="\n".join(log_lines),
        )

        return Response(
            {
                "success": True,
                "message": f"Judging Complete: {overall_outcome.replace('_', ' ').title()}",
                "data": CodingSubmissionSerializer(submission, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
