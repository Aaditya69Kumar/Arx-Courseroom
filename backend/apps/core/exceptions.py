"""
Core app — custom DRF exception handler for structured API errors.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Returns structured JSON error responses:
    {
        "success": false,
        "error": {
            "code": "...",
            "message": "...",
            "details": [...]
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = _get_error_code(response.status_code)
        error_data = {
            "success": False,
            "error": {
                "code": error_code,
                "message": _get_error_message(response),
                "details": response.data if isinstance(response.data, list) else [],
            },
        }

        # If response.data is a dict with field errors, put them in details
        if isinstance(response.data, dict):
            details = []
            for field, messages in response.data.items():
                if isinstance(messages, list):
                    for msg in messages:
                        details.append({"field": field, "message": str(msg)})
                else:
                    details.append({"field": field, "message": str(messages)})
            error_data["error"]["details"] = details

        response.data = error_data

    return response


def _get_error_code(status_code):
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_ERROR",
    }
    return codes.get(status_code, "UNKNOWN_ERROR")


def _get_error_message(response):
    if isinstance(response.data, dict):
        if "detail" in response.data:
            return str(response.data["detail"])
        return "Validation failed."
    if isinstance(response.data, list):
        return str(response.data[0]) if response.data else "An error occurred."
    return str(response.data)
