"""
Accounts — Tests
"""
from django.test import TestCase
from rest_framework.test import APIClient
from .models import User


class UserModelTest(TestCase):
    def test_create_student(self):
        user = User.objects.create_user(
            email="student@university.edu",
            password="testpass123",
            first_name="Jane",
            last_name="Doe",
            role="student",
        )
        self.assertEqual(user.email, "student@university.edu")
        self.assertTrue(user.is_student)
        self.assertFalse(user.is_instructor)

    def test_create_instructor(self):
        user = User.objects.create_user(
            email="prof@university.edu",
            password="testpass123",
            first_name="John",
            last_name="Smith",
            role="instructor",
        )
        self.assertTrue(user.is_instructor)

    def test_create_superuser(self):
        user = User.objects.create_superuser(
            email="admin@university.edu",
            password="adminpass123",
            first_name="Admin",
            last_name="User",
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.role, "admin")


class AuthAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            email="student@test.edu",
            password="testpass123",
            first_name="Test",
            last_name="Student",
            role="student",
        )
        self.instructor = User.objects.create_user(
            email="prof@test.edu",
            password="testpass123",
            first_name="Test",
            last_name="Prof",
            role="instructor",
        )

    def test_login_success(self):
        resp = self.client.post("/api/v1/auth/login/", {
            "email": "student@test.edu",
            "password": "testpass123",
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertEqual(resp.json()["data"]["user"]["role"], "student")

    def test_login_wrong_portal(self):
        """Student trying to login as instructor should be rejected."""
        resp = self.client.post("/api/v1/auth/login/", {
            "email": "student@test.edu",
            "password": "testpass123",
            "expected_role": "instructor",
        })
        self.assertNotEqual(resp.status_code, 200)

    def test_login_wrong_password(self):
        resp = self.client.post("/api/v1/auth/login/", {
            "email": "student@test.edu",
            "password": "wrongpassword",
        })
        self.assertNotEqual(resp.status_code, 200)

    def test_me_unauthenticated(self):
        resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 401)

    def test_me_authenticated(self):
        # Login first
        login = self.client.post("/api/v1/auth/login/", {
            "email": "student@test.edu",
            "password": "testpass123",
        })
        token = login.json()["data"]["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["email"], "student@test.edu")

    def test_health_check(self):
        resp = self.client.get("/api/v1/health/")
        self.assertEqual(resp.status_code, 200)
