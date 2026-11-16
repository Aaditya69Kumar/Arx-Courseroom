"""
Automated tests for Part 2 — Courses, Join Codes, Permissions, and Materials.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.courses.models import Course, Enrollment
from apps.materials.models import CourseMaterial


class CourseRoomPart2Tests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.student = User.objects.create_user(
            email="test_student@arx.edu",
            password="password123",
            first_name="Test",
            last_name="Student",
            role="student",
        )
        self.instructor = User.objects.create_user(
            email="test_instructor@arx.edu",
            password="password123",
            first_name="Prof",
            last_name="Teacher",
            role="instructor",
        )
        self.other_instructor = User.objects.create_user(
            email="other_prof@arx.edu",
            password="password123",
            first_name="Other",
            last_name="Prof",
            role="instructor",
        )

        # Existing Course
        self.course = Course.objects.create(
            code="CS-500",
            title="Advanced Systems",
            instructor=self.instructor,
            join_code="SYS-500",
            allow_code_join=True,
            max_students=30,
        )

    def test_student_cannot_create_course(self):
        """Students must not be able to create courses through the API."""
        self.client.force_authenticate(user=self.student)
        resp = self.client.post("/api/v1/courses/", {
            "code": "CS-999",
            "title": "Hacked Course",
        })
        self.assertEqual(resp.status_code, 403)

    def test_instructor_can_create_course(self):
        """Instructors can create a course, which generates a join_code."""
        self.client.force_authenticate(user=self.instructor)
        resp = self.client.post("/api/v1/courses/", {
            "code": "CS-101",
            "title": "Intro to Programming",
            "section": "Section A",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.json()["success"])
        self.assertIsNotNone(resp.json()["data"]["join_code"])

    def test_student_can_join_course_by_code(self):
        """Student enters valid join code and gets enrolled."""
        self.client.force_authenticate(user=self.student)
        resp = self.client.post("/api/v1/courses/join/", {
            "code": "SYS-500",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        # Check enrollment exists in DB
        self.assertTrue(
            Enrollment.objects.filter(student=self.student, course=self.course, status="active").exists()
        )

    def test_student_cannot_join_with_invalid_code(self):
        """Invalid join code returns 404."""
        self.client.force_authenticate(user=self.student)
        resp = self.client.post("/api/v1/courses/join/", {
            "code": "NON-EXISTENT",
        })
        self.assertEqual(resp.status_code, 404)

    def test_student_cannot_upload_materials(self):
        """Student cannot publish materials via direct API request."""
        self.client.force_authenticate(user=self.student)
        resp = self.client.post("/api/v1/materials/", {
            "course": str(self.course.id),
            "title": "Unauthorized Leak",
        })
        self.assertEqual(resp.status_code, 403)

    def test_instructor_can_upload_materials_to_own_course(self):
        """Course instructor can upload materials."""
        self.client.force_authenticate(user=self.instructor)
        resp = self.client.post("/api/v1/materials/", {
            "course": str(self.course.id),
            "title": "Lecture 1 Notes",
            "topic": "Unit 1",
            "material_type": "document",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.json()["success"])

    def test_other_instructor_cannot_upload_to_another_course(self):
        """Instructor cannot modify or upload to a course they do not teach."""
        self.client.force_authenticate(user=self.other_instructor)
        resp = self.client.post("/api/v1/materials/", {
            "course": str(self.course.id),
            "title": "Intrusion Attempt",
        })
        self.assertEqual(resp.status_code, 403)

    def test_dashboard_summary_derived_stats(self):
        """Dashboard summary returns derived stats matching database records."""
        # Enroll student in course
        Enrollment.objects.create(student=self.student, course=self.course, status="active")
        self.client.force_authenticate(user=self.student)
        resp = self.client.get("/api/v1/courses/dashboard-summary/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()["data"]
        self.assertEqual(data["role"], "student")
        self.assertEqual(data["total_classes"], 1)
        self.assertEqual(data["active_classes"], 1)
