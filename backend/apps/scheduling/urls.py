"""
Scheduling — URL Patterns
"""
from django.urls import path
from . import views

app_name = "scheduling"

urlpatterns = [
    path("timetable/", views.TimetableListView.as_view(), name="timetable-list"),
    path("calendar/", views.CalendarEventListView.as_view(), name="calendar-list"),
]
