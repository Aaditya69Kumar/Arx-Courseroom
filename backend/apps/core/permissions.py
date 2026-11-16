"""
Core permissions — role-based and object-level permissions.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStudent(BasePermission):
    """Allow only authenticated users with role == 'student'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsInstructor(BasePermission):
    """Allow only authenticated users with role == 'instructor'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "instructor"
        )


class IsAdmin(BasePermission):
    """Allow only authenticated users with role == 'admin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )


class IsInstructorOrAdmin(BasePermission):
    """Allow instructors and admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("instructor", "admin")
        )


class IsCourseInstructorOrReadOnly(BasePermission):
    """
    Object-level permission:
    - SAFE_METHODS allowed if user has access (enrolled student or instructor).
    - Write operations allowed ONLY if user is the course instructor or an admin.
    """

    def has_object_permission(self, request, view, obj):
        # Determine the course from the object
        course = getattr(obj, "course", obj)
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user == course.instructor or request.user.role == "admin")
        )


class IsCourseInstructorOrAdmin(BasePermission):
    """
    Object-level permission allowing only the course's instructor or admin.
    """

    def has_object_permission(self, request, view, obj):
        course = getattr(obj, "course", obj)
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user == course.instructor or request.user.role == "admin")
        )
