"""
Core views — health check endpoint.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection


class HealthCheckView(APIView):
    """GET /api/v1/health/ — unauthenticated liveness probe."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            pass

        payload = {
            "status": "healthy" if db_ok else "degraded",
            "service": "arx-courseroom-api",
            "version": "1.0.0",
            "database": "connected" if db_ok else "unreachable",
        }
        status_code = 200 if db_ok else 503
        return Response(payload, status=status_code)
