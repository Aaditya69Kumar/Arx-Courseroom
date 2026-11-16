"""
Arx CourseRoom — Development Settings
"""
from .base import *  # noqa: F401,F403

DEBUG = True

try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
except ImportError:
    pass

INTERNAL_IPS = ["127.0.0.1"]

# In dev, also render browsable API
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (  # noqa: F405
    "rest_framework.renderers.JSONRenderer",
    "rest_framework.renderers.BrowsableAPIRenderer",
)

# Shorter token lifetimes for development
SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"] = __import__("datetime").timedelta(minutes=60)  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Allow all origins in local development so any frontend port works seamlessly
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
ALLOWED_HOSTS = ["*"]

