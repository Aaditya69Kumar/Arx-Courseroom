"""
Communication — API Views for Forum, Shorts, Forms, Anonymous Feedback, Notifications, and Help Desk
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Avg, Count

from .models import (
    ForumTopic,
    ForumReply,
    ShortActivity,
    ShortResponse,
    CourseForm,
    FormResponse,
    AnonymousFeedback,
    Notification,
    HelpDeskTicket,
)
from .serializers import (
    ForumTopicSerializer,
    ForumReplySerializer,
    ShortActivitySerializer,
    ShortResponseSerializer,
    CourseFormSerializer,
    FormResponseSerializer,
    AnonymousFeedbackSerializer,
    NotificationSerializer,
    HelpDeskTicketSerializer,
)
from apps.courses.models import Course, Enrollment


# ============================================================================
# 1. Course Discussion Forum
# ============================================================================

class ForumTopicListCreateView(APIView):
    """
    GET  /api/v1/communication/forum/ — List forum topics with course filter & search.
    POST /api/v1/communication/forum/ — Create new discussion topic.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        search = request.query_params.get("search", "").strip()

        qs = ForumTopic.objects.select_related("course", "author").prefetch_related("replies__author").all()

        if course_id:
            qs = qs.filter(course_id=course_id)

        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))

        serializer = ForumTopicSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        course_id = request.data.get("course")
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course not found.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check enrollment or instructor
        if request.user.role == "student":
            is_enrolled = Enrollment.objects.filter(student=request.user, course=course, status=Enrollment.Status.ACTIVE).exists()
            if not is_enrolled:
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN", "message": "Must be enrolled to start discussions.", "details": []}},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = ForumTopicSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        topic = serializer.save(author=request.user)

        return Response(
            {
                "success": True,
                "message": "Discussion topic published.",
                "data": ForumTopicSerializer(topic, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ForumTopicDetailView(APIView):
    """
    GET   /api/v1/communication/forum/<pk>/ — Retrieve discussion thread.
    PATCH /api/v1/communication/forum/<pk>/ — Pin, lock, or resolve thread.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            topic = ForumTopic.objects.select_related("course", "author").prefetch_related("replies__author").get(pk=pk)
        except ForumTopic.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Discussion topic not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ForumTopicSerializer(topic, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def patch(self, request, pk):
        try:
            topic = ForumTopic.objects.select_related("course").get(pk=pk)
        except ForumTopic.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Discussion topic not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only author or instructor can edit status
        is_instructor = (request.user == topic.course.instructor or request.user.role == "admin")
        if request.user != topic.author and not is_instructor:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        if "is_pinned" in request.data and not is_instructor:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can pin topics.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        for field in ["is_pinned", "is_resolved", "is_locked"]:
            if field in request.data:
                setattr(topic, field, request.data[field])

        topic.save()
        return Response({
            "success": True,
            "message": "Topic status updated.",
            "data": ForumTopicSerializer(topic, context={"request": request}).data,
        })


class ForumReplyCreateView(APIView):
    """
    POST  /api/v1/communication/forum/<topic_id>/reply/ — Post reply to topic.
    PATCH /api/v1/communication/forum/reply/<pk>/accept/ — Accept answer.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, topic_id):
        try:
            topic = ForumTopic.objects.select_related("course").get(pk=topic_id)
        except ForumTopic.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Topic not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if topic.is_locked:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "This discussion has been locked.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Reply content is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reply = ForumReply.objects.create(topic=topic, author=request.user, content=content)
        return Response(
            {
                "success": True,
                "message": "Reply posted.",
                "data": ForumReplySerializer(reply).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AcceptForumAnswerView(APIView):
    """
    PATCH /api/v1/communication/forum/replies/<pk>/accept/
    Marks a reply as the accepted verified answer (Instructor or Topic Author).
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            reply = ForumReply.objects.select_related("topic__course", "topic__author").get(pk=pk)
        except ForumReply.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Reply not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        topic = reply.topic
        is_instructor = (request.user == topic.course.instructor or request.user.role == "admin")
        is_author = (request.user == topic.author)

        if not is_instructor and not is_author:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author or instructor can accept answers.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Clear other accepted answers in this topic
        topic.replies.update(is_accepted_answer=False)
        reply.is_accepted_answer = True
        reply.save()

        topic.is_resolved = True
        topic.save()

        return Response({
            "success": True,
            "message": "Answer verified and accepted.",
            "data": ForumReplySerializer(reply).data,
        })


# ============================================================================
# 2. Shorts (Quick Classroom Polls)
# ============================================================================

class ShortActivityListCreateView(APIView):
    """
    GET  /api/v1/communication/shorts/ — List shorts for course.
    POST /api/v1/communication/shorts/ — Create short poll (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        qs = ShortActivity.objects.select_related("course", "author").prefetch_related("responses").all()

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = ShortActivitySerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only instructors can launch classroom shorts.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ShortActivitySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        short = serializer.save(author=request.user)

        return Response(
            {
                "success": True,
                "message": f"Short activity '{short.title}' launched.",
                "data": ShortActivitySerializer(short, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ShortResponseView(APIView):
    """
    POST /api/v1/communication/shorts/<pk>/respond/
    Submit response to quick classroom activity.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can respond to polls.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            short = ShortActivity.objects.get(pk=pk)
        except ShortActivity.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Short activity not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not short.is_active:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "This activity has concluded.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected_option = request.data.get("selected_option")
        if not selected_option:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Selection required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resp, created = ShortResponse.objects.update_or_create(
            short=short,
            student=request.user,
            defaults={"selected_option": selected_option},
        )

        return Response({
            "success": True,
            "message": "Response recorded.",
            "data": ShortActivitySerializer(short, context={"request": request}).data,
        })


# ============================================================================
# 3. Forms & Strictly Anonymous Feedback
# ============================================================================

class CourseFormListCreateView(APIView):
    """
    GET  /api/v1/communication/forms/ — List forms for course.
    POST /api/v1/communication/forms/ — Create feedback form (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        qs = CourseForm.objects.select_related("course", "creator").prefetch_related("responses").all()

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = CourseFormSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only instructors can create course forms.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CourseFormSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        form = serializer.save(creator=request.user)

        return Response(
            {
                "success": True,
                "message": f"Form '{form.title}' created.",
                "data": CourseFormSerializer(form, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CourseFormSubmitView(APIView):
    """
    POST /api/v1/communication/forms/<pk>/submit/ — Submit answers to a form.
    GET  /api/v1/communication/forms/<pk>/responses/ — View aggregated responses (Instructor).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            form = CourseForm.objects.get(pk=pk)
        except CourseForm.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Form not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        answers = request.data.get("answers", {})
        response_obj, created = FormResponse.objects.update_or_create(
            form=form,
            respondent=request.user,
            defaults={"answers": answers},
        )

        return Response({
            "success": True,
            "message": "Form answers submitted successfully.",
            "data": FormResponseSerializer(response_obj).data,
        })

    def get(self, request, pk):
        try:
            form = CourseForm.objects.select_related("course").get(pk=pk)
        except CourseForm.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Form not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != form.creator and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the form creator can view responses.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        responses = form.responses.all()
        return Response({
            "success": True,
            "data": {
                "form_title": form.title,
                "total_responses": responses.count(),
                "responses": FormResponseSerializer(responses, many=True).data,
            }
        })


class AnonymousFeedbackView(APIView):
    """
    GET  /api/v1/communication/anonymous-feedback/ — View aggregated feedback (Instructor/Admin).
    POST /api/v1/communication/anonymous-feedback/ — Submit feedback (Identity strictly withheld).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "course_id query param is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only instructor or admin can view feedback
        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Access restricted.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        feedbacks = AnonymousFeedback.objects.filter(course=course)
        avg_rating = feedbacks.aggregate(Avg("rating"))["rating__avg"] or 5.0

        return Response({
            "success": True,
            "data": {
                "course_code": course.code,
                "total_submissions": feedbacks.count(),
                "average_rating": round(avg_rating, 1),
                "feedbacks": AnonymousFeedbackSerializer(feedbacks, many=True).data,
            }
        })

    def post(self, request):
        """
        Submits feedback without saving ANY reference to request.user.
        Only actively enrolled students may submit feedback.
        """
        if request.user.role != "student":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only enrolled students can submit anonymous feedback.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.data.get("course")
        if not course_id:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Course is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            course_id=course_id,
            status=Enrollment.Status.ACTIVE,
        ).exists()
        if not is_enrolled:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You must be actively enrolled in this course to submit feedback.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnonymousFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fb = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Your anonymous feedback has been recorded safely. Your identity is mathematically protected.",
                "data": AnonymousFeedbackSerializer(fb).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================================
# 4. Notifications & Help Desk Tickets
# ============================================================================

class NotificationListView(APIView):
    """
    GET   /api/v1/communication/notifications/ — List user's notifications.
    PATCH /api/v1/communication/notifications/<pk>/read/ — Mark specific notification as read.
    POST  /api/v1/communication/notifications/read-all/ — Mark all as read.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_notifications = Notification.objects.filter(recipient=request.user)
        unread_count = user_notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(user_notifications[:20], many=True)

        return Response({
            "success": True,
            "data": {
                "unread_count": unread_count,
                "notifications": serializer.data,
            }
        })

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Notification not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save()
        return Response({"success": True, "message": "Marked as read."})


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"success": True, "message": "All notifications marked as read."})


class HelpDeskTicketListCreateView(APIView):
    """
    GET  /api/v1/communication/tickets/ — List tickets (User sees theirs; Admins see all).
    POST /api/v1/communication/tickets/ — Submit bug, suggestion, or help request.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == "admin":
            qs = HelpDeskTicket.objects.select_related("user").all()
        else:
            qs = HelpDeskTicket.objects.filter(user=request.user)

        serializer = HelpDeskTicketSerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        serializer = HelpDeskTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(user=request.user)

        return Response(
            {
                "success": True,
                "message": f"Support ticket #{str(ticket.id)[:8]} received. Academic IT will respond shortly.",
                "data": HelpDeskTicketSerializer(ticket).data,
            },
            status=status.HTTP_201_CREATED,
        )
