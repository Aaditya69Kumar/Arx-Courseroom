"""
Courses — URL Patterns
"""
from django.urls import path
from . import views

app_name = "courses"

urlpatterns = [
    path("", views.CourseListCreateView.as_view(), name="course-list-create"),
    path("join/", views.JoinCourseView.as_view(), name="course-join"),
    path("dashboard-summary/", views.DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("<uuid:pk>/", views.CourseDetailView.as_view(), name="course-detail"),
    path("<uuid:pk>/participants/", views.CourseParticipantsView.as_view(), name="course-participants"),
    path("<uuid:pk>/leaderboard/", views.CourseLeaderboardView.as_view(), name="course-leaderboard"),
    path("<uuid:pk>/analytics/", views.CourseAnalyticsView.as_view(), name="course-analytics"),
    path("<uuid:course_id>/announcements/", views.AnnouncementListCreateView.as_view(), name="course-announcements"),
]

