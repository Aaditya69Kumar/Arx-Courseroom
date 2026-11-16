"""
Communication — Unit and Integration Tests
"""
from rest_framework.test import APITestCase
from rest_framework import status

from apps.accounts.models import User
from apps.courses.models import Course, Enrollment
from apps.communication.models import (
    ForumTopic,
    ForumReply,
    ShortActivity,
    AnonymousFeedback,
    Notification,
    HelpDeskTicket,
)


class CommunicationWorkflowTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email="prof_comm@arx.edu",
            password="pass12345",
            role="instructor",
            first_name="Prof",
            last_name="Comm",
        )
        self.student = User.objects.create_user(
            email="student_comm@arx.edu",
            password="pass12345",
            role="student",
            first_name="Student",
            last_name="Comm",
        )
        self.course = Course.objects.create(
            code="COMM-101",
            title="Communication Course",
            instructor=self.instructor,
        )
        Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status=Enrollment.Status.ACTIVE,
        )

    def test_forum_topic_and_accepted_answer(self):
        self.client.force_authenticate(user=self.student)
        # Create topic
        resp = self.client.post("/api/v1/communication/forum/", {
            "course": str(self.course.id),
            "title": "Need help with Lab 1",
            "content": "How do we handle split-brain elections?",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        topic_id = resp.data["data"]["id"]

        # Instructor replies
        self.client.force_authenticate(user=self.instructor)
        reply_resp = self.client.post(f"/api/v1/communication/forum/{topic_id}/reply/", {
            "content": "Quorum requirements prevent split brains.",
        })
        self.assertEqual(reply_resp.status_code, status.HTTP_201_CREATED)
        reply_id = reply_resp.data["data"]["id"]

        # Accept answer
        accept_resp = self.client.patch(f"/api/v1/communication/forum/replies/{reply_id}/accept/")
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(accept_resp.data["data"]["is_accepted_answer"])

    def test_strictly_anonymous_feedback(self):
        self.client.force_authenticate(user=self.student)
        resp = self.client.post("/api/v1/communication/anonymous-feedback/", {
            "course": str(self.course.id),
            "category": "pacing",
            "rating": 5,
            "feedback_text": "Great lectures!",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        # Verify database record has ZERO student foreign key or identifier
        fb = AnonymousFeedback.objects.get(pk=resp.data["data"]["id"])
        self.assertFalse(hasattr(fb, "student"))
        self.assertFalse(hasattr(fb, "user"))

        # Instructor reads aggregated feedback
        self.client.force_authenticate(user=self.instructor)
        get_resp = self.client.get(f"/api/v1/communication/anonymous-feedback/?course_id={self.course.id}")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["data"]["total_submissions"], 1)

    def test_notifications_and_read(self):
        notif = Notification.objects.create(
            recipient=self.student,
            title="Class Postponed",
            message="Class begins at 11am today.",
        )
        self.client.force_authenticate(user=self.student)
        resp = self.client.get("/api/v1/communication/notifications/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["data"]["unread_count"], 1)

        patch_resp = self.client.patch(f"/api/v1/communication/notifications/{notif.id}/read/")
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
