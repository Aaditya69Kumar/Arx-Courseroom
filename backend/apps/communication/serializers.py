"""
Communication — Serializers for Forums, Shorts, Forms, Anonymous Feedback, Notifications, and Help Desk
"""
from rest_framework import serializers
from .models import (
    ForumTopic,
    ForumReply,
    ShortActivity,
    ShortResponse,
    CourseForm,
    FormResponse,
    AnonymousFeedback,
    Notification,
    HelpDeskTicket,
)
from apps.accounts.serializers import UserSerializer


class ForumReplySerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = ForumReply
        fields = [
            "id",
            "topic",
            "author",
            "content",
            "is_accepted_answer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class ForumTopicSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = ForumReplySerializer(many=True, read_only=True)
    replies_count = serializers.IntegerField(source="replies.count", read_only=True)

    class Meta:
        model = ForumTopic
        fields = [
            "id",
            "course",
            "author",
            "title",
            "content",
            "is_pinned",
            "is_resolved",
            "is_locked",
            "replies_count",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class ShortResponseSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)

    class Meta:
        model = ShortResponse
        fields = ["id", "short", "student", "selected_option", "responded_at"]
        read_only_fields = ["id", "student", "responded_at"]


class ShortActivitySerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    response_stats = serializers.SerializerMethodField()
    has_responded = serializers.SerializerMethodField()
    my_response = serializers.SerializerMethodField()

    class Meta:
        model = ShortActivity
        fields = [
            "id",
            "course",
            "author",
            "title",
            "prompt",
            "options",
            "is_active",
            "response_stats",
            "has_responded",
            "my_response",
            "created_at",
        ]
        read_only_fields = ["id", "author", "created_at"]

    def get_response_stats(self, obj):
        stats = {opt: 0 for opt in obj.options}
        for resp in obj.responses.all():
            if resp.selected_option in stats:
                stats[resp.selected_option] += 1
            else:
                stats[resp.selected_option] = 1
        return stats

    def get_has_responded(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "student":
            return obj.responses.filter(student=request.user).exists()
        return False

    def get_my_response(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "student":
            resp = obj.responses.filter(student=request.user).first()
            return resp.selected_option if resp else None
        return None


class FormResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormResponse
        fields = ["id", "form", "answers", "submitted_at"]
        read_only_fields = ["id", "submitted_at"]


class CourseFormSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    responses_count = serializers.IntegerField(source="responses.count", read_only=True)
    has_submitted = serializers.SerializerMethodField()

    class Meta:
        model = CourseForm
        fields = [
            "id",
            "course",
            "creator",
            "title",
            "description",
            "questions",
            "deadline",
            "is_active",
            "responses_count",
            "has_submitted",
            "created_at",
        ]
        read_only_fields = ["id", "creator", "created_at"]

    def get_has_submitted(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated and request.user.role == "student":
            return obj.responses.filter(respondent=request.user).exists()
        return False


class AnonymousFeedbackSerializer(serializers.ModelSerializer):
    """
    CRITICAL: Does not accept or serialize any student identifying data.
    """

    class Meta:
        model = AnonymousFeedback
        fields = [
            "id",
            "course",
            "category",
            "rating",
            "feedback_text",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "recipient",
            "title",
            "message",
            "link",
            "notification_type",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "recipient", "created_at"]


class HelpDeskTicketSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = HelpDeskTicket
        fields = [
            "id",
            "user",
            "ticket_type",
            "subject",
            "description",
            "status",
            "resolution_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]
