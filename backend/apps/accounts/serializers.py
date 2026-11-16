"""
Accounts — Serializers for auth and user management.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.conf import settings
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Public user representation — never includes password."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "institution_id",
            "department",
            "avatar_url",
            "phone",
            "bio",
            "created_at",
        ]
        read_only_fields = ["id", "email", "role", "created_at"]


class LoginSerializer(serializers.Serializer):
    """
    Login — accepts email + password.
    The optional 'expected_role' field is purely informational; the server
    authenticates then returns the user's ACTUAL role. If the user's real
    role doesn't match the expected one, login is rejected.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    expected_role = serializers.ChoiceField(
        choices=["student", "instructor"],
        required=False,
        help_text="Hint from the login page; server verifies actual role.",
    )

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        expected_role = attrs.get("expected_role")

        user = authenticate(username=email, password=password)

        if user is None:
            raise serializers.ValidationError(
                {"detail": "Invalid email or password."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account has been deactivated."}
            )

        # Role gate: if the user picked a login portal, confirm their role
        if expected_role and user.role != expected_role:
            if expected_role == "instructor" and user.role == "admin":
                pass  # admins may use the instructor portal
            else:
                raise serializers.ValidationError(
                    {
                        "detail": (
                            f"Your account is registered as '{user.get_role_display()}'. "
                            f"Please use the correct login portal."
                        )
                    }
                )

        attrs["user"] = user
        return attrs


class StudentRegistrationSerializer(serializers.ModelSerializer):
    """User self-registration for students and faculty."""

    role = serializers.ChoiceField(
        choices=[User.Role.STUDENT, User.Role.INSTRUCTOR],
        default=User.Role.STUDENT,
        required=False,
    )
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
            "institution_id",
            "department",
        ]

    def validate(self, attrs):
        role = attrs.get("role", User.Role.STUDENT)
        if role == User.Role.STUDENT and not getattr(settings, "ALLOW_STUDENT_REGISTRATION", True):
            raise serializers.ValidationError(
                {"detail": "Student registration is currently disabled."}
            )
        if role == User.Role.INSTRUCTOR and not getattr(settings, "ALLOW_INSTRUCTOR_SELF_REGISTRATION", True):
            raise serializers.ValidationError(
                {"detail": "Instructor self-registration is currently disabled."}
            )
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        role = validated_data.pop("role", User.Role.STUDENT)
        return User.objects.create_user(
            role=role,
            **validated_data,
        )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs

