"""
Arx CourseRoom — API Router (v1)
All app-level API URL includes live here.
"""
from django.urls import path, include
from apps.core.views import HealthCheckView

app_name = "api-v1"

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("auth/", include("apps.accounts.urls")),
    path("courses/", include("apps.courses.urls")),
    path("materials/", include("apps.materials.urls")),
    path("assessments/", include("apps.assessments.urls")),
    path("scheduling/", include("apps.scheduling.urls")),
    path("attendance/", include("apps.attendance.urls")),
    path("communication/", include("apps.communication.urls")),
    path("ai/", include("apps.ai_assistant.urls")),
]
