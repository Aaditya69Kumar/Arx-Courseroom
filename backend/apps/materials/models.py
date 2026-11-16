"""
Materials — Course Documents & Vector RAG Materials
"""
import uuid
import os
from django.db import models
from django.conf import settings


def course_material_upload_path(instance, filename):
    """Store files hierarchically by course and UUID to avoid collisions."""
    ext = os.path.splitext(filename)[1]
    return f"materials/course_{instance.course_id}/{instance.id}{ext}"


class CourseMaterial(models.Model):
    """Educational materials uploaded for a course."""

    class MaterialType(models.TextChoices):
        DOCUMENT = "document", "Document (PDF, Word, PPT, Excel, Text)"
        SLIDES = "slides", "Lecture Slides"
        NOTES = "notes", "Handwritten Notes"
        SYLLABUS = "syllabus", "Syllabus / Outline"
        LAB_MANUAL = "lab_manual", "Lab Manual"
        NOTEBOOK = "notebook", "Jupyter Notebook (.ipynb)"
        VIDEO = "video", "Video Lecture / Recording"
        IMAGE = "image", "Image / Diagram"
        LINK = "link", "Web Link / Resource"
        OTHER = "other", "Supplementary Resource"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.CASCADE,
        related_name="materials",
    )
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploaded_materials",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    topic = models.CharField(
        max_length=100,
        default="General",
        help_text="Unit, Chapter, or Topic (e.g. Unit 1: Distributed Architectures)",
    )
    material_type = models.CharField(
        max_length=30,
        choices=MaterialType.choices,
        default=MaterialType.DOCUMENT,
    )
    
    file = models.FileField(
        upload_to=course_material_upload_path,
        blank=True,
        null=True,
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.BigIntegerField(default=0, help_text="Size in bytes")
    file_type = models.CharField(max_length=100, default="application/pdf")
    notebook_content = models.JSONField(
        default=dict,
        blank=True,
        help_text="Parsed JSON notebook structure for secure web preview",
    )
    video_url = models.CharField(max_length=500, blank=True)
    link_url = models.CharField(max_length=500, blank=True)

    
    is_published = models.BooleanField(
        default=True,
        help_text="Draft or published. Only published materials are visible to enrolled students.",
    )
    
    # RAG Vector indexing metadata (used in AI Q&A)
    ai_indexed = models.BooleanField(
        default=False,
        help_text="Whether this PDF has been vectorized into pgvector for the student AI copilot.",
    )
    ai_indexed_at = models.DateTimeField(null=True, blank=True)
    page_count = models.IntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["topic", "-created_at"]

    def __str__(self):
        return f"[{self.course.code}] {self.title} ({self.topic})"

    def save(self, *args, **kwargs):
        if self.file and hasattr(self.file, "name"):
            if not self.file_name:
                self.file_name = os.path.basename(self.file.name)
            if hasattr(self.file, "size") and not self.file_size:
                self.file_size = self.file.size
        super().save(*args, **kwargs)
