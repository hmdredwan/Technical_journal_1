"""
Django settings for journal_backend project - Technical Journal
"""

from pathlib import Path
from decouple import config  
from datetime import timedelta

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

# ========================================
# SECURITY & BASIC SETTINGS
# ========================================
SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-...')  # ← Use .env
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'journal.rribd.org',
    'www.journal.rribd.org',
    'rri.websoftbd.net',
    'www.rri.websoftbd.net',
]

# ========================================
# APPLICATIONS
# ========================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',        # ← Add for JWT tokens
    'corsheaders',
    'core.apps.CoreConfig',            # Better to use AppConfig name
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be near top
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'journal_backend.middleware.AllowIframeMiddleware',
]

 
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('MYSQL_DATABASE', default='journal_db_2'),
        'USER': config('MYSQL_USER', default='root'),
        'PASSWORD': config('MYSQL_PASSWORD', default=''),
        'HOST': config('MYSQL_HOST', default='127.0.0.1'),
        'PORT': config('MYSQL_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}


# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': config('MYSQL_DATABASE', default='rrifak_journal_db'),
#         'USER': config('MYSQL_USER', default='rrifak_journal_user'),
#         'PASSWORD': config('MYSQL_PASSWORD', default='journal12#'),
#         'HOST': config('MYSQL_HOST', default='127.0.0.1'),
#         'PORT': config('MYSQL_PORT', default='3306'),
#         'OPTIONS': {
#             'charset': 'utf8mb4',
#             'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
#         },
#     }
# }

# ========================================
# CUSTOM USER MODEL (roles: admin, editor, etc.)
# ========================================
AUTH_USER_MODEL = 'core.User'  # ← Uncomment this after creating the model

# ========================================
# REST FRAMEWORK + JWT
# ========================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
}

# ========================================
# CORS (for Next.js frontend)
# ========================================
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://journal.rribd.org",
    "https://www.journal.rribd.org",
    "https://rri.websoftbd.net",
    "https://www.rri.websoftbd.net",
    "https://samara-unswooning-vesicularly.ngrok-free.dev",
]

# CORS_ALLOW_ALL_ORIGINS = True

# ========================================
# OTHER SETTINGS
# ========================================
ROOT_URLCONF = 'journal_backend.urls'
WSGI_APPLICATION = 'journal_backend.wsgi.application'

# =============================
# EMAIL BACKEND (Gmail SMTP)
# =============================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='redwan.codes@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='oluygzqijcdobwoy')
JOURNAL_FROM_NAME = config('JOURNAL_FROM_NAME', default='Technical Journal')


# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # For now
# EMAIL_HOST = 'smtp.resend.com'  # Resend's SMTP server
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'resend'  # Fixed username for Resend SMTP
# EMAIL_HOST_PASSWORD = env('RESEND_API_KEY')  # Your NEW API key
# DEFAULT_FROM_EMAIL = 'Your App <journal.rribd.org>'  # Resend's test domain

# Note: Email protocols require an address; we set a display name + address.
# Most clients will show the display name prominently, but may still reveal the address.

DEFAULT_FROM_EMAIL = f"{JOURNAL_FROM_NAME} <{EMAIL_HOST_USER}>"
# JOURNAL_FROM_NAME = env('JOURNAL_FROM_NAME', default='Technical Journal')

# Frontend link base used in invitation emails
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='https://journal.rribd.org')

# =============================
# SSLCOMMERZ (Payment Gateway)
# =============================
# Sandbox credentials (default) - replace via environment variables in production.
SSLCOMMERZ_STORE_ID = config('SSLCOMMERZ_STORE_ID', default='webso69cb9d73c84b3')
SSLCOMMERZ_STORE_PASSWORD = config('SSLCOMMERZ_STORE_PASSWORD', default='webso69cb9d73c84b3@ssl')
SSLCOMMERZ_IS_SANDBOX = config('SSLCOMMERZ_IS_SANDBOX', default=True, cast=bool)

SSLCOMMERZ_INIT_URL = (
    "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
    if SSLCOMMERZ_IS_SANDBOX
    else "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
)
SSLCOMMERZ_VALIDATE_URL = (
    "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    if SSLCOMMERZ_IS_SANDBOX
    else "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
)

# Where rejection notifications go (defaults to same Technical Journal mailbox)
JOURNAL_NOTIFY_EMAIL = config('JOURNAL_NOTIFY_EMAIL', default=EMAIL_HOST_USER)
CONTACT_RECEIVER_EMAIL = config('CONTACT_RECEIVER_EMAIL', default='redwan.websoftbd@gmail.com')

# ========================================
# COPYLEAKS (Plagiarism Detection)
# ========================================


COPYLEAKS_EMAIL = config('COPYLEAKS_EMAIL', default='mdredwanhossain9999@gmail.com')
COPYLEAKS_API_KEY = config('COPYLEAKS_API_KEY', default='878aa6f5-e4ab-4856-9257-8d035c3d16df')

COPYLEAKS_WEBHOOK_BASE = config(
    'COPYLEAKS_WEBHOOK_BASE', 
    default='https://rri.websoftbd.net/api/copyleaks/webhook/'
)

COPYLEAKS_SANDBOX_MODE = config('COPYLEAKS_SANDBOX_MODE', default=True, cast=bool)

# =============================
# EMAIL BACKEND (Gmail SMTP)
# =============================


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Dhaka'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ========================================
# GOOGLE ANALYTICS
# ========================================
GA4_PROPERTY_ID = '530257030'