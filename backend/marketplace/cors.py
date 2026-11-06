"""Minimal CORS middleware (django-corsheaders is not installable in this
environment, so the MVP ships its own).

Behavior is driven by settings:
- CORS_ALLOW_ALL_ORIGINS=True (default in DEBUG): reflect any Origin.
- Otherwise only origins in CORS_ALLOWED_ORIGINS get the header.
Preflight (OPTIONS) requests are answered directly.
"""

from django.conf import settings


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin")
        if request.method == "OPTIONS" and origin:
            from django.http import HttpResponse

            response = HttpResponse(status=200)
            self._apply(response, origin)
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response["Access-Control-Max-Age"] = "86400"
            return response
        response = self.get_response(request)
        if origin:
            self._apply(response, origin)
        return response

    def _apply(self, response, origin):
        allow_all = getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False)
        allowed = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        if allow_all or origin in allowed:
            response["Access-Control-Allow-Origin"] = origin if not allow_all else "*"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response["Vary"] = "Origin"
