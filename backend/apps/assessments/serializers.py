"""
Assessments — Serializers for Assignments, Quizzes, Grading, and Coding Labs
"""
from rest_framework import serializers
from .models import (
    Assignment,
    Submission,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    CodingProblem,
    CodingSubmission,
)
from apps.accounts.serializers import UserSerializer


class SubmissionSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    assignment_title = serializers.CharField(source="assignment.title", read_only=True)
    max_score = serializers.IntegerField(source="assignment.max_score", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            "id",
            "receipt_id",
            "assignment",
            "assignment_title",
            "student",
            "content",
            "file",
            "file_url",
            "file_name",
            "file_size",
            "is_late",
            "submitted_at",
            "score",
            "feedback",
            "status",
            "graded_by",
            "graded_at",
            "max_score",
        ]
        read_only_fields = [
            "id",
            "receipt_id",
            "student",
            "submitted_at",
            "is_late",
            "graded_by",
            "graded_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None


class AssignmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    my_submission = serializers.SerializerMethodField()
    submissions_count = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "title",
            "description",
            "assessment_type",
            "submission_format",
            "due_date",
            "max_score",
            "weight",
            "late_submissions_allowed",
            "attachment",
            "attachment_name",
            "attachment_url",
            "status",
            "is_published",
            "my_submission",
            "submissions_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_attachment_url(self, obj):
        request = self.context.get("request")
        if obj.attachment:
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return None
        sub = obj.submissions.filter(student=request.user).first()
        if sub:
            return SubmissionSerializer(sub, context=self.context).data
        return None

    def get_submissions_count(self, obj):
        return obj.submissions.count()


# ============================================================================
# Quizzes
# ============================================================================

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "quiz",
            "question_text",
            "question_type",
            "options",
            "correct_answer",
            "explanation",
            "marks",
            "order",
        ]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        # SECURITY REQUIREMENT: Never expose correct answers or explanations to students
        # unless results have been officially released by the instructor!
        if request and request.user.is_authenticated and request.user.role == "student":
            if not instance.quiz.release_results:
                data.pop("correct_answer", None)
                data.pop("explanation", None)
        return data


class QuizSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    questions = QuizQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.SerializerMethodField()
    my_attempts = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            "id",
            "course",
            "course_code",
            "title",
            "description",
            "duration_minutes",
            "max_attempts",
            "due_date",
            "is_published",
            "release_results",
            "total_marks",
            "questions_count",
            "questions",
            "my_attempts",
            "created_at",
        ]
        read_only_fields = ["id", "total_marks", "created_at"]

    def get_questions_count(self, obj):
        return obj.questions.count()

    def get_my_attempts(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return []
        attempts = obj.attempts.filter(student=request.user)
        return [
            {
                "id": str(att.id),
                "attempt_number": att.attempt_number,
                "score": att.score if obj.release_results else None,
                "max_score": att.max_score,
                "completed_at": att.completed_at,
                "status": att.status,
            }
            for att in attempts
        ]


class QuizAttemptSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "student",
            "answers",
            "score",
            "max_score",
            "attempt_number",
            "status",
            "started_at",
            "completed_at",
        ]
        read_only_fields = ["id", "student", "score", "max_score", "started_at"]


# ============================================================================
# Coding Labs
# ============================================================================

class CodingProblemSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source="course.code", read_only=True)
    my_latest_submission = serializers.SerializerMethodField()

    class Meta:
        model = CodingProblem
        fields = [
            "id",
            "course",
            "course_code",
            "title",
            "description",
            "difficulty",
            "time_limit_sec",
            "memory_limit_mb",
            "sample_input",
            "sample_output",
            "hidden_test_cases",
            "max_score",
            "supported_languages",
            "due_date",
            "my_latest_submission",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        # Hide hidden test cases from students!
        if request and request.user.is_authenticated and request.user.role == "student":
            data.pop("hidden_test_cases", None)
        return data

    def get_my_latest_submission(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return None
        sub = obj.submissions.filter(student=request.user).first()
        if sub:
            return {
                "id": str(sub.id),
                "outcome": sub.outcome,
                "passed_tests": sub.passed_tests,
                "total_tests": sub.total_tests,
                "score": sub.score,
                "submitted_at": sub.submitted_at,
            }
        return None


class CodingSubmissionSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    problem_title = serializers.CharField(source="problem.title", read_only=True)

    class Meta:
        model = CodingSubmission
        fields = [
            "id",
            "problem",
            "problem_title",
            "student",
            "code",
            "language",
            "outcome",
            "passed_tests",
            "total_tests",
            "execution_time_ms",
            "score",
            "output_log",
            "submitted_at",
        ]
        read_only_fields = [
            "id",
            "student",
            "outcome",
            "passed_tests",
            "total_tests",
            "execution_time_ms",
            "score",
            "output_log",
            "submitted_at",
        ]
