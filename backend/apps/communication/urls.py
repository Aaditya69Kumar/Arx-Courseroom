"""
Communication — URL Patterns
"""
from django.urls import path
from . import views

app_name = "communication"

urlpatterns = [
    # Forum
    path("forum/", views.ForumTopicListCreateView.as_view(), name="forum-topics"),
    path("forum/<uuid:pk>/", views.ForumTopicDetailView.as_view(), name="forum-topic-detail"),
    path("forum/<uuid:topic_id>/reply/", views.ForumReplyCreateView.as_view(), name="forum-reply-create"),
    path("forum/replies/<uuid:pk>/accept/", views.AcceptForumAnswerView.as_view(), name="forum-reply-accept"),
    
    # Shorts (Polls)
    path("shorts/", views.ShortActivityListCreateView.as_view(), name="shorts-list-create"),
    path("shorts/<uuid:pk>/respond/", views.ShortResponseView.as_view(), name="short-respond"),
    
    # Forms & Anonymous Feedback
    path("forms/", views.CourseFormListCreateView.as_view(), name="forms-list-create"),
    path("forms/<uuid:pk>/submit/", views.CourseFormSubmitView.as_view(), name="form-submit"),
    path("forms/<uuid:pk>/responses/", views.CourseFormSubmitView.as_view(), name="form-responses"),
    path("anonymous-feedback/", views.AnonymousFeedbackView.as_view(), name="anonymous-feedback"),
    
    # Notifications & Help Desk
    path("notifications/", views.NotificationListView.as_view(), name="notifications-list"),
    path("notifications/<uuid:pk>/read/", views.NotificationListView.as_view(), name="notification-mark-read"),
    path("notifications/read-all/", views.NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    path("tickets/", views.HelpDeskTicketListCreateView.as_view(), name="tickets-list-create"),
]
