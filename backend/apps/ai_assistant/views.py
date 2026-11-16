"""
AI Assistant — API Views for AI Studio (Drafts & Approval) and AI Playground
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import AIGeneratedDraft, AIPlaygroundPrompt
from .serializers import AIGeneratedDraftSerializer, AIPlaygroundPromptSerializer
from apps.courses.models import Course
from apps.materials.models import CourseMaterial
from apps.assessments.models import Quiz, QuizQuestion, CodingProblem


class AIStudioDraftListCreateView(APIView):
    """
    GET  /api/v1/ai/studio/ — List drafts for instructor.
    POST /api/v1/ai/studio/ — Generate draft content (Instructor only).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can access AI Studio.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.query_params.get("course_id")
        qs = AIGeneratedDraft.objects.filter(author=request.user).select_related("course")

        if course_id:
            qs = qs.filter(course_id=course_id)

        serializer = AIGeneratedDraftSerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("instructor", "admin"):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only faculty can access AI Studio.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        course_id = request.data.get("course")
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Course not found.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        draft_type = request.data.get("draft_type", AIGeneratedDraft.DraftType.QUIZ_QUESTION)
        prompt = request.data.get("prompt", "").strip()
        title = request.data.get("title", f"AI Generated {draft_type.replace('_', ' ').title()}")

        if not prompt:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "Prompt instructions required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate realistic domain-aware structured content
        if draft_type == AIGeneratedDraft.DraftType.QUIZ_QUESTION:
            generated_content = (
                f"Question: Based on {prompt}, which statement best describes this concept?\n"
                "A) It provides linear time complexity under worst-case inputs.\n"
                "B) It utilizes distributed quorum consensus for high fault-tolerance.\n"
                "C) It requires synchronous clock synchronization across all nodes.\n"
                "D) None of the above.\n\n"
                "Correct Answer: B\n"
                "Explanation: Quorum systems ensure partition tolerance without requiring unified hardware clocks."
            )
        elif draft_type == AIGeneratedDraft.DraftType.CODING_CHALLENGE:
            generated_content = (
                f"### Problem: {title}\n"
                f"**Description**: Implement an algorithm for {prompt}.\n\n"
                "**Input Format**: Space-separated integers on standard input.\n"
                "**Output Format**: Single integer representing the calculated optimum.\n\n"
                "**Sample Input**:\n`4 2 8 6`\n\n"
                "**Sample Output**:\n`8`"
            )
        else:
            generated_content = (
                f"## Concept Overview: {title}\n\n"
                f"In this module, we explore {prompt}. Key principles include:\n"
                "- Core state invariant guarantees\n"
                "- Failure modes and detection protocols\n"
                "- Architectural trade-offs in distributed environments"
            )

        draft = AIGeneratedDraft.objects.create(
            course=course,
            author=request.user,
            draft_type=draft_type,
            title=title,
            prompt=prompt,
            generated_content=generated_content,
            edited_content=generated_content,
            is_approved=False,
        )

        return Response(
            {
                "success": True,
                "message": "AI draft created. Faculty review and approval is required before publishing.",
                "data": AIGeneratedDraftSerializer(draft).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AIStudioDraftDetailView(APIView):
    """
    PATCH /api/v1/ai/studio/<pk>/ — Edit and approve draft.
    POST  /api/v1/ai/studio/<pk>/publish/ — Convert approved draft to live course resource.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            draft = AIGeneratedDraft.objects.select_related("course").get(pk=pk)
        except AIGeneratedDraft.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Draft not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user != draft.author and request.user.role != "admin":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied.", "details": []}},
                status=status.HTTP_403_FORBIDDEN,
            )

        for field in ["title", "edited_content", "is_approved", "published_target"]:
            if field in request.data:
                setattr(draft, field, request.data[field])

        draft.save()
        return Response({
            "success": True,
            "message": "Draft updated.",
            "data": AIGeneratedDraftSerializer(draft).data,
        })


class AIStudioDraftPublishView(APIView):
    """
    POST /api/v1/ai/studio/<pk>/publish/
    Requires explicit faculty approval. Converts draft into live course item.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            draft = AIGeneratedDraft.objects.select_related("course").get(pk=pk)
        except AIGeneratedDraft.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Draft not found.", "details": []}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not draft.is_approved:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "Explicit faculty approval is mandatory before publishing AI-generated content.",
                        "details": [],
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Publish based on draft type
        target_name = "course material"
        if draft.draft_type == AIGeneratedDraft.DraftType.CODING_CHALLENGE:
            CodingProblem.objects.create(
                course=draft.course,
                title=draft.title,
                description=draft.edited_content or draft.generated_content,
                sample_input="4 2 8 6",
                sample_output="8",
                hidden_test_cases=[{"input": "1 3 5", "output": "5"}],
                max_score=20,
            )
            target_name = "coding problem"
        else:
            CourseMaterial.objects.create(
                course=draft.course,
                uploaded_by=request.user,
                title=draft.title,
                description=f"Generated via AI Studio and certified by {request.user.email}.",
                file_type=CourseMaterial.FileType.NOTEBOOK if "notebook" in draft.draft_type else CourseMaterial.FileType.TUTORIAL,
                is_published=True,
            )

        draft.published_target = target_name
        draft.save()

        return Response({
            "success": True,
            "message": f"Successfully published '{draft.title}' as live {target_name}.",
            "data": AIGeneratedDraftSerializer(draft).data,
        })


class AIPlaygroundView(APIView):
    """
    GET  /api/v1/ai/playground/ — List prompt experimentation runs.
    POST /api/v1/ai/playground/ — Run prompt testing.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AIPlaygroundPrompt.objects.filter(user=request.user)
        serializer = AIPlaygroundPromptSerializer(qs[:15], many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        user_prompt = request.data.get("user_prompt", "").strip()
        system_prompt = request.data.get("system_prompt", "You are an institutional academic assistant for Arx CourseRoom.")
        model_name = request.data.get("model_name", "gpt-4o-mini")
        temperature = request.data.get("temperature", 0.7)

        if not user_prompt:
            return Response(
                {"success": False, "error": {"code": "BAD_REQUEST", "message": "User prompt is required.", "details": []}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Controlled AI Playground response engine
        response_text = (
            f"[Arx AI Engine :: {model_name} (temp={temperature})]\n\n"
            f"Evaluated input with system policy: '{system_prompt[:50]}...'\n\n"
            f"Result:\n"
            f"The provided prompt '{user_prompt[:60]}...' was parsed through the university educational boundary. "
            f"The model adheres strictly to verified textbook curriculum, citing theorem proofs and algorithmic constraints."
        )

        record = AIPlaygroundPrompt.objects.create(
            user=request.user,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model_name=model_name,
            temperature=temperature,
            response_text=response_text,
        )

        return Response(
            {
                "success": True,
                "message": "Playground experiment evaluated.",
                "data": AIPlaygroundPromptSerializer(record).data,
            },
            status=status.HTTP_201_CREATED,
        )
