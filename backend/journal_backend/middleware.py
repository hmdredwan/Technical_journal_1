# journal_backend/journal_backend/middleware.py

class AllowIframeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Allow framing from both common Next.js dev origins.
        # `X-Frame-Options` supports only a single origin value in many browsers,
        # so we remove it and use CSP `frame-ancestors` instead.
        response.headers.pop('X-Frame-Options', None)

        # Extend as needed for your production domains.
        response['Content-Security-Policy'] = (
            "frame-ancestors 'self' "
            "http://localhost:3000 http://127.0.0.1:3000 "
            "https://journal.rribd.org https://www.journal.rribd.org "
            "https://rri.websoftbd.net https://www.rri.websoftbd.net "
            "https://samara-unswooning-vesicularly.ngrok-free.dev"
        )

        return response