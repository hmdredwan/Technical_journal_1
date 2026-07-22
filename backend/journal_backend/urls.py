"""
URL configuration for journal_backend project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django Admin 
    path('admin/', admin.site.urls),

    # Include all API endpoints from the 'core' app
    # All API routes will now start with /api/
    path('api/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)