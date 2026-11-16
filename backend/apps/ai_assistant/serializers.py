"""
AI Assistant — Serializers
"""
from rest_framework import serializers
from .models import AIGeneratedDraft, AIPlaygroundPrompt
from apps.accounts.serializers import UserSerializer


class AIGeneratedDraftSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)

    class Meta:
        model = AIGeneratedDraft
        fields = [
            "id",
            "course",
            "course_code",
            "author",
            "draft_type",
            "title",
            "prompt",
            "generated_content",
            "edited_content",
            "is_approved",
            "published_target",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class AIPlaygroundPromptSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AIPlaygroundPrompt
        fields = [
            "id",
            "user",
            "system_prompt",
            "user_prompt",
            "model_name",
            "temperature",
            "response_text",
            "created_at",
        ]
        read_only_fields = ["id", "user", "response_text", "created_at"]
