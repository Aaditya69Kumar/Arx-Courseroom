"""
Attendance — Serializers
"""
from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord
from apps.accounts.serializers import UserSerializer


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    modified_by = UserSerializer(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "session",
            "student",
            "status",
            "remarks",
            "marked_at",
            "modified_by",
            "audit_note",
        ]
        read_only_fields = ["id", "marked_at", "modified_by"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    total_marked = serializers.IntegerField(source="records.count", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            "id",
            "course",
            "date",
            "topic",
            "created_by",
            "created_at",
            "total_marked",
            "records",
        ]
        read_only_fields = ["id", "created_by", "created_at"]
