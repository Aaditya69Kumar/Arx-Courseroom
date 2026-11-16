"""
Accounts — API Views for authentication and user management.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    StudentRegistrationSerializer,
    UserSerializer,
    PasswordResetRequestSerializer,
    ChangePasswordSerializer,
)
from .models import User


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Allows authenticated users to change their account password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Current password is incorrect.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save()

        # Generate fresh tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "message": "Password changed successfully.",
                "data": {
                    "tokens": {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    }
                },
            },
            status=status.HTTP_200_OK,
        )



class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Authenticates user and returns JWT tokens + user data with role.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Student self-registration (when policy allows).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "success": True,
                "data": {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    },
                },
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the authenticated user's profile.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "success": True,
                "data": UserSerializer(request.user).data,
            }
        )

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "data": serializer.data,
            }
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the refresh token.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass  # Token may already be blacklisted

        return Response(
            {"success": True, "message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    POST /api/v1/auth/password-reset/
    Sends a password reset email (stub for Part 1).
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Always return success to prevent email enumeration
        return Response(
            {
                "success": True,
                "message": "If an account exists with that email, a reset link has been sent.",
            }
        )


class UserManagementView(APIView):
    """
    GET  /api/v1/auth/users/ — Administrator oversight of all platform users.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Administrator privileges required.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        role_filter = request.query_params.get("role")
        search = request.query_params.get("search", "").strip()

        qs = User.objects.all().order_by("-date_joined")
        if role_filter:
            qs = qs.filter(role=role_filter)
        if search:
            qs = qs.filter(email__icontains=search)

        serializer = UserSerializer(qs[:50], many=True)
        return Response({"success": True, "data": serializer.data})


class UserApprovalView(APIView):
    """
    PATCH /api/v1/auth/users/<pk>/approve/ — Approve faculty account or change roles.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Administrator privileges required.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "User not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_role = request.data.get("role")
        is_active = request.data.get("is_active")

        if new_role:
            target_user.role = new_role
        if is_active is not None:
            target_user.is_active = is_active

        target_user.save()

        return Response({
            "success": True,
            "message": f"User {target_user.email} updated to role: {target_user.role} (active={target_user.is_active})",
            "data": UserSerializer(target_user).data,
        })

