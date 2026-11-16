"""
Assessments — URL Patterns for Assignments, Submissions, Quizzes, Grading, and Coding Labs
"""
from django.urls import path
from . import views

app_name = "assessments"

urlpatterns = [
    # Progress & Dashboard
    path("my-progress/", views.StudentProgressSummaryView.as_view(), name="student-progress"),

    # Assignments
    path("", views.AssignmentListCreateView.as_view(), name="assignment-list-create"),
    path("<uuid:pk>/", views.AssignmentDetailView.as_view(), name="assignment-detail"),
    path("<uuid:pk>/submit/", views.AssignmentSubmissionView.as_view(), name="assignment-submit"),
    path("<uuid:pk>/submissions/", views.AssignmentSubmissionsListView.as_view(), name="assignment-submissions"),
    
    # Grading & Gradebook
    path("submissions/<uuid:pk>/grade/", views.GradeSubmissionView.as_view(), name="submission-grade"),
    path("courses/<uuid:course_id>/gradebook/", views.ConsolidatedGradebookView.as_view(), name="course-gradebook"),
    
    # Quizzes
    path("quizzes/", views.QuizListCreateView.as_view(), name="quiz-list-create"),
    path("quizzes/<uuid:pk>/attempt/", views.QuizAttemptView.as_view(), name="quiz-attempt"),
    path("quizzes/<uuid:pk>/attempts/", views.QuizAttemptsListView.as_view(), name="quiz-attempts"),
    
    # Coding Labs
    path("coding/", views.CodingProblemListCreateView.as_view(), name="coding-problem-list-create"),
    path("coding/<uuid:pk>/submit/", views.CodingSubmissionJudgeView.as_view(), name="coding-submission-judge"),
]
