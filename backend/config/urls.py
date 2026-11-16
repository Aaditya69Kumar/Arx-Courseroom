"""
Arx CourseRoom — Django URL Configuration
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_router")),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    try:
        import debug_toolbar  # noqa: F401
        urlpatterns += [
            path("__debug__/", include("debug_toolbar.urls")),
        ]
    except ImportError:
        pass

