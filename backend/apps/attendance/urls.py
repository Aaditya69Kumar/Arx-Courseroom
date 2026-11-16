"""
Attendance — URL Patterns
"""
from django.urls import path
from . import views

app_name = "attendance"

urlpatterns = [
    path("sessions/", views.AttendanceSessionListCreateView.as_view(), name="session-list-create"),
    path("sessions/<uuid:pk>/roll-call/", views.AttendanceRollCallView.as_view(), name="session-roll-call"),
    path("records/<uuid:pk>/correct/", views.AttendanceRecordCorrectionView.as_view(), name="record-correction"),
    path("my-summary/", views.StudentAttendanceSummaryView.as_view(), name="my-summary"),
]
