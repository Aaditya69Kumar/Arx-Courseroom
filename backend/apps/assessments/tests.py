"""
Assessments — Unit and Integration Tests
"""
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import User
from apps.courses.models import Course, Enrollment
from apps.assessments.models import (
    Assignment,
    Submission,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    CodingProblem,
    CodingSubmission,
)


class AssessmentWorkflowTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email="prof_test@arx.edu",
            password="pass12345",
            role="instructor",
            first_name="Prof",
            last_name="Test",
        )
        self.student = User.objects.create_user(
            email="student_test@arx.edu",
            password="pass12345",
            role="student",
            first_name="Student",
            last_name="Test",
        )
        self.course = Course.objects.create(
            code="TEST-101",
            title="Test Course",
            instructor=self.instructor,
        )
        Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status=Enrollment.Status.ACTIVE,
        )

    def test_assignment_submission_and_receipt(self):
        assignment = Assignment.objects.create(
            course=self.course,
            title="Homework 1",
            due_date=timezone.now() + timedelta(days=2),
            is_published=True,
        )

        self.client.force_authenticate(user=self.student)
        url = f"/api/v1/assessments/{assignment.id}/submit/"
        resp = self.client.post(url, {"content": "Here is my solution."})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        receipt = resp.data["data"]["receipt_id"]
        self.assertTrue(receipt.startswith("SUB-"))

        # Instructor grades submission
        submission_id = resp.data["data"]["id"]
        self.client.force_authenticate(user=self.instructor)
        grade_url = f"/api/v1/assessments/submissions/{submission_id}/grade/"
        grade_resp = self.client.post(grade_url, {"score": 95, "feedback": "Excellent work!"})

        self.assertEqual(grade_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(float(grade_resp.data["data"]["score"]), 95.0)
        self.assertEqual(grade_resp.data["data"]["feedback"], "Excellent work!")


    def test_late_submission_rule(self):
        past_assignment = Assignment.objects.create(
            course=self.course,
            title="Strict Past Assignment",
            due_date=timezone.now() - timedelta(days=2),
            late_submissions_allowed=False,
            is_published=True,
        )

        self.client.force_authenticate(user=self.student)
        url = f"/api/v1/assessments/{past_assignment.id}/submit/"
        resp = self.client.post(url, {"content": "Late attempt"})

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(resp.data["success"])

    def test_quiz_attempt_and_auto_grading(self):
        quiz = Quiz.objects.create(
            course=self.course,
            title="Mini Quiz",
            duration_minutes=15,
            release_results=True,
            is_published=True,
        )
        q1 = QuizQuestion.objects.create(
            quiz=quiz,
            question_text="Is Python dynamically typed?",
            question_type=QuizQuestion.QuestionType.TRUE_FALSE,
            options=["True", "False"],
            correct_answer="True",
            marks=10,
        )
        q2 = QuizQuestion.objects.create(
            quiz=quiz,
            question_text="What is 2 + 2?",
            question_type=QuizQuestion.QuestionType.MCQ,
            options=["3", "4", "5"],
            correct_answer="4",
            marks=10,
        )

        self.client.force_authenticate(user=self.student)
        url = f"/api/v1/assessments/quizzes/{quiz.id}/attempt/"
        payload = {
            "answers": {
                str(q1.id): "True",
                str(q2.id): "4",
            }
        }
        resp = self.client.post(url, payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["data"]["score"], 20.0)

    def test_sandboxed_coding_execution(self):
        problem = CodingProblem.objects.create(
            course=self.course,
            title="Double Input Lab",
            description="Read int and print double",
            time_limit_sec=2,
            sample_input="5",
            sample_output="10",
            hidden_test_cases=[{"input": "8", "output": "16"}],
            max_score=20,
        )

        self.client.force_authenticate(user=self.student)
        url = f"/api/v1/assessments/coding/{problem.id}/submit/"
        code = "n = int(input().strip())\nprint(n * 2)"
        resp = self.client.post(url, {"code": code, "language": "python"})

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["data"]["outcome"], "accepted")
        self.assertEqual(resp.data["data"]["passed_tests"], 2)
        self.assertEqual(float(resp.data["data"]["score"]), 20.0)

