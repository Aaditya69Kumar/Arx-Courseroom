"""
Courses — Serializers
"""
from rest_framework import serializers
from .models import Course, Enrollment, Announcement
from apps.accounts.serializers import UserSerializer


class CourseSerializer(serializers.ModelSerializer):
    """Full course representation with computed properties."""

    instructor = UserSerializer(read_only=True)
    enrollment_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    my_enrollment_status = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "description",
            "section",
            "semester",
            "year",
            "instructor",
            "status",
            "is_active",
            "join_code",
            "allow_code_join",
            "max_students",
            "cover_color",
            "schedule_info",
            "room_location",
            "enrollment_count",
            "is_enrolled",
            "my_enrollment_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "instructor", "enrollment_count", "created_at", "updated_at"]

    def get_is_enrolled(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.role != "student":
            return False
        return obj.enrollments.filter(student=request.user, status=Enrollment.Status.ACTIVE).exists()

    def get_my_enrollment_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or request.user.role != "student":
            return None
        enrollment = obj.enrollments.filter(student=request.user).first()
        return enrollment.status if enrollment else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        # Hide join_code from students if desired, or keep it visible only if enrolled/instructor
        if request and request.user.is_authenticated and request.user.role == "student":
            # Student can only see join_code if already enrolled
            if not data.get("is_enrolled"):
                data["join_code"] = None
        return data


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    """Used by instructors to create and edit classrooms."""

    class Meta:
        model = Course
        fields = [
            "id",
            "code",
            "title",
            "description",
            "section",
            "semester",
            "year",
            "status",
            "is_active",
            "join_code",
            "allow_code_join",
            "max_students",
            "cover_color",
            "schedule_info",
            "room_location",
        ]
        read_only_fields = ["id"]

    def validate_code(self, value):
        value = value.strip().upper()
        # If updating, exclude self
        course_id = self.instance.id if self.instance else None
        qs = Course.objects.filter(code__iexact=value)
        if course_id:
            qs = qs.exclude(id=course_id)
        if qs.exists():
            raise serializers.ValidationError(f"Course code '{value}' is already in use.")
        return value


class JoinCourseSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, trim_whitespace=True)

    def validate_code(self, value):
        return value.strip().upper()


class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "course",
            "course_code",
            "course_title",
            "status",
            "enrolled_at",
        ]
        read_only_fields = ["id", "enrolled_at"]


class AnnouncementSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "course",
            "author",
            "title",
            "content",
            "is_pinned",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "course", "author", "created_at", "updated_at"]
