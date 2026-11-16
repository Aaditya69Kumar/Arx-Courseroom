"""
Materials — Serializers
"""
from rest_framework import serializers
from .models import CourseMaterial
from apps.accounts.serializers import UserSerializer


class CourseMaterialSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaterial
        fields = [
            "id",
            "course",
            "course_code",
            "course_title",
            "uploader",
            "title",
            "description",
            "topic",
            "material_type",
            "file",
            "file_url",
            "file_name",
            "file_size",
            "file_type",
            "notebook_content",
            "video_url",
            "link_url",
            "is_published",
            "ai_indexed",
            "ai_indexed_at",
            "page_count",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "uploader",
            "file_name",
            "file_size",
            "file_type",
            "ai_indexed",
            "ai_indexed_at",
            "created_at",
            "updated_at",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class CourseMaterialUploadSerializer(serializers.ModelSerializer):
    """Used by faculty to upload or update course materials."""
    file = serializers.FileField(required=False, allow_null=True)
    video_url = serializers.CharField(required=False, allow_blank=True)
    link_url = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CourseMaterial
        fields = [
            "id",
            "course",
            "title",
            "description",
            "topic",
            "material_type",
            "file",
            "video_url",
            "link_url",
            "is_published",
        ]
        read_only_fields = ["id"]

    def validate_file(self, value):
        if value:
            # Check maximum size, e.g. 50MB
            max_size = 50 * 1024 * 1024
            if value.size > max_size:
                raise serializers.ValidationError("File size cannot exceed 50MB.")
        return value
