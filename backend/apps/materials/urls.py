"""
Materials — URL Patterns
"""
from django.urls import path
from . import views

app_name = "materials"

urlpatterns = [
    path("", views.CourseMaterialListCreateView.as_view(), name="material-list-create"),
    path("<uuid:pk>/", views.CourseMaterialDetailView.as_view(), name="material-detail"),
    path("<uuid:pk>/download/", views.CourseMaterialDownloadView.as_view(), name="material-download"),
    path("<uuid:pk>/index/", views.TriggerMaterialVectorIndexView.as_view(), name="material-index"),
]
