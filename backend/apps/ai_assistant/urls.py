"""
AI Assistant — URL Patterns
"""
from django.urls import path
from . import views

app_name = "ai_assistant"

urlpatterns = [
    path("studio/", views.AIStudioDraftListCreateView.as_view(), name="studio-drafts"),
    path("studio/<uuid:pk>/", views.AIStudioDraftDetailView.as_view(), name="studio-draft-detail"),
    path("studio/<uuid:pk>/publish/", views.AIStudioDraftPublishView.as_view(), name="studio-draft-publish"),
    path("playground/", views.AIPlaygroundView.as_view(), name="playground"),
]
