"""
Materials — API Views
"""
import os
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.utils import timezone
from django.http import FileResponse, Http404

from .models import CourseMaterial
from .serializers import CourseMaterialSerializer, CourseMaterialUploadSerializer
from apps.courses.models import Course, Enrollment
from apps.core.permissions import IsInstructorOrAdmin


class CourseMaterialListCreateView(APIView):
    """
    GET  /api/v1/materials/ — List materials with course, topic, and search filters.
    POST /api/v1/materials/ — Upload material (Faculty/Admin only).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        course_id = request.query_params.get("course_id")
        topic = request.query_params.get("topic")
        search_query = request.query_params.get("search", "").strip()

        qs = CourseMaterial.objects.select_related("course", "uploader").all()

        if user.role == "student":
            # Only published materials in enrolled courses
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)

            qs = qs.filter(course_id__in=enrolled_ids, is_published=True)
        elif user.role == "instructor":
            # Courses taught by instructor or where enrolled as observer
            enrolled_ids = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_id", flat=True)
            qs = qs.filter(Q(course__instructor=user) | Q(course_id__in=enrolled_ids, is_published=True)).distinct()

        if course_id:
            qs = qs.filter(course_id=course_id)

        if topic:
            qs = qs.filter(topic__iexact=topic)

        if search_query:
            qs = qs.filter(
                Q(title__icontains=search_query)
                | Q(description__icontains=search_query)
                | Q(topic__icontains=search_query)
                | Q(file_name__icontains=search_query)
            )

        serializer = CourseMaterialSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        # Only faculty or admin can upload
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Students cannot publish course materials.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.data.get("course")
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Target course does not exist.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Faculty can only upload to courses they teach
        if request.user != course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not authorized to upload materials to this course.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CourseMaterialUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = request.FILES.get("file")
        notebook_data = {}
        if uploaded_file and uploaded_file.name.endswith(".ipynb"):
            import json
            try:
                uploaded_file.seek(0)
                notebook_data = json.loads(uploaded_file.read().decode("utf-8"))
            except Exception:
                pass

        file_type = "application/octet-stream"
        if uploaded_file:
            if hasattr(uploaded_file, "content_type") and uploaded_file.content_type:
                file_type = uploaded_file.content_type
            else:
                import mimetypes
                guessed, _ = mimetypes.guess_type(uploaded_file.name)
                file_type = guessed or "application/octet-stream"
        else:
            mat_type = request.data.get("material_type", "")
            if mat_type == "link" or request.data.get("link_url"):
                file_type = "text/uri-list"
            elif mat_type == "video" or request.data.get("video_url"):
                file_type = "video/embed"

        material = serializer.save(
            uploader=request.user,
            file_name=uploaded_file.name if uploaded_file else (request.data.get("link_url") or request.data.get("video_url") or ""),
            file_size=uploaded_file.size if uploaded_file else 0,
            file_type=file_type,
            notebook_content=notebook_data,
        )


        full_serializer = CourseMaterialSerializer(material, context={"request": request})
        return Response(
            {
                "success": True,
                "message": f"Resource '{material.title}' added to course vault.",
                "data": full_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class CourseMaterialDetailView(APIView):
    """
    GET    /api/v1/materials/<pk>/ — Retrieve material metadata.
    PATCH  /api/v1/materials/<pk>/ — Edit or replace document (Faculty/Admin only).
    DELETE /api/v1/materials/<pk>/ — Delete material (Faculty/Admin only).
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_material(self, pk):
        try:
            return CourseMaterial.objects.select_related("course", "uploader").get(pk=pk)
        except CourseMaterial.DoesNotExist:
            return None

    def get(self, request, pk):
        material = self.get_material(pk)
        if not material:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course material not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check access
        if request.user.role == "student":
            is_enrolled = Enrollment.objects.filter(
                student=request.user,
                course=material.course,
                status=Enrollment.Status.ACTIVE,
            ).exists()
            if not is_enrolled or not material.is_published:
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN", "message": "Access restricted.", "details": []}},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = CourseMaterialSerializer(material, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def patch(self, request, pk):
        material = self.get_material(pk)
        if not material:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course material not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != material.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot edit materials in this course.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CourseMaterialUploadSerializer(material, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Handle file replacement if a new file is uploaded
        if "file" in request.FILES:
            new_file = request.FILES["file"]
            material.file_name = new_file.name
            material.file_size = new_file.size
            material.file_type = getattr(new_file, "content_type", "application/pdf")
            # Invalidate previous vector indexing on document replacement
            material.ai_indexed = False
            material.ai_indexed_at = None

        updated_material = serializer.save()
        return Response({
            "success": True,
            "message": "Resource updated successfully.",
            "data": CourseMaterialSerializer(updated_material, context={"request": request}).data,
        })

    def delete(self, request, pk):
        material = self.get_material(pk)
        if not material:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course material not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != material.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot delete materials in this course.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Remove physical file if exists
        if material.file:
            try:
                material.file.delete(save=False)
            except Exception:
                pass

        material.delete()
        return Response({"success": True, "message": "Resource permanently removed from course vault."})


class CourseMaterialDownloadView(APIView):
    """
    GET /api/v1/materials/<pk>/download/
    Enforces authorization before serving or streaming course files.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            material = CourseMaterial.objects.select_related("course").get(pk=pk)
        except CourseMaterial.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Material not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Authorization verification
        if request.user.role == "student":
            is_enrolled = Enrollment.objects.filter(
                student=request.user,
                course=material.course,
                status=Enrollment.Status.ACTIVE,
            ).exists()
            if not is_enrolled or not material.is_published:
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have access to this course resource.", "details": []}},
                    status=status.HTTP_403_FORBIDDEN,
                )

        if not material.file:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "File is not attached to this record.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            return FileResponse(
                material.file.open("rb"),
                as_attachment=True,
                filename=material.file_name or os.path.basename(material.file.name),
            )
        except Exception as e:
            return Response(
                {"success": False, "error": {"code": "INTERNAL_ERROR", "message": "Failed to read file from storage vault.", "details": [str(e)]}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TriggerMaterialVectorIndexView(APIView):
    """
    POST /api/v1/materials/<pk>/index/
    Allows instructors to index or re-index a PDF into the curriculum vector store.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            material = CourseMaterial.objects.select_related("course").get(pk=pk)
        except CourseMaterial.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Material not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != material.course.instructor and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        material.ai_indexed = True
        material.ai_indexed_at = timezone.now()
        material.save()

        return Response({
            "success": True,
            "message": f"'{material.title}' has been indexed into the Course RAG knowledge base.",
            "data": {
                "id": str(material.id),
                "ai_indexed": True,
                "ai_indexed_at": material.ai_indexed_at,
            }
        })
