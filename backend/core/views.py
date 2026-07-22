from django.core.mail import send_mail, EmailMessage
from rest_framework.permissions import IsAdminUser
from django.db import models
from rest_framework import generics, status, serializers
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.generics import RetrieveAPIView
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .serializers import PlagiarismScanSerializer
from rest_framework.views import APIView

# Admin-only: Send Call for Papers email to authors or custom emails
from .models import (
    DecisionLog,
    ReviewerApplication,
    SubmissionDeadline,
    User,
    Role,
    EditorialBoardMember,
    Submission,
    SubmissionVersion,
    Volume,
    Issue,
    Paper,
    ReviewAssignment,
    Announcement,
    NewsArticle,
    ImportantDate,
    HeroImage,
    GuidelineDocument,
    ManuscriptFormatDocument,
    ManuscriptComment,
    SubmissionFee,
    PaymentTransaction,
    ReviewerPayout,
    PlagiarismScan,
    CallForPaperAdvertize,
    SubmissionPeriod,
    AboutPageContent,
)
from .serializers import ReviewerApplicationSerializer, RoleSerializer, UserRegistrationSerializer,ProfileUpdateSerializer, EditorialBoardMemberSerializer,UserListSerializer,UserUpdateSerializer,SubmissionSerializer,SubmissionDetailSerializer,SubmissionVersionSerializer,SubmissionVersionCreateSerializer,VolumeSerializer,IssueSerializer,PaperSerializer,PublicIssueSerializer,ReviewAssignmentSerializer, ReviewAssignmentCreateSerializer,DecisionLogSerializer,SubmissionDeadlineSerializer, AnnouncementSerializer, NewsArticleSerializer, ImportantDateSerializer, HeroImageSerializer, ManuscriptCommentSerializer, GuidelineDocumentAdminSerializer, GuidelineDocumentPublicSerializer, ManuscriptFormatDocumentAdminSerializer, ManuscriptFormatDocumentPublicSerializer, SubmissionFeeSerializer, PaymentTransactionSerializer, ReviewerPayoutSerializer, ReviewerPayoutCreateSerializer, CallForPaperAdvertizeSerializer, SubmissionPeriodSerializer, AboutPageContentSerializer, AboutPageContentPublicSerializer
from django.http import FileResponse
import os
import tempfile
from PyPDF2 import PdfMerger, PdfReader
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from django.http import HttpResponse
from django.core.files import File as DjangoFile
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.db.models import Q
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.conf import settings
from django.urls import reverse
import uuid
import requests
import base64
import json

def _frontend_base_url(request=None):
    base = getattr(settings, "FRONTEND_BASE_URL", None)
    if not base and request is not None:
        scheme = request.scheme or "https"
        host = request.get_host()
        base = f"{scheme}://{host}"
    if not base:
        base = "http://localhost:3000"
    return base.rstrip("/")

def _journal_notify_email():
    return getattr(settings, "JOURNAL_NOTIFY_EMAIL", None) or getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)

def _journal_from_email():
    """
    Prefer DEFAULT_FROM_EMAIL which includes the 'Technical Journal' display name.
    Fall back to EMAIL_HOST_USER if needed.
    """
    return getattr(settings, "DEFAULT_FROM_EMAIL", None) or getattr(settings, "EMAIL_HOST_USER", None)


def _get_manuscript_code(submission: Submission) -> str:
    """Return a stable manuscript code for emails and UI, generating one when needed."""
    manuscript_code = getattr(submission, 'submission_code', None)
    if manuscript_code:
        return manuscript_code

    submission_period = getattr(submission, 'submission_period', None)
    if submission_period is not None:
        import re

        year = submission_period.start_date.year if getattr(submission_period, 'start_date', None) else 0
        volume_match = re.search(r'(\d+)', str(submission_period.volume or ''))
        issue_match = re.search(r'(\d+)', str(submission_period.issue or ''))
        volume_value = volume_match.group(1) if volume_match else '0'
        issue_value = issue_match.group(1) if issue_match else '0'

        serial = Submission.objects.filter(submission_period=submission_period).count() + 1
        manuscript_code = f"RRIJ_{year}_{volume_value}({issue_value})_{serial:02d}"

        if not getattr(submission, 'submission_code', None):
            submission.submission_code = manuscript_code
            submission.save(update_fields=['submission_code'])

        return manuscript_code

    return f"RRIJ_{submission.id}"


def send_feedback_to_author_notification(assignment: ReviewAssignment, sender: User, request=None) -> None:
    submission = assignment.submission
    recipient = submission.corresponding_author or submission.submitted_by
    if not recipient or not recipient.email:
        raise ValidationError("No valid author email address found to send feedback.")

    author_name = recipient.full_name or recipient.email
    submission_link = f"{_frontend_base_url(request)}/author-dashboard/my-submissions"
    manuscript_code = getattr(submission, 'submission_code', None) or f"#{submission.id}"
    recommendation = assignment.recommendation.replace('_', ' ').title() if assignment.recommendation else 'No recommendation'

    subject = f"Reviewer feedback available for your submission: {submission.title}"

    text_message = (
        f"Dear {author_name},\n\n"
        f"Reviewer feedback has been sent for your manuscript:\n"
        f"Title: {submission.title}\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Recommendation: {recommendation}\n\n"
    )

    if assignment.comment_to_author:
        text_message += f"Comments to author:\n{assignment.comment_to_author}\n\n"

    checklist_items = []
    if assignment.is_important_for_scientific_community is not None:
        checklist_items.append(f"Important for scientific community: {'Yes' if assignment.is_important_for_scientific_community else 'No'}")
    if assignment.is_title_suitable is not None:
        checklist_items.append(f"Title suitable: {'Yes' if assignment.is_title_suitable else 'No'}")
    if assignment.is_abstract_comprehensive is not None:
        checklist_items.append(f"Abstract comprehensive: {'Yes' if assignment.is_abstract_comprehensive else 'No'}")
    if assignment.is_intro_conclusion_sufficient is not None:
        checklist_items.append(f"Intro/conclusion sufficient: {'Yes' if assignment.is_intro_conclusion_sufficient else 'No'}")
    if assignment.is_structure_appropriate is not None:
        checklist_items.append(f"Structure appropriate: {'Yes' if assignment.is_structure_appropriate else 'No'}")
    if assignment.are_references_sufficient is not None:
        checklist_items.append(f"References sufficient: {'Yes' if assignment.are_references_sufficient else 'No'}")
    if assignment.is_language_quality_suitable is not None:
        checklist_items.append(f"Language quality suitable: {'Yes' if assignment.is_language_quality_suitable else 'No'}")
    if assignment.alternative_title:
        checklist_items.append(f"Alternative title suggestion: {assignment.alternative_title}")
    if assignment.additional_references:
        checklist_items.append(f"Additional references suggested: {assignment.additional_references}")

    if checklist_items:
        text_message += 'Checklist:\n' + '\n'.join(checklist_items) + '\n\n'

    text_message += (
        f"You can view this feedback on your author dashboard: {submission_link}\n\n"
        f"Regards,\nTechnical Journal"
    )

    comment_html = ''
    if assignment.comment_to_author:
        comment_html = '<p><strong>Comments to author:</strong><br />' + assignment.comment_to_author.replace('\n', '<br />') + '</p>'

    checklist_html = ''
    if checklist_items:
        checklist_html = '<p><strong>Checklist:</strong><br />' + '<br />'.join(checklist_items) + '</p>'

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #111;\">\n
      <p>Dear <strong>{author_name}</strong>,</p>\n
      <p>Reviewer feedback has been sent for your manuscript:</p>\n
      <p><strong>Title:</strong> {submission.title}<br />\n      <strong>Manuscript ID:</strong> {manuscript_code}<br />\n      <strong>Recommendation:</strong> {recommendation}</p>\n
      {comment_html}\n
      {checklist_html}\n
      <p>You can view this feedback on your author dashboard: <a href=\"{submission_link}\">Author Dashboard</a></p>\n
      <p>Regards,<br /><strong>Technical Journal</strong></p>\n
    </div>\n
    """

    send_mail(
        subject,
        text_message,
        _journal_from_email(),
        [recipient.email],
        fail_silently=False,
        html_message=html_message,
    )


def send_admin_welcome_email(user: User, raw_password: str | None = None) -> None:
    """Send a warm welcome email to a new user created by admin."""
    if not user.email:
        return

    login_url = f"{_frontend_base_url()}/login"
    role_label = user.role.name if user.role and user.role.name else 'User'
    email_login = user.email

    subject = "Welcome to Technical Journal"
    text_message = (
        f"Dear {user.full_name or email_login},\n\n"
        f"Welcome to Technical Journal! Your account has been created with the role: {role_label}.\n\n"
        f"Login email: {email_login}\n"
        f"Login link: {login_url}\n\n"
        f"Please sign in and change your password immediately after your first login to keep your account secure.\n\n"
        f"If you did not expect this email, please contact our support team.\n\n"
        f"Regards,\nTechnical Journal"
    )

    html_message = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>Dear <strong>{user.full_name or email_login}</strong>,</p>
      <p>Welcome to <strong>Technical Journal</strong>! Your account has been created with the role <strong>{role_label}</strong>.</p>
      <p style="margin: 16px 0 8px 0;"><strong>Login email:</strong> {email_login}</p>
      <p style="margin: 8px 0 16px 0;"><strong>Login link:</strong> <a href="{login_url}" style="color:#2563eb; text-decoration:none;">Sign in to Technical Journal</a></p>
      {f'<p style="margin: 8px 0 16px 0;"><strong>Temporary password:</strong> {raw_password}</p>' if raw_password else ''}
      <p>Please sign in and change your password immediately after your first login to keep your account secure.</p>
      <p style="margin-top: 20px; color:#6b7280; font-size: 14px;">If you did not expect this email, please contact our support team.</p>
      <p style="margin-top: 20px;">Regards,<br /><strong>Technical Journal</strong></p>
    </div>
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [email_login],
            fail_silently=False,
            html_message=html_message,
        )
    except Exception as exc:
        print(f"Failed to send welcome email to {email_login}: {exc}")


def _review_invite_signer():
    return TimestampSigner(salt="core.review_invite.v1")

def _password_reset_signer():
    return TimestampSigner(salt="core.password_reset.v1")

def make_password_reset_token(user: User) -> str:
    payload = f"{user.id}:{(user.email or '').lower()}"
    return _password_reset_signer().sign(payload)

def parse_password_reset_token(token: str, max_age_seconds: int = 10 * 60):
    """
    Returns (user_id, email). Raises BadSignature/SignatureExpired.
    """
    raw = _password_reset_signer().unsign(token, max_age=max_age_seconds)
    user_id_str, email = raw.split(":", 1)
    return int(user_id_str), email

def build_password_reset_link(token: str, request=None):
    base = _frontend_base_url(request)
    return f"{base}/reset-password?token={token}"


def _email_verification_signer():
    return TimestampSigner(salt="core.email_verification.v1")


def make_email_verification_token(user: User) -> str:
    payload = f"{user.id}:{(user.email or '').lower()}"
    return _email_verification_signer().sign(payload)


def parse_email_verification_token(token: str, max_age_seconds: int = 60 * 60 * 24):
    raw = _email_verification_signer().unsign(token, max_age=max_age_seconds)
    user_id_str, email = raw.split(":", 1)
    return int(user_id_str), email


def build_email_verification_link(token: str, request=None):
    base = _frontend_base_url(request)
    return f"{base}/verify-email?token={token}"


def send_email_verification_email(user: User) -> None:
    if not user.email:
        return

    token = make_email_verification_token(user)
    verification_url = build_email_verification_link(token)

    subject = "Verify your email for Technical Journal"
    text_message = (
        f"Dear {user.full_name or user.email},\n\n"
        "Thank you for registering with Technical Journal. Please verify your email address by clicking the link below:\n\n"
        f"{verification_url}\n\n"
        "After verification, you will be able to log in and submit manuscripts.\n\n"
        "If you did not create this account, please ignore this message.\n\n"
        "Regards,\nTechnical Journal"
    )

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #111;\">
      <p>Dear <strong>{user.full_name or user.email}</strong>,</p>
      <p>Thank you for registering with <strong>Technical Journal</strong>.</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style=\"margin: 24px 0;\"><a href=\"{verification_url}\" style=\"display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;\">Verify Email</a></p>
      <p>If the button does not work, copy and paste the following link into your browser:</p>
      <p style=\"word-break: break-word;\">{verification_url}</p>
      <p>After verification, you will be able to log in to your account.</p>
      <p style=\"margin-top:24px;color:#6b7280;font-size:14px;\">If you did not register for this account, please ignore this email.</p>
      <p style=\"margin-top:16px;\">Regards,<br /><strong>Technical Journal</strong></p>
    </div>
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [user.email],
            fail_silently=False,
            html_message=html_message,
        )
    except Exception as exc:
        print(f"Failed to send verification email to {user.email}: {exc}")


def _extract_text_from_guideline_pdf(file_path: str) -> tuple[str, str]:
    """
    Extract text from a PDF using PyPDF2.
    Returns (text, error_message).
    """
    try:
        reader = PdfReader(file_path)
        chunks: list[str] = []
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ''
            except Exception:
                page_text = ''
            page_text = page_text.strip()
            if page_text:
                chunks.append(page_text)
        return '\n\n'.join(chunks).strip(), ''
    except Exception as e:
        return '', f'PDF text extraction failed: {e}'


def _extract_text_from_guideline_docx(file_path: str) -> tuple[str, str]:
    """
    Extract text from a DOCX using python-docx.
    Returns (text, error_message).
    """
    try:
        # Import lazily so the app can still boot without optional deps.
        from docx import Document as DocxDocument  # type: ignore

        doc = DocxDocument(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        return '\n\n'.join(paragraphs).strip(), ''
    except Exception as e:
        return '', f'DOCX text extraction failed: {e}'


def _convert_docx_to_pdf(file_path: str) -> tuple[str, str]:
    """
    Convert DOCX to PDF for faithful rendering.
    Returns (pdf_path, error_message).
    """
    try:
        # Optional dependency; only imported when needed.
        from docx2pdf import convert  # type: ignore

        with tempfile.TemporaryDirectory() as tmpdir:
            # docx2pdf can output to a directory.
            convert(file_path, tmpdir)

            pdfs = [f for f in os.listdir(tmpdir) if f.lower().endswith('.pdf')]
            if not pdfs:
                return '', 'DOCX->PDF conversion produced no PDF output.'

            pdf_path = os.path.join(tmpdir, sorted(pdfs)[0])

            # Copy bytes to a new temp file because `tmpdir` will be removed.
            persistent_pdf_path = os.path.join(tempfile.gettempdir(), os.path.basename(pdf_path))
            with open(pdf_path, 'rb') as src, open(persistent_pdf_path, 'wb') as dst:
                dst.write(src.read())

            return persistent_pdf_path, ''
    except Exception as e:
        return '', f'DOCX->PDF conversion failed: {e}'


def _extract_text_from_guideline_file(guideline: GuidelineDocument) -> tuple[str, str]:
    """
    Extract and cache guideline text in `extracted_text`.
    """
    if not guideline.file:
        return '', 'No file attached.'

    file_path = guideline.file.path if hasattr(guideline.file, 'path') else None
    if not file_path or not os.path.exists(file_path):
        return '', 'Guideline file missing on server.'

    ext = (guideline.file_extension or os.path.splitext(guideline.file.name)[1]).lower().strip('.')
    # Normalize extension
    if ext in ['pdf']:
        return _extract_text_from_guideline_pdf(file_path)
    if ext in ['docx', 'doc']:
        # We only reliably support .docx extraction.
        if ext == 'doc':
            return '', 'DOC format text extraction not supported. Please upload DOCX or PDF.'
        return _extract_text_from_guideline_docx(file_path)

    return '', f'Unsupported guideline file type: .{ext}'


def make_review_invite_token(assignment: ReviewAssignment) -> str:
    payload = f"{assignment.id}:{assignment.assigned_to_id}"
    return _review_invite_signer().sign(payload)

def parse_review_invite_token(token: str, max_age_seconds: int = 60 * 60 * 24 * 14):
    """
    Returns (assignment_id, reviewer_user_id). Raises BadSignature/SignatureExpired.
    """
    raw = _review_invite_signer().unsign(token, max_age=max_age_seconds)
    assignment_id_str, reviewer_id_str = raw.split(":", 1)
    return int(assignment_id_str), int(reviewer_id_str)

def build_invite_links(token: str):
    # Frontend pages handle accept/reject UX.
    base = _frontend_base_url()
    accept = f"{base}/review-invitation/accept?token={token}"
    reject = f"{base}/review-invitation/reject?token={token}"
    return accept, reject

def send_review_assignment_invite_email(assignment: ReviewAssignment, triggered_by: User | None = None):
    reviewer = assignment.assigned_to
    submission = assignment.submission
    if not reviewer or not reviewer.email:
        return False

    token = make_review_invite_token(assignment)
    accept_url, reject_url = build_invite_links(token)

    due = assignment.due_date.strftime("%Y-%m-%d") if assignment.due_date else "Not set"
    title = submission.title
    keywords = submission.keywords or ""
    abstract = submission.abstract or ""
    admin_remarks = assignment.admin_remarks or ""

    subject = f"Review Invitation: {title}"
    text_message = (
        f"Dear {reviewer.full_name},\n\n"
        f"You have been invited to review a manuscript for Technical Journal.\n\n"
        f"Title: {title}\n"
        f"Keywords: {keywords}\n"
        f"Abstract:\n{abstract}\n\n"
        f"Due date: {due}\n"
        f"{'Admin remarks: ' + admin_remarks if admin_remarks else ''}\n\n"
        f"Accept: {accept_url}\n"
        f"Reject: {reject_url}\n\n"
        f"Regards,\nTechnical Journal"
    )

    # Simple, email-client-friendly HTML (no JS).
    html_message = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <p>Dear <strong>{reviewer.full_name}</strong>,</p>
      <p>You have been invited to review a manuscript for <strong>Technical Journal</strong>.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
      <p style="margin:0 0 8px 0;"><strong>Title:</strong> {title}</p>
      <p style="margin:0 0 8px 0;"><strong>Keywords:</strong> {keywords}</p>
      <p style="margin:0 0 8px 0;"><strong>Due date:</strong> {due}</p>
      <p style="margin:16px 0 6px 0;"><strong>Abstract</strong></p>
      <div style="white-space: pre-wrap; padding: 12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius: 8px;">{abstract}</div>
      {"<p style='margin:16px 0 6px 0;'><strong>Admin remarks</strong></p><div style='white-space: pre-wrap; padding: 12px; background:#f9fafb; border:1px solid #e5e7eb; border-radius: 8px;'>" + admin_remarks + "</div>" if admin_remarks else ""}
      <div style="margin-top: 18px;">
        <a href="{accept_url}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;margin-right:10px;">
          Accept
        </a>
        <a href="{reject_url}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;">
          Reject
        </a>
      </div>
      <p style="margin-top: 18px; color:#6b7280; font-size: 12px;">
        If the buttons do not work, copy/paste these links:<br />
        Accept: <a href="{accept_url}">{accept_url}</a><br />
        Reject: <a href="{reject_url}">{reject_url}</a>
      </p>
    </div>
    """

    from_email = _journal_from_email()
    send_mail(
        subject,
        text_message,
        from_email,
        [reviewer.email],
        fail_silently=False,
        html_message=html_message,
    )

    assignment.invitation_sent_at = timezone.now()
    assignment.save(update_fields=["invitation_sent_at"])
    return True


def send_review_assignment_withdrawal_email(assignment: ReviewAssignment, triggered_by: User | None = None):
    reviewer = assignment.assigned_to
    submission = assignment.submission
    if not reviewer or not reviewer.email:
        return False

    subject = f"Review Assignment Withdrawn: {submission.title}"
    body = (
        f"Dear {reviewer.full_name},\n\n"
        f"Your review assignment for the manuscript \"{submission.title}\" has been withdrawn by the editor."
        f"\n\nNo further action is required from you.\n\n"
        f"Regards,\nTechnical Journal"
    )
    try:
        send_mail(subject, body, _journal_from_email(), [reviewer.email], fail_silently=False)
        return True
    except Exception as e:
        print(f"Failed to send withdrawal email for assignment {assignment.id}: {e}")
        return False


def send_editor_decision_notification(submission: Submission, editor: User):
    """Email notification to author(s) when editor makes a final decision."""
    recipient_emails = set()
    if submission.submitted_by and submission.submitted_by.email:
        recipient_emails.add(submission.submitted_by.email)
    if submission.corresponding_author and submission.corresponding_author.email:
        recipient_emails.add(submission.corresponding_author.email)

    if not recipient_emails:
        return False

    decision = submission.final_decision or 'pending'
    manuscript_code = _get_manuscript_code(submission)
    subject = f"Manuscript status updated: {submission.title}"
    body = (
        f"Dear Author,\n\n"
        f"Your manuscript '{submission.title}' has a new editorial decision.\n\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Editor: {editor.full_name or editor.email}\n"
        f"Final Decision: {decision}\n"
        f"Current Status: {submission.current_status}\n"
        f"Remarks: {submission.decision_remarks or 'None provided'}\n\n"
        f"You can view details in your author dashboard.\n\n"
        f"Regards,\nTechnical Journal Editorial Team"
    )

    from_email = _journal_from_email()
    try:
        send_mail(
            subject,
            body,
            from_email,
            list(recipient_emails),
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send editor decision email: {e}")
        return False

    return True


def send_revision_extension_decision_email(submission: Submission, editor: User, decision: str, requested_due_date=None, note: str = '') -> bool:
    """Email author(s) when the editor approves or rejects a revision deadline extension request."""
    recipient_emails = set()
    if submission.submitted_by and submission.submitted_by.email:
        recipient_emails.add(submission.submitted_by.email)
    if submission.corresponding_author and submission.corresponding_author.email:
        recipient_emails.add(submission.corresponding_author.email)
    for author in submission.authors.all():
        if author.email:
            recipient_emails.add(author.email)

    if not recipient_emails:
        return False

    manuscript_code = getattr(submission, 'submission_code', None) or f"RRIJ_{submission.id}"
    decision_label = 'approved' if decision == 'approved' else 'rejected'
    subject = f"Revision extension request {decision_label} for Manuscript ID: {manuscript_code}"

    body = (
        f"Dear Author,\n\n"
        f"The editor has {decision_label} your request for an extension on the revised manuscript submission.\n\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Manuscript Title: {submission.title}\n"
        f"Editor: {editor.full_name or editor.email}\n"
        f"Decision: {decision_label.capitalize()}\n"
    )
    if decision == 'approved' and requested_due_date:
        body += f"New revision due date: {requested_due_date}\n"
    if note:
        body += f"Editor note: {note}\n"
    body += "\nPlease check your author dashboard for the latest update.\n\nRegards,\nTechnical Journal Editorial Team"

    try:
        send_mail(subject, body, _journal_from_email(), list(recipient_emails), fail_silently=False)
        return True
    except Exception as e:
        print(f"Failed to send revision extension decision email: {e}")
        return False


def send_submission_acknowledgement(submission: Submission, request=None) -> bool:
    """Send acknowledgement email to corresponding author / submitter after successful submission."""
    recipient = submission.corresponding_author or submission.submitted_by
    if not recipient or not recipient.email:
        return False

    manuscript_code = getattr(submission, 'submission_code', None) or f"#{submission.id}"
    if getattr(submission, 'created_at', None):
        local_submission_time = timezone.localtime(submission.created_at)
        submission_date = local_submission_time.strftime('%d %B %Y at %I:%M %p') + ' (GMT+6)'
    else:
        submission_date = 'Not available'

    subject = f"Submission received: {submission.title}"
    details_url = f"{_frontend_base_url(request)}/author-dashboard/submissions/{submission.id}"

    text_message = (
        f"Dear {recipient.full_name or recipient.email},\n\n"
        f"Thank you for submitting your manuscript to Technical Journal. We have received your submission:\n\n"
        f"Title: {submission.title}\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Submission date: {submission_date}\n"
        f"Current status: {submission.current_status or 'submitted'}\n\n"
        f"You can view your submission and track its progress here: {details_url}\n\n"
        f"If you have any questions, please contact the editorial office.\n\n"
        f"Regards,\nTechnical Journal"
    )

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height:1.5; color:#111;\">\n
      <p>Dear <strong>{recipient.full_name or recipient.email}</strong>,</p>\n
      <p>Thank you for submitting your manuscript to <strong>Technical Journal</strong>. We have received your submission:</p>\n
      <p><strong>Title:</strong> {submission.title}<br />\n      <strong>Manuscript ID:</strong> {manuscript_code}<br />\n      <strong>Submission date:</strong> {submission_date}<br />\n      <strong>Status:</strong> {submission.current_status or 'submitted'}</p>\n
      <p>You can view your submission and track progress here: <a href=\"{details_url}\">View submission</a></p>\n
      <p>Regards,<br /><strong>Technical Journal</strong></p>\n
    </div>\n
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [recipient.email],
            fail_silently=False,
            html_message=html_message,
        )
        return True
    except Exception as e:
        print(f"Failed to send submission acknowledgement to {recipient.email}: {e}")
        return False


def send_revision_submission_acknowledgement(version: SubmissionVersion, request=None) -> bool:
    """Send notification to the author after a revised manuscript version is successfully submitted."""
    submission = version.submission
    recipient = submission.corresponding_author or submission.submitted_by
    if not recipient or not recipient.email:
        return False

    manuscript_code = _get_manuscript_code(submission)
    revision_time = timezone.localtime(version.created_at) if getattr(version, 'created_at', None) else timezone.localtime(timezone.now())
    revision_date = revision_time.strftime('%d %B %Y at %I:%M %p') + ' (GMT+6)'
    subject = f"Revision submitted: {submission.title}"
    details_url = f"{_frontend_base_url(request)}/author-dashboard/submissions/{submission.id}"

    text_message = (
        f"Dear {recipient.full_name or recipient.email},\n\n"
        f"Your revised manuscript version has been received by Technical Journal.\n\n"
        f"Title: {submission.title}\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Revision version: {version.version_number}\n"
        f"Revision submitted at: {revision_date}\n"
        f"Current status: {submission.current_status or 'under review'}\n\n"
        f"You can view your manuscript and track the revision here: {details_url}\n\n"
        f"Regards,\nTechnical Journal"
    )

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height:1.5; color:#111;\">\n
      <p>Dear <strong>{recipient.full_name or recipient.email}</strong>,</p>\n
      <p>Your revised manuscript version has been received by <strong>Technical Journal</strong>.</p>\n
      <p><strong>Title:</strong> {submission.title}<br />\n      <strong>Manuscript ID:</strong> {manuscript_code}<br />\n      <strong>Revision version:</strong> {version.version_number}<br />\n      <strong>Revision submitted at:</strong> {revision_date}</p>\n
      <p>You can view your manuscript and track the revision here: <a href=\"{details_url}\">View submission</a></p>\n
      <p>Regards,<br /><strong>Technical Journal</strong></p>\n
    </div>\n
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [recipient.email],
            fail_silently=False,
            html_message=html_message,
        )
        return True
    except Exception as e:
        print(f"Failed to send revision submission acknowledgement to {recipient.email}: {e}")
        return False


def send_reviewer_application_received_email(application: ReviewerApplication, request=None) -> bool:
    recipient_email = application.email or (application.applicant.email if application.applicant and application.applicant.email else None)
    if not recipient_email:
        return False

    subject = "Thanks for applying to become a reviewer"
    text_message = (
        f"Dear {application.full_name or recipient_email},\n\n"
        f"Thank you for your reviewer application to Technical Journal. We have received your application and our editorial team will review it shortly.\n\n"
        f"Application details:\n"
        f"Name: {application.full_name or 'N/A'}\n"
        f"Email: {recipient_email}\n"
        f"Affiliation: {application.affiliation or 'N/A'}\n"
        f"Expertise: {application.expertise or 'N/A'}\n\n"
        f"We will notify you once the review team has made a decision.\n\n"
        f"Regards,\nTechnical Journal"
    )

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #111;\">
      <p>Dear <strong>{application.full_name or recipient_email}</strong>,</p>
      <p>Thank you for your reviewer application to <strong>Technical Journal</strong>. We have received your application and our editorial team will review it shortly.</p>
      <p><strong>Application details:</strong><br />
         Name: {application.full_name or 'N/A'}<br />
         Email: {recipient_email}<br />
         Affiliation: {application.affiliation or 'N/A'}<br />
         Expertise: {application.expertise or 'N/A'}</p>
      <p>We will notify you once the review team has made a decision.</p>
      <p>Regards,<br /><strong>Technical Journal</strong></p>
    </div>
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [recipient_email],
            fail_silently=False,
            html_message=html_message,
        )
        return True
    except Exception as exc:
        print(f"Failed to send reviewer application received email to {recipient_email}: {exc}")
        return False


def send_reviewer_application_status_email(application: ReviewerApplication, request=None) -> bool:
    recipient_email = application.email or (application.applicant.email if application.applicant and application.applicant.email else None)
    if not recipient_email:
        return False

    status_label = application.status.capitalize()
    subject = f"Reviewer application {status_label}"
    text_message = (
        f"Dear {application.full_name or recipient_email},\n\n"
        f"Your reviewer application has been {application.status}.\n\n"
        f"Name: {application.full_name or 'N/A'}\n"
        f"Email: {recipient_email}\n"
        f"Affiliation: {application.affiliation or 'N/A'}\n"
        f"Status: {status_label}\n\n"
    )
    if application.review_remarks:
        text_message += f"Editorial remarks:\n{application.review_remarks}\n\n"
    text_message += (
        f"If you have questions, please contact the editorial office.\n\n"
        f"Regards,\nTechnical Journal"
    )

    html_remarks = ''
    if application.review_remarks:
        replaced_remarks = application.review_remarks.replace('\n', '<br />')
        html_remarks = f"<p><strong>Editorial remarks:</strong><br />{replaced_remarks}</p>"

    html_message = f"""
    <div style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #111;\">
      <p>Dear <strong>{application.full_name or recipient_email}</strong>,</p>
      <p>Your reviewer application has been <strong>{application.status}</strong>.</p>
      <p><strong>Application details:</strong><br />
         Name: {application.full_name or 'N/A'}<br />
         Email: {recipient_email}<br />
         Affiliation: {application.affiliation or 'N/A'}<br />
         Status: {status_label}</p>
      {html_remarks}
      <p>If you have questions, please contact the editorial office.</p>
      <p>Regards,<br /><strong>Technical Journal</strong></p>
    </div>
    """

    try:
        send_mail(
            subject,
            text_message,
            _journal_from_email(),
            [recipient_email],
            fail_silently=False,
            html_message=html_message,
        )
        return True
    except Exception as exc:
        print(f"Failed to send reviewer application status email to {recipient_email}: {exc}")
        return False


def _is_submission_author(user: User, submission: Submission) -> bool:
    if not user or not user.is_authenticated:
        return False
    if submission.submitted_by_id == user.id:
        return True
    if submission.corresponding_author_id == user.id:
        return True
    return submission.authors.filter(id=user.id).exists()


def _is_submission_reviewer(user: User, submission: Submission) -> bool:
    if not user or not user.is_authenticated:
        return False
    return ReviewAssignment.objects.filter(
        submission=submission,
        assigned_to=user
    ).exclude(invite_response='rejected').exists()


def _send_manuscript_comment_notification(submission: Submission, sender: User, sender_role: str):
    """Notify opposite side when a new discussion comment is posted."""
    if sender_role == 'reviewer':
        recipient_emails = set()
        if submission.submitted_by and submission.submitted_by.email:
            recipient_emails.add(submission.submitted_by.email)
        if submission.corresponding_author and submission.corresponding_author.email:
            recipient_emails.add(submission.corresponding_author.email)
        for author in submission.authors.all():
            if author.email:
                recipient_emails.add(author.email)
        subject = f"New reviewer message on manuscript: {submission.title}"
        role_label = "reviewer"
    else:
        recipient_emails = set(
            ReviewAssignment.objects.filter(submission=submission)
            .exclude(invite_response='rejected')
            .values_list('assigned_to__email', flat=True)
        )
        recipient_emails = {e for e in recipient_emails if e}
        subject = f"New author message on manuscript: {submission.title}"
        role_label = "author"

    if not recipient_emails:
        return

    details_url = f"{_frontend_base_url()}/author-dashboard/submissions/{submission.id}"
    body = (
        f"A new message has been posted in the manuscript discussion thread.\n\n"
        f"Manuscript: {submission.title}\n"
        f"Posted by: {role_label.capitalize()}\n\n"
        f"Open details: {details_url}\n\n"
        f"Regards,\nTechnical Journal"
    )
    try:
        send_mail(
            subject,
            body,
            _journal_from_email(),
            list(recipient_emails),
            fail_silently=False,
        )
    except Exception as e:
        print(f"Failed to send manuscript comment notification: {e}")


def is_admin_or_editor(user):
    """Check if user is authenticated and has admin or editor role"""
    return bool(
        user and user.is_authenticated and (
            user.is_superuser or
            (user.role and user.role.name and user.role.name.lower() in ['admin', 'editor'])
        )
    )


class IsAdminOrEditor(IsAuthenticated):
    """Permission class: Allow if user is authenticated and is admin or editor"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Allow superuser, admin role, or editor role
        return is_admin_or_editor(request.user)


class CallForPapersAPIView(APIView):
    permission_classes = [IsAdminOrEditor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        # Support JSON or multipart/form-data (with optional attachment)
        emails = request.data.get('emails', [])
        # Normalize emails: accept JSON array, repeated form fields, or comma-separated string
        try:
            if hasattr(request.data, 'getlist'):
                maybe_list = request.data.getlist('emails')
                if maybe_list:
                    emails = maybe_list
        except Exception:
            pass

        if isinstance(emails, str):
            try:
                emails = json.loads(emails)
            except Exception:
                emails = [e.strip() for e in emails.split(',') if e.strip()]
        subject = request.data.get('subject', 'Call for Papers')
        message = request.data.get('message', '')
        attachment = request.FILES.get('attachment') if hasattr(request, 'FILES') else None

        attachment_bytes = None
        attachment_name = None
        attachment_type = None
        if attachment:
            try:
                attachment_bytes = attachment.read()
                attachment_name = getattr(attachment, 'name', None)
                attachment_type = getattr(attachment, 'content_type', None)
            except Exception:
                attachment_bytes = None

        # If 'all_authors' is passed, fetch all author emails
        if request.data.get('all_authors'):
            author_emails = list(User.objects.filter(role__name__iexact='author').values_list('email', flat=True))
            emails = list(set(emails) | set(author_emails))

        # Remove duplicates and empty
        emails = [e for e in set(emails) if e]
        if not emails:
            return Response({'error': 'No valid recipient emails provided.'}, status=400)
        if not message:
            return Response({'error': 'Message body is required.'}, status=400)

        sent_count = 0
        failed = []

        from django.conf import settings
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER)
        for email in emails:
            try:
                if attachment_bytes:
                    # Use EmailMessage to attach files
                    email_msg = EmailMessage(subject, message, from_email, [email])
                    try:
                        email_msg.attach(attachment_name or 'attachment', attachment_bytes, attachment_type)
                    except Exception:
                        # Fallback: attach without content type
                        email_msg.attach(attachment_name or 'attachment', attachment_bytes)
                    email_msg.send(fail_silently=False)
                else:
                    send_mail(
                        subject,
                        message,
                        from_email,
                        [email],
                        fail_silently=False,
                    )
                sent_count += 1
            except Exception as e:
                failed.append({'email': email, 'error': str(e)})

        return Response({
            'sent': sent_count,
            'failed': failed,
            'total': len(emails),
        })




class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Mark this as self-registration (not admin-created)
        # User will be inactive until email verification
        context['is_admin_created'] = False
        return context

    def perform_create(self, serializer):
        # Security: block admin/editor roles from public registration
        role = serializer.validated_data.get('role')
        if role and role.name.lower() in ['admin', 'editor']:
            raise serializers.ValidationError(
                "Cannot register as admin or editor via public API. Contact superadmin."
            )
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        send_email_verification_email(user)

        return Response({
            "message": "Registration successful. Please verify your email to activate your account.",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.name if user.role else None
            }
        }, status=status.HTTP_201_CREATED)

class PublicRoleListView(generics.ListAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [AllowAny]
    
# 2. Public Login (returns JWT + basic user info)
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')  # login with email
        password = request.data.get('password')
        
        user = User.objects.filter(email=email).first()
        if user and user.check_password(password):
            if not user.is_active:
                return Response(
                    {'error': 'Email not verified. Please verify your email before logging in.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            refresh = RefreshToken.for_user(user)
            # If user is superuser, always return role as 'admin'
            if user.is_superuser:
                user_role = 'admin'
            else:
                user_role = user.role.name if user.role else 'visitor'
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user_role
                }
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token', '')
        if not token:
            return Response({'error': 'Verification token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id, email = parse_email_verification_token(token)
        except SignatureExpired:
            return Response({'error': 'Verification link has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        except BadSignature:
            return Response({'error': 'Invalid verification token.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(id=user_id, email__iexact=email).first()
        if not user:
            return Response({'error': 'Invalid token or user not found.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({'message': 'Email already verified.'})

        user.is_active = True
        user.save(update_fields=['is_active'])

        return Response({'message': 'Email verified successfully. You may now login.'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Always return generic success to prevent account enumeration.
        generic_message = {
            'message': 'If the email exists, a password reset link has been sent.'
        }

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(generic_message, status=status.HTTP_200_OK)

        token = make_password_reset_token(user)
        reset_url = build_password_reset_link(token, request)
        subject = "Reset your Technical Journal password"
        text_message = (
            f"Hello {user.full_name or 'User'},\n\n"
            f"We received a request to reset your Technical Journal account password.\n\n"
            f"Click the link below to reset your password:\n{reset_url}\n\n"
            f"This link will expire in 10 minutes.\n"
            f"If you did not request this, you can safely ignore this email.\n\n"
            f"Regards,\nTechnical Journal"
        )
        html_message = f"""
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <p>Hello <strong>{user.full_name or 'User'}</strong>,</p>
          <p>We received a request to reset your <strong>Technical Journal</strong> account password.</p>
          <p style="margin: 20px 0;">
            <a href="{reset_url}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">
              Reset Password
            </a>
          </p>
          <p>This link expires in <strong>10 minutes</strong>.</p>
          <p style="color:#6b7280;">If you did not request this, you can ignore this email.</p>
        </div>
        """

        from_email = _journal_from_email()
        try:
            send_mail(
                subject,
                text_message,
                from_email,
                [user.email],
                fail_silently=False,
                html_message=html_message,
            )
        except Exception as e:
            print(f"Failed to send password reset email to {email}: {e}")

        return Response(generic_message, status=status.HTTP_200_OK)


class ResetPasswordConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        new_password = request.data.get('new_password') or ''

        if not token:
            return Response(
                {'error': 'Reset token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id, token_email = parse_password_reset_token(token)
        except SignatureExpired:
            return Response({'error': 'This password reset link has expired. Please request a new one.'}, status=status.HTTP_410_GONE)
        except BadSignature:
            return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(id=user_id).first()
        if not user or (user.email or '').lower() != token_email.lower():
            return Response({'error': 'Invalid reset link'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)


class ContactMessageView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        email = (request.data.get('email') or '').strip()
        subject = (request.data.get('subject') or '').strip()
        message = (request.data.get('message') or '').strip()

        if not name or not email or not subject or not message:
            return Response(
                {'detail': 'Name, email, subject and message are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient = getattr(settings, 'CONTACT_RECEIVER_EMAIL', 'redwan.websoftbd@gmail.com')
        mail_subject = f"[Technical Journal Website] {subject}"
        mail_body = (
            "A new contact form message was submitted from the Technical Journal website.\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Subject: {subject}\n\n"
            "Message:\n"
            f"{message}\n"
        )

        try:
            send_mail(
                subject=mail_subject,
                message=mail_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {'detail': 'Failed to send message. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({'message': 'Message sent successfully.'}, status=status.HTTP_200_OK)


class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor: CRUD for announcement bar items.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return Announcement.objects.all().order_by('sort_order', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor: update/delete single announcement item.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAdminOrEditor]
    queryset = Announcement.objects.all()


class PublicAnnouncementListView(generics.ListAPIView):
    """
    Public: show only active announcements (used by Navbar marquee).
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Announcement.objects.filter(is_active=True).order_by('sort_order', '-created_at')


class NewsArticleListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor: CRUD for news cards shown on homepage/news pages.
    """
    serializer_class = NewsArticleSerializer
    permission_classes = [IsAdminOrEditor]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return NewsArticle.objects.all().order_by('sort_order', '-published_at', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class NewsArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NewsArticleSerializer
    permission_classes = [IsAdminOrEditor]
    queryset = NewsArticle.objects.all()
    parser_classes = [MultiPartParser, FormParser]


class PublicNewsArticleListView(generics.ListAPIView):
    serializer_class = NewsArticleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return NewsArticle.objects.filter(is_active=True).order_by('sort_order', '-published_at', '-created_at')


class PublicNewsArticleDetailView(generics.RetrieveAPIView):
    serializer_class = NewsArticleSerializer
    permission_classes = [AllowAny]
    queryset = NewsArticle.objects.filter(is_active=True).all()


class ImportantDateListCreateView(generics.ListCreateAPIView):
    serializer_class = ImportantDateSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return ImportantDate.objects.all().order_by('sort_order', 'date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ImportantDateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ImportantDateSerializer
    permission_classes = [IsAdminOrEditor]
    queryset = ImportantDate.objects.all()


class PublicImportantDateListView(generics.ListAPIView):
    serializer_class = ImportantDateSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return ImportantDate.objects.filter(is_active=True).order_by('sort_order', 'date', '-created_at')


class HeroImageListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor: CRUD for homepage hero carousel images.
    """
    serializer_class = HeroImageSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return HeroImage.objects.all().order_by('sort_order', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class HeroImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor: update/delete single hero image.
    """
    serializer_class = HeroImageSerializer
    permission_classes = [IsAdminOrEditor]
    queryset = HeroImage.objects.all()


class PublicHeroImageListView(generics.ListAPIView):
    """
    Public: active hero images for the homepage carousel.
    """
    serializer_class = HeroImageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return HeroImage.objects.filter(is_active=True).order_by('sort_order', '-created_at')


class CallForPaperAdvertizeListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor: CRUD for call for paper advertisements.
    """
    serializer_class = CallForPaperAdvertizeSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return CallForPaperAdvertize.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CallForPaperAdvertizeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor: update/delete single call for paper advertisement.
    """
    serializer_class = CallForPaperAdvertizeSerializer
    permission_classes = [IsAdminOrEditor]
    queryset = CallForPaperAdvertize.objects.all()


class PublicCallForPaperAdvertizeView(generics.ListAPIView):
    """
    Public: get active call for paper advertisement (usually only one at a time).
    Returns the most recent active advertisement with the latest inactive_after time.
    """
    serializer_class = CallForPaperAdvertizeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()
        # Get active ads that haven't expired (or have no expiry set)
        return CallForPaperAdvertize.objects.filter(
            is_active=True
        ).exclude(
            inactive_after__lt=now
        ).order_by('-created_at')[:1]  # Return at most one active ad


def _finalize_guideline_document(instance: GuidelineDocument, force_extract: bool = True) -> None:
    """
    Populate guideline extracted text + metadata.
    """
    if instance.file and (not instance.file_extension):
        instance.file_extension = os.path.splitext(instance.file.name)[1].lower().strip('.')

    if force_extract and instance.file:
        text, err = _extract_text_from_guideline_file(instance)
        instance.extracted_text = text
        instance.extraction_error = err

        # For faithful DOCX rendering, convert to PDF and store it.
        # Browsers can't render DOCX/DOC directly, and extracted text loses formatting.
        ext = (instance.file_extension or '').lower().strip('.')
        if ext == 'docx':
            file_path = instance.file.path if hasattr(instance.file, 'path') else None
            if file_path and os.path.exists(file_path):
                pdf_path, conv_err = _convert_docx_to_pdf(file_path)
                if pdf_path:
                    # Replace any previous converted file.
                    instance.rendered_pdf = None
                    with open(pdf_path, 'rb') as f:
                        instance.rendered_pdf.save(
                            os.path.basename(pdf_path),
                            DjangoFile(f),
                            save=False,
                        )
                elif conv_err:
                    # Keep conversion error in the same field to surface it in UI.
                    if instance.extraction_error:
                        instance.extraction_error = f"{instance.extraction_error}\n{conv_err}"
                    else:
                        instance.extraction_error = conv_err
            else:
                instance.extraction_error = instance.extraction_error or 'DOCX file missing on server.'
        else:
            # Prefer original PDF for embedding.
            instance.rendered_pdf = None

    # Deterministic public display: only one active guideline at a time.
    if instance.is_active:
        GuidelineDocument.objects.exclude(id=instance.id).update(is_active=False)

    instance.save(
        update_fields=[
            'file_extension',
            'extracted_text',
            'extraction_error',
            'rendered_pdf',
            'is_active',
        ]
    )


def _extract_text_from_manuscript_format_file(manuscript_format: ManuscriptFormatDocument) -> tuple[str, str]:
    if not manuscript_format.file:
        return '', 'No file attached.'

    file_path = manuscript_format.file.path if hasattr(manuscript_format.file, 'path') else None
    if not file_path or not os.path.exists(file_path):
        return '', 'Manuscript format file missing on server.'

    ext = (manuscript_format.file_extension or os.path.splitext(manuscript_format.file.name)[1]).lower().strip('.')
    if ext == 'pdf':
        return _extract_text_from_guideline_pdf(file_path)
    if ext in ['docx']:
        return _extract_text_from_guideline_docx(file_path)
    return '', f'Unsupported manuscript format file type: .{ext}'


def _finalize_manuscript_format_document(instance: ManuscriptFormatDocument, force_extract: bool = True) -> None:
    if instance.file and (not instance.file_extension):
        instance.file_extension = os.path.splitext(instance.file.name)[1].lower().strip('.')

    if force_extract and instance.file:
        text, err = _extract_text_from_manuscript_format_file(instance)
        instance.extracted_text = text
        instance.extraction_error = err

        ext = (instance.file_extension or '').lower().strip('.')
        if ext == 'docx':
            file_path = instance.file.path if hasattr(instance.file, 'path') else None
            if file_path and os.path.exists(file_path):
                pdf_path, conv_err = _convert_docx_to_pdf(file_path)
                if pdf_path:
                    instance.rendered_pdf = None
                    with open(pdf_path, 'rb') as f:
                        instance.rendered_pdf.save(
                            os.path.basename(pdf_path),
                            DjangoFile(f),
                            save=False,
                        )
                elif conv_err:
                    if instance.extraction_error:
                        instance.extraction_error = f"{instance.extraction_error}\n{conv_err}"
                    else:
                        instance.extraction_error = conv_err
            else:
                instance.extraction_error = instance.extraction_error or 'DOCX file missing on server.'
        else:
            instance.rendered_pdf = None

    if instance.is_active:
        ManuscriptFormatDocument.objects.exclude(id=instance.id).update(is_active=False)

    instance.save(
        update_fields=[
            'file_extension',
            'extracted_text',
            'extraction_error',
            'rendered_pdf',
            'is_active',
        ]
    )


class GuidelineDocumentListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor CRUD for guideline documents.
    """
    serializer_class = GuidelineDocumentAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if not is_admin_or_editor(self.request.user):
            return GuidelineDocument.objects.none()
        return GuidelineDocument.objects.all().order_by('sort_order', '-created_at')

    def perform_create(self, serializer):
        if not is_admin_or_editor(self.request.user):
            raise PermissionDenied("Only admin or editor can manage guidelines.")
        instance = serializer.save(created_by=self.request.user)
        _finalize_guideline_document(instance, force_extract=True)


class GuidelineDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor update/delete single guideline doc.
    - PATCH allows omitting `file` to keep existing file.
    """
    serializer_class = GuidelineDocumentAdminSerializer
    permission_classes = [IsAuthenticated]
    queryset = GuidelineDocument.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        obj = super().get_object()
        if not is_admin_or_editor(self.request.user):
            raise PermissionDenied("Only admin or editor can manage guidelines.")
        return obj

    def perform_update(self, serializer):
        instance = serializer.save()
        force = bool(self.request.FILES.get('file'))

        if force:
            _finalize_guideline_document(instance, force_extract=True)
        else:
            if instance.is_active:
                GuidelineDocument.objects.exclude(id=instance.id).update(is_active=False)


class PublicGuidelineDocumentListView(generics.ListAPIView):
    """
    Public read-only endpoint.
    Frontend displays the first active item.
    """
    serializer_class = GuidelineDocumentPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return GuidelineDocument.objects.filter(is_active=True).order_by('sort_order', '-created_at')


class ManuscriptFormatDocumentListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor CRUD for manuscript format templates.
    """
    serializer_class = ManuscriptFormatDocumentAdminSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if not is_admin_or_editor(self.request.user):
            return ManuscriptFormatDocument.objects.none()
        return ManuscriptFormatDocument.objects.all().order_by('sort_order', '-created_at')

    def perform_create(self, serializer):
        if not is_admin_or_editor(self.request.user):
            raise PermissionDenied("Only admin or editor can manage manuscript formats.")
        instance = serializer.save(created_by=self.request.user)
        _finalize_manuscript_format_document(instance, force_extract=True)


class ManuscriptFormatDocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor update/delete single manuscript format template.
    """
    serializer_class = ManuscriptFormatDocumentAdminSerializer
    permission_classes = [IsAuthenticated]
    queryset = ManuscriptFormatDocument.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        obj = super().get_object()
        if not is_admin_or_editor(self.request.user):
            raise PermissionDenied("Only admin or editor can manage manuscript formats.")
        return obj

    def perform_update(self, serializer):
        instance = serializer.save()
        force = bool(self.request.FILES.get('file'))

        if force:
            _finalize_manuscript_format_document(instance, force_extract=True)
        else:
            if instance.is_active:
                ManuscriptFormatDocument.objects.exclude(id=instance.id).update(is_active=False)


class PublicManuscriptFormatDocumentListView(generics.ListAPIView):
    """
    Public read-only endpoint for manuscript format templates.
    """
    serializer_class = ManuscriptFormatDocumentPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return ManuscriptFormatDocument.objects.filter(is_active=True).order_by('sort_order', '-created_at')


# ==================== About Page Content Views ====================

class AboutPageContentListCreateView(generics.ListCreateAPIView):
    """
    Admin/Editor endpoint to list and create About page content sections.
    """
    serializer_class = AboutPageContentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Allow admin and editor roles
        if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
            return AboutPageContent.objects.all().order_by('sort_order', 'section')
        return AboutPageContent.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user)


class AboutPageContentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin/Editor endpoint to update or delete a specific About page section.
    """
    serializer_class = AboutPageContentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
            return AboutPageContent.objects.all()
        return AboutPageContent.objects.none()


class PublicAboutPageContentView(generics.ListAPIView):
    """
    Public read-only endpoint for the About page.
    Returns all active sections ordered by sort_order.
    """
    serializer_class = AboutPageContentPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return AboutPageContent.objects.filter(is_active=True).order_by('sort_order', 'section')


class ManuscriptCommentListCreateView(generics.ListCreateAPIView):
    """
    Reviewer-author discussion thread for a manuscript.
    Anonymous by role (author/reviewer), no personal identity fields returned.
    """
    serializer_class = ManuscriptCommentSerializer
    permission_classes = [IsAuthenticated]

    def _get_submission(self):
        submission_id = self.request.query_params.get('submission') or self.request.data.get('submission')
        if not submission_id:
            return None
        try:
            return Submission.objects.get(id=int(submission_id))
        except (ValueError, Submission.DoesNotExist):
            return None

    def _resolve_sender_role(self, user: User, submission: Submission):
        if _is_submission_reviewer(user, submission):
            return 'reviewer'
        if _is_submission_author(user, submission):
            return 'author'
        return None

    def get_queryset(self):
        submission = self._get_submission()
        if not submission:
            return ManuscriptComment.objects.none()

        sender_role = self._resolve_sender_role(self.request.user, submission)
        if not sender_role:
            return ManuscriptComment.objects.none()

        return ManuscriptComment.objects.filter(submission=submission).order_by('created_at')

    def list(self, request, *args, **kwargs):
        if not request.query_params.get('submission'):
            return Response({'detail': 'submission query parameter is required'}, status=400)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        submission = self._get_submission()
        if not submission:
            raise PermissionDenied("Valid submission is required.")

        sender_role = self._resolve_sender_role(self.request.user, submission)
        if not sender_role:
            raise PermissionDenied("You are not allowed to comment on this manuscript.")

        comment = serializer.save(
            submission=submission,
            sender=self.request.user,
            sender_role=sender_role,
        )
        _send_manuscript_comment_notification(submission, self.request.user, sender_role)
        return comment


class ManuscriptCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ManuscriptCommentSerializer
    permission_classes = [IsAuthenticated]
    queryset = ManuscriptComment.objects.select_related('submission', 'sender').all()

    def get_object(self):
        obj = super().get_object()
        user = self.request.user

        is_participant = _is_submission_author(user, obj.submission) or _is_submission_reviewer(user, obj.submission)
        if not is_participant:
            raise PermissionDenied("You are not allowed to access this comment.")
        return obj

    def perform_update(self, serializer):
        obj = self.get_object()
        if obj.sender_id != self.request.user.id:
            raise PermissionDenied("You can edit only your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.sender_id != self.request.user.id:
            raise PermissionDenied("You can delete only your own comments.")
        instance.delete()


# 3. Admin/Editor: List / Create users (minimal serializer for admin/editor panel)
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAdminOrEditor]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Mark this as admin-created so user is active immediately (no verification needed)
        context['is_admin_created'] = True
        return context

    def perform_create(self, serializer):
        user = serializer.save()
        # Send a welcome email to the newly created user.
        raw_password = getattr(serializer, '_created_password', None)
        send_admin_welcome_email(user, raw_password)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer  # ← Use the update-specific serializer
    permission_classes = [IsAdminOrEditor]



class UserListView(generics.ListAPIView):
    """
    List all users with full details (for admin/editor dashboard table)
    Supports optional `role` query parameter for comma-separated role filtering.
    """
    queryset = User.objects.all().order_by('-date_joined')  # newest first
    serializer_class = UserListSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        queryset = super().get_queryset()
        role_param = self.request.query_params.get('role')
        if role_param:
            roles = [r.strip() for r in role_param.split(',') if r.strip()]
            if roles:
                role_query = models.Q()
                for role_name in roles:
                    role_query |= models.Q(role__name__iexact=role_name)
                queryset = queryset.filter(role_query)
        return queryset

# New endpoint for public author list (manuscript submission form)
class PublicAuthorListView(generics.ListAPIView):
    """
    List all authors (users with author role) for public submission form
    """
    queryset = User.objects.filter(role__name__iexact='author').order_by('-date_joined')
    serializer_class = UserListSerializer
    permission_classes = [AllowAny]

# 5. Role Management (admin/editor)
class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrEditor]

    def perform_create(self, serializer):
        if Role.objects.filter(name=serializer.validated_data['name']).exists():
            raise serializers.ValidationError("Role with this name already exists.")
        serializer.save()


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrEditor]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.users.exists():
            return Response(
                {"error": "Cannot delete role because users are assigned to it."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileUpdateSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)  # allow partial updates
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "message": "Profile updated successfully",
            "profile": serializer.data
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        print(f"ChangePasswordView POST request received")
        print(f"Authorization header: {request.META.get('HTTP_AUTHORIZATION', 'NOT PROVIDED')}")
        print(f"User: {request.user}")
        print(f"User authenticated: {request.user.is_authenticated}")
        
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password:
            return Response(
                {'error': 'Current password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not new_password:
            return Response(
                {'error': 'New password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify current password
        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Validate new password length
        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)

class EditorialBoardListCreateView(generics.ListCreateAPIView):
    queryset = EditorialBoardMember.objects.all()
    serializer_class = EditorialBoardMemberSerializer
    permission_classes = [IsAdminOrEditor]

    def perform_create(self, serializer):
        serializer.save()


class EditorialBoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EditorialBoardMember.objects.all()
    serializer_class = EditorialBoardMemberSerializer
    permission_classes = [IsAdminOrEditor]
    
class PublicEditorialBoardListView(generics.ListAPIView):
    queryset = EditorialBoardMember.objects.all().order_by('order', 'name')
    serializer_class = EditorialBoardMemberSerializer
    permission_classes = [AllowAny]


class SubmissionListCreateView(generics.ListCreateAPIView):
    """
    Handle both GET (list all submissions for admin) and POST (create new submission)
    GET: Admin only - returns all submissions
    POST: Authenticated users - creates new submission
    """
    queryset = Submission.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        # Use different serializers for GET vs POST
        if self.request.method == 'GET':
            return SubmissionDetailSerializer
        return SubmissionSerializer

    def get_queryset(self):
        # Allow both custom role 'admin' and Django superuser to view all submissions
        if self.request.method == 'GET':
            user = self.request.user
            if not (user.is_superuser or (user.role and user.role.name.lower() == 'admin')or (user.role and user.role.name.lower() == 'editor')):
                return Submission.objects.none()
        return super().get_queryset()

    def get_permissions(self):
        # GET requires admin or editor, POST requires authentication
        if self.request.method == 'GET':
            return [IsAdminOrEditor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        current_deadline = SubmissionDeadline.get_current_deadline()
        if current_deadline and current_deadline.is_expired:
            raise serializers.ValidationError(
                f"Manuscript submission deadline has passed ({current_deadline.deadline.strftime('%Y-%m-%d %H:%M')}). "
                "Please contact the editorial office for late submissions or extensions."
            )
        submission = serializer.save(submitted_by=self.request.user)
        # Create immutable version history entry for the initial upload.
        SubmissionVersion.objects.create(
            submission=submission,
            version_number=1,
            version_type='initial',
            file=submission.files,
            created_by=self.request.user,
            based_on_decision='initial_submission',
        )
        # Send acknowledgement email to author
        try:
            send_submission_acknowledgement(submission, request=self.request)
        except Exception:
            # Fail silently from API perspective; log to console
            print(f"Failed to send submission acknowledgement for submission {submission.id}")

class DeadlineListCreateView(generics.ListCreateAPIView):
    queryset = SubmissionDeadline.objects.all().order_by('-deadline')
    serializer_class = SubmissionDeadlineSerializer
    permission_classes = [IsAdminOrEditor]

class DeadlineDetailView(generics.RetrieveUpdateDestroyAPIView):   
    queryset = SubmissionDeadline.objects.all()
    serializer_class = SubmissionDeadlineSerializer
    permission_classes = [IsAdminOrEditor]

    def perform_update(self, serializer):
        # When updating (extending), update extended_by and extended_at
        serializer.save(
            extended_by=self.request.user,
            extended_at=timezone.now()
        )
    
class CurrentDeadlineView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        deadline_obj = SubmissionDeadline.get_current_deadline()
        if not deadline_obj:
            return Response({"has_deadline": False})

        time_remaining = deadline_obj.time_remaining
        return Response({
            "has_deadline": True,
            "id": deadline_obj.id,
            "deadline": deadline_obj.deadline,
            "is_expired": deadline_obj.is_expired,
            "time_remaining": time_remaining,
            "note": deadline_obj.note,
        })


class SubmissionFileDownloadView(APIView):
    """
    Download submission file
    Admin/Editor can download any submission file
    """
    permission_classes = [IsAdminOrEditor]

    def get(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id)
            
            if not submission.files:
                return Response(
                    {'error': 'No file attached to this submission'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the file path
            file_path = submission.files.path
            
            # Check if file exists
            if not os.path.exists(file_path):
                return Response(
                    {'error': 'File not found on server'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the original filename
            original_filename = submission.files.name
            if original_filename:
                # Extract just the filename from the path (remove directory structure)
                original_filename = os.path.basename(original_filename)
            else:
                original_filename = f"{submission.title}.pdf"
            
            # Open and serve the file
            response = FileResponse(open(file_path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{original_filename}"'
            return response
            
        except Submission.DoesNotExist:
            return Response(
                {'error': 'Submission not found'},
                status=status.HTTP_404_NOT_FOUND
            )

class VolumeListCreateView(generics.ListCreateAPIView):
    queryset = Volume.objects.all()
    serializer_class = VolumeSerializer
    permission_classes = [IsAdminOrEditor]


class VolumeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Volume.objects.all()
    serializer_class = VolumeSerializer
    permission_classes = [IsAdminOrEditor]


class IssueListCreateView(generics.ListCreateAPIView):
    serializer_class = IssueSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        queryset = Issue.objects.all()

        # Filter by volume_id if provided in query params
        volume_id = self.request.query_params.get('volume')
        if volume_id:
            try:
                queryset = queryset.filter(volume_id=int(volume_id))
            except ValueError:
                pass  # ignore invalid volume_id

        # Optional: order by issue number
        return queryset.order_by('number')


class IssueDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer
    permission_classes = [IsAdminOrEditor]


class PaperListCreateView(generics.ListCreateAPIView):
    serializer_class = PaperSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        queryset = Paper.objects.all()

        # Filter by issue_id from query param (?issue=...)
        issue_id = self.request.query_params.get('issue')
        if issue_id:
            try:
                queryset = queryset.filter(issue_id=int(issue_id))
            except ValueError:
                pass  # ignore invalid ID

        # Optional: nice ordering
        return queryset.order_by('title')  # or 'created_at', etc.


class PaperDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paper.objects.all()
    serializer_class = PaperSerializer
    permission_classes = [IsAdminOrEditor]


class CreatePaperFromReadySubmissionView(APIView):
    permission_classes = [IsAdminOrEditor]

    def post(self, request):
        submission_id = request.data.get('submission_id')
        issue_id = request.data.get('issue_id')
        if not submission_id or not issue_id:
            return Response({'detail': 'submission_id and issue_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission = Submission.objects.get(pk=submission_id, current_status='ready_for_publication')
        except Submission.DoesNotExist:
            return Response({'detail': 'Ready submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            issue = Issue.objects.get(pk=issue_id)
        except Issue.DoesNotExist:
            return Response({'detail': 'Issue not found.'}, status=status.HTTP_404_NOT_FOUND)

        source_file = submission.files if submission.files else None
        if not source_file:
            latest_version = submission.versions.order_by('-version_number').first()
            if latest_version and latest_version.file:
                source_file = latest_version.file

        if not source_file:
            return Response({'detail': 'Selected manuscript has no file to copy.'}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title') or submission.title
        authors = request.data.get('authors') or (submission.manual_authors or '')
        abstract = request.data.get('abstract') or submission.abstract
        keywords = request.data.get('keywords') or submission.keywords
        pages = request.data.get('pages') or ''
        doi = request.data.get('doi') or ''

        try:
            source_file.open('rb')
            file_content = source_file.read()
        except Exception:
            return Response({'detail': 'Unable to read the manuscript file.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            try:
                source_file.close()
            except Exception:
                pass

        filename = os.path.basename(source_file.name)
        uploaded_file = SimpleUploadedFile(
            filename,
            file_content,
            content_type=getattr(source_file, 'content_type', None) or 'application/octet-stream',
        )

        serializer = PaperSerializer(data={
            'issue_id': issue.id,
            'title': title,
            'authors': authors,
            'abstract': abstract,
            'keywords': keywords,
            'pages': pages,
            'doi': doi,
            'file': uploaded_file,
        })
        serializer.is_valid(raise_exception=True)

        paper = Paper(
            issue=issue,
            title=title,
            authors=authors,
            abstract=abstract,
            keywords=keywords,
            pages=pages,
            doi=doi,
        )
        paper.file.save(filename, ContentFile(file_content), save=False)
        paper.save()

        serialized = PaperSerializer(paper).data
        return Response(serialized, status=status.HTTP_201_CREATED)


class BulkIssueDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):  # ← pk comes from URL <int:pk>
        try:
            issue = Issue.objects.get(pk=pk)  # ← use pk here
            papers = issue.papers.all()

            if not papers.exists():
                return Response({"detail": "No papers in this issue"}, status=404)

            merger = PdfMerger()

            # Cover image
            if issue.cover_image:
                try:
                    cover_path = issue.cover_image.path
                    cover_pdf = self.image_to_pdf(cover_path)
                    merger.append(cover_pdf)
                except Exception as e:
                    print(f"Cover image error: {e}")

            # Introductory file
            if issue.introductory_file:
                try:
                    intro_path = issue.introductory_file.path
                    if intro_path.lower().endswith('.pdf'):
                        merger.append(intro_path)
                except Exception as e:
                    print(f"Intro file error: {e}")

            # Papers
            for paper in papers.order_by('id'):
                try:
                    paper_path = paper.file.path
                    if paper_path.lower().endswith('.pdf'):
                        merger.append(paper_path)
                except Exception as e:
                    print(f"Paper {paper.id} error: {e}")

            if merger.pages == 0:
                return Response({"error": "No downloadable content"}, status=400)

            output = BytesIO()
            merger.write(output)
            merger.close()

            output.seek(0)
            response = HttpResponse(output, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Volume_{issue.volume.number}_Issue_{issue.number}_Full.pdf"'
            return response

        except Issue.DoesNotExist:
            return Response({"detail": "Issue not found"}, status=404)
        except Exception as e:
            print(f"Bulk download error: {e}")
            return Response({"detail": "Error generating PDF"}, status=500)

    def image_to_pdf(self, image_path):
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        img = Image.open(image_path)
        img_width, img_height = img.size

        a4_width, a4_height = A4
        ratio = min(a4_width / img_width, a4_height / img_height)
        new_width = img_width * ratio
        new_height = img_height * ratio
        x_offset = (a4_width - new_width) / 2
        y_offset = (a4_height - new_height) / 2

        c.drawImage(image_path, x_offset, y_offset, width=new_width, height=new_height)
        c.showPage()
        c.save()
        pdf_buffer.seek(0)
        return pdf_buffer


class CurrentIssueView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        latest_issue = Issue.objects.order_by('-volume__year', '-volume__number', '-number').first()
        if not latest_issue:
            return Response({"detail": "No issue published yet"}, status=404)
        
        serializer = IssueSerializer(latest_issue)
        return Response(serializer.data)
    
# Public volumes (read-only, newest first)
class PublicVolumeListView(generics.ListAPIView):
    serializer_class = VolumeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Volume.objects.all()
        year = self.request.query_params.get('year')
        if year:
            try:
                queryset = queryset.filter(year=int(year))
            except ValueError:
                pass
        return queryset.order_by('-year', '-number')

class PublicIssueListView(generics.ListAPIView):
    serializer_class = PublicIssueSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Issue.objects.all()

        # Filter by year if provided
        year = self.request.query_params.get('year')
        if year:
            try:
                queryset = queryset.filter(volume__year=int(year))
            except ValueError:
                pass

        # Filter by volume number if provided
        volume_number = self.request.query_params.get('volume__number')
        if volume_number:
            queryset = queryset.filter(volume__number=volume_number)

        # Filter by issue number if provided
        number = self.request.query_params.get('number')
        if number:
            queryset = queryset.filter(number=number)

        return queryset.order_by('-volume__year', '-volume__number', '-number')

# Public papers (read-only)
class PublicPaperListView(generics.ListAPIView):
    serializer_class = PaperSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Paper.objects.all()

        # Filter by issue_id if provided in query params (?issue=...)
        issue_id = self.request.query_params.get('issue')
        if issue_id:
            try:
                queryset = queryset.filter(issue_id=int(issue_id))
            except ValueError:
                pass  # ignore invalid issue_id

        # Filter by year if provided
        year = self.request.query_params.get('year')
        if year:
            try:
                queryset = queryset.filter(issue__volume__year=int(year))
            except ValueError:
                pass

        # Filter by search query across title, authors, keywords, and DOI
        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query)
                | Q(authors__icontains=search_query)
                | Q(keywords__icontains=search_query)
                | Q(doi__icontains=search_query)
            )

        # Optional: order nicely for display
        return queryset.order_by('title')  # or 'created_at', etc.
    
    
class IncrementPaperViewAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            paper = Paper.objects.get(pk=pk)
            paper.views += 1
            paper.save(update_fields=['views'])
            return Response({"views": paper.views})
        except Paper.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

class IncrementPaperDownloadAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            paper = Paper.objects.get(pk=pk)
            paper.downloads += 1
            paper.save(update_fields=['downloads'])
            return Response({"downloads": paper.downloads})
        except Paper.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        
class PublicPaperDetailView(RetrieveAPIView):
    queryset = Paper.objects.all()
    serializer_class = PaperSerializer
    permission_classes = [AllowAny]
    # lookup_field = 'id'  # or 'pk'

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)
        

def _parse_request_bool(value, default=False):
    """
    DRF multipart/form-data sends checkboxes as strings like 'true'/'false'.
    In Python, bool('false') is True — so we must parse explicitly.
    """
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    s = str(value).strip().lower()
    if s in ('', '0', 'false', 'no', 'off', 'null', 'none'):
        return False
    if s in ('true', '1', 'yes', 'on'):
        return True
    return default


class CustomPaperDownloadView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            paper = Paper.objects.get(pk=pk)
        except Paper.DoesNotExist:
            return Response({"detail": "Paper not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get choices from request body (must parse strings from FormData correctly)
        include_cover = _parse_request_bool(request.data.get('include_cover'), False)
        include_intro = _parse_request_bool(request.data.get('include_intro'), False)

        merger = PdfMerger()
        output = BytesIO()

        # 1. Cover image from the issue (if selected and exists)
        if include_cover and paper.issue.cover_image:
            try:
                cover_path = paper.issue.cover_image.path
                cover_pdf_buffer = self.image_to_pdf(cover_path)
                merger.append(cover_pdf_buffer)
            except Exception as e:
                print(f"Failed to add cover for paper {pk}: {e}")

        # 2. Introductory file from the issue (if selected and exists)
        if include_intro and paper.issue.introductory_file:
            try:
                intro_path = paper.issue.introductory_file.path
                if intro_path.lower().endswith('.pdf'):
                    merger.append(intro_path)
                else:
                    # Optional: skip or log warning if not PDF
                    print(f"Intro file is not PDF, skipping: {intro_path}")
            except Exception as e:
                print(f"Failed to add introductory file for paper {pk}: {e}")

        # 3. The main paper PDF (always included)
        try:
            paper_path = paper.file.path
            if paper_path.lower().endswith('.pdf'):
                merger.append(paper_path)
            else:
                # If paper is not PDF (rare), skip or handle differently
                print(f"Paper file is not PDF, skipping merge: {paper_path}")
                return Response({"detail": "Paper file is not a valid PDF"}, status=400)
        except Exception as e:
            print(f"Failed to add paper file {pk}: {e}")
            return Response({"detail": "Paper file not found or invalid"}, status=400)

        # Check if we have anything to return
        if merger.pages == 0:
            return Response({"detail": "No valid content to merge"}, status=400)

        # Finalize PDF
        merger.write(output)
        merger.close()
        output.seek(0)

        # Prepare response
        response = HttpResponse(output, content_type='application/pdf')
        safe_title = paper.title.replace(' ', '_').replace('/', '_')[:100]  # safe filename
        response['Content-Disposition'] = f'attachment; filename="{safe_title}_custom.pdf"'
        return response

    def image_to_pdf(self, image_path):
        """Convert single image to PDF page"""
        pdf_buffer = BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        try:
            img = Image.open(image_path)
            img_width, img_height = img.size

            a4_width, a4_height = A4
            ratio = min(a4_width / img_width, a4_height / img_height)
            new_width = img_width * ratio
            new_height = img_height * ratio
            x_offset = (a4_width - new_width) / 2
            y_offset = (a4_height - new_height) / 2

            c.drawImage(image_path, x_offset, y_offset, width=new_width, height=new_height)
        except Exception as e:
            print(f"Image to PDF conversion failed: {e}")
            # Fallback: empty page
            c.drawString(100, 750, "Cover image could not be loaded")

        c.showPage()
        c.save()
        pdf_buffer.seek(0)
        return pdf_buffer
    


class ReviewAssignmentListCreateView(generics.ListCreateAPIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = ReviewAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin and editor can see all assignments
        if is_admin_or_editor(user):
            return ReviewAssignment.objects.all().order_by('-assigned_at')

        return ReviewAssignment.objects.filter(
            assigned_to=user
        ).filter(
            Q(invite_response__isnull=True) | Q(invite_response='accepted')
        ).exclude(
            invite_response__in=['rejected', 'withdrawn']
        ).exclude(
            status='cancelled'
        ).order_by('-assigned_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReviewAssignmentCreateSerializer
        return ReviewAssignmentSerializer

    def perform_create(self, serializer):
        user = self.request.user
        # Allow both admin and editor to assign reviews
        if not is_admin_or_editor(user):
            raise PermissionDenied("Only admins or editors can assign reviews")

        assignment = serializer.save()
        try:
            send_review_assignment_invite_email(assignment, triggered_by=user)
        except Exception as e:
            # Don't fail the API if email sending has an issue
            print(f"Invite email send failed for assignment {assignment.id}: {e}")

        if self.request.method == 'POST':
            return ReviewAssignmentCreateSerializer
        return ReviewAssignmentSerializer

    def perform_create(self, serializer):
        user = self.request.user
        # Allow both admin and editor to assign reviews
        if not is_admin_or_editor(user):
            raise PermissionDenied("Only admins or editors can assign reviews")
        assignment = serializer.save()
        try:
            send_review_assignment_invite_email(assignment, triggered_by=user)
        except Exception as e:
            # Don't fail the API if email sending has an issue
            print(f"Invite email send failed for assignment {assignment.id}: {e}")
        

# class ReviewAssignmentDetailView(generics.RetrieveUpdateAPIView):
#     """
#     GET: Retrieve assignment details (admin or assigned user)
#     PATCH/PUT: Update assignment
#         - Admin: can update anything
#         - Assigned user (reviewer/EBM): can update status, remarks, report
#     """
#     queryset = ReviewAssignment.objects.all()
#     serializer_class = ReviewAssignmentSerializer
#     permission_classes = [IsAuthenticated]
#     parser_classes = [MultiPartParser, FormParser]
#     lookup_field = 'pk'

#     def get_object(self):
#         obj = super().get_object()
#         user = self.request.user

#         # Admin/editor can access any assignment
#         if is_admin_or_editor(user):
#             return obj

#         # Reviewers only their own
#         if obj.assigned_to == user:
#             return obj

#         raise PermissionDenied("You do not have permission to access this assignment.")

#     def perform_update(self, serializer):
#         user = self.request.user
#         instance = self.get_object()

#         # Admin/editor has full control
#         if is_admin_or_editor(user):
#             serializer.save()
#             return

#         # Assigned user (reviewer or editorial board member) can update only allowed fields
#         if instance.assigned_to == user:
#             allowed_fields = {'status', 'reviewer_remarks', 'review_report', 'plagiarism_report', 'comment_to_author', 'comment_to_editor', 'recommendation'}

#             # Safety check: only allowed fields are being sent
#             updated_fields = set(serializer.validated_data.keys())
#             if not updated_fields.issubset(allowed_fields):
#                 disallowed = updated_fields - allowed_fields
#                 raise PermissionDenied(f"You cannot update these fields: {', '.join(disallowed)}")

#             # Save first (without submitted_at)
#             instance = serializer.save()

#             # Now safely set submitted_at on the saved instance if status is completed
#             if instance.status == 'completed' and not instance.submitted_at:
#                 instance.submitted_at = timezone.now()
#                 instance.save(update_fields=['submitted_at'])

#             return

#         raise PermissionDenied("You are not authorized to update this assignment.")

#     def update(self, request, *args, **kwargs):
#         partial = kwargs.pop('partial', True)
#         instance = self.get_object()
#         serializer = self.get_serializer(instance, data=request.data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         self.perform_update(serializer)

#         return Response({
#             "message": "Assignment updated successfully",
#             "data": serializer.data
#         }, status=status.HTTP_200_OK)


# class ReviewAssignmentDetailView(generics.RetrieveUpdateAPIView):
#     queryset = ReviewAssignment.objects.all()
#     serializer_class = ReviewAssignmentSerializer
#     permission_classes = [IsAuthenticated]
#     parser_classes = [MultiPartParser, FormParser]
#     lookup_field = 'pk'

#     def get_object(self):
#         obj = super().get_object()
#         user = self.request.user

#         if is_admin_or_editor(user):
#             return obj

#         if obj.assigned_to == user:
#             return obj

#         raise PermissionDenied("You do not have permission to access this assignment.")

#     def perform_update(self, serializer):
#         user = self.request.user
#         instance = self.get_object()

#         if is_admin_or_editor(user):
#             serializer.save()
#             return

#         if instance.assigned_to != user:
#             raise PermissionDenied("You are not authorized to update this assignment.")

#         allowed_fields = {
#             'status', 'reviewer_remarks', 'review_report', 'plagiarism_report',
#             'comment_to_author', 'comment_to_editor', 'recommendation'
#         }

#         updated_fields = set(serializer.validated_data.keys())
#         if not updated_fields.issubset(allowed_fields):
#             disallowed = updated_fields - allowed_fields
#             raise PermissionDenied(f"You cannot update these fields: {', '.join(disallowed)}")

#         # Save the update (this handles files and text fields safely)
#         updated_instance = serializer.save()

#         # Only set submitted_at if status became 'completed' and it's not already set
#         if (updated_instance.status == 'completed' and 
#             not updated_instance.submitted_at):
#             updated_instance.submitted_at = timezone.now()
#             updated_instance.save(update_fields=['submitted_at'])

#     def update(self, request, *args, **kwargs):
#         partial = kwargs.pop('partial', True)
#         instance = self.get_object()
#         serializer = self.get_serializer(instance, data=request.data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         self.perform_update(serializer)

#         return Response({
#             "message": "Assignment updated successfully",
#             "data": serializer.data
#         }, status=status.HTTP_200_OK)



# class ReviewAssignmentDetailView(generics.RetrieveUpdateAPIView):
#     queryset = ReviewAssignment.objects.all()
#     serializer_class = ReviewAssignmentSerializer
#     permission_classes = [IsAuthenticated]
#     parser_classes = [MultiPartParser, FormParser]
#     lookup_field = 'pk'

#     def get_object(self):
#         obj = super().get_object()
#         user = self.request.user

#         if is_admin_or_editor(user) or obj.assigned_to == user:
#             return obj

#         raise PermissionDenied("You do not have permission to access this assignment.")

#     def perform_update(self, serializer):
#         user = self.request.user
#         instance = self.get_object()

#         # Admin/Editor: full control
#         if is_admin_or_editor(user):
#             serializer.save()
#             return

#         # Reviewer only allowed fields
#         if instance.assigned_to != user:
#             raise PermissionDenied("You are not authorized to update this assignment.")

#         allowed_fields = {
#             'status', 'reviewer_remarks', 'review_report', 'plagiarism_report',
#             'comment_to_author', 'comment_to_editor', 'recommendation'
#         }

#         updated_fields = set(serializer.validated_data.keys())
#         if not updated_fields.issubset(allowed_fields):
#             disallowed = updated_fields - allowed_fields
#             raise PermissionDenied(f"You cannot update these fields: {', '.join(disallowed)}")

#         # Save safely
#         updated_instance = serializer.save()

#         # Set submitted_at only when status becomes completed
#         if (updated_instance.status == 'completed' and 
#             not getattr(updated_instance, 'submitted_at', None)):
#             updated_instance.submitted_at = timezone.now()
#             updated_instance.save(update_fields=['submitted_at'])

#     def update(self, request, *args, **kwargs):
#         partial = kwargs.pop('partial', True)
#         instance = self.get_object()
#         serializer = self.get_serializer(instance, data=request.data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         self.perform_update(serializer)

#         return Response({
#             "message": "Assignment updated successfully",
#             "data": serializer.data
#         }, status=status.HTTP_200_OK)


class ReviewAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ReviewAssignment.objects.all()
    serializer_class = ReviewAssignmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    lookup_field = 'pk'

    def get_object(self):
        obj = super().get_object()
        user = self.request.user

        if obj.status == 'cancelled' or obj.invite_response == 'withdrawn':
            if is_admin_or_editor(user):
                return obj
            raise PermissionDenied("This review assignment was withdrawn.")

        if is_admin_or_editor(user) or obj.assigned_to == user:
            return obj

        raise PermissionDenied("You do not have permission to access this assignment.")

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()   # This is the current DB object

        if is_admin_or_editor(user):
            old_assigned_to = instance.assigned_to
            new_assigned_to = serializer.validated_data.get('assigned_to', old_assigned_to)

            if old_assigned_to != new_assigned_to and instance.invite_response in ['rejected', 'withdrawn']:
                def resolve_pk(value):
                    return getattr(value, 'id', value) if value is not None else None

                create_data = {
                    'submission': resolve_pk(instance.submission),
                    'submission_version': resolve_pk(serializer.validated_data.get('submission_version'))
                                           or resolve_pk(instance.submission_version),
                    'assigned_to': resolve_pk(new_assigned_to),
                    'due_date': serializer.validated_data.get('due_date', instance.due_date),
                    'admin_remarks': serializer.validated_data.get('admin_remarks', instance.admin_remarks),
                }
                create_serializer = ReviewAssignmentCreateSerializer(data=create_data, context=serializer.context)
                create_serializer.is_valid(raise_exception=True)
                new_assignment = create_serializer.save()
                try:
                    send_review_assignment_invite_email(new_assignment, triggered_by=user)
                except Exception as e:
                    print(f"Invite email send failed for reassigned assignment {new_assignment.id}: {e}")
                self.created_assignment = new_assignment
                return

            updated_instance = serializer.save()
            if old_assigned_to != updated_instance.assigned_to:
                try:
                    send_review_assignment_invite_email(updated_instance, triggered_by=user)
                except Exception as e:
                    print(f"Invite email send failed for reassigned assignment {updated_instance.id}: {e}")
            return

        if instance.assigned_to != user:
            raise PermissionDenied("You are not authorized to update this assignment.")

        allowed_fields = {
            'status', 'reviewer_remarks', 'review_report', 'plagiarism_report',
            'comment_to_author', 'comment_to_editor', 'recommendation',
            # Checklist fields
            'is_important_for_scientific_community', 'is_title_suitable', 'alternative_title',
            'is_abstract_comprehensive', 'is_intro_conclusion_sufficient', 'is_structure_appropriate',
            'are_references_sufficient', 'additional_references', 'is_language_quality_suitable',
        }

        updated_fields = set(serializer.validated_data.keys())
        if not updated_fields.issubset(allowed_fields):
            disallowed = updated_fields - allowed_fields
            raise PermissionDenied(f"You cannot update these fields: {', '.join(disallowed)}")

        # === Safe save ===
        # Save once with the serializer (handles files + text fields)
        updated_instance = serializer.save()

        # Only set submitted_at when status becomes completed AND it wasn't set before
        if (updated_instance.status == 'completed' and 
            not getattr(updated_instance, 'submitted_at', None)):
            updated_instance.submitted_at = timezone.now()
            updated_instance.save(update_fields=['submitted_at'])

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if hasattr(self, 'created_assignment'):
            created_data = ReviewAssignmentSerializer(self.created_assignment, context=serializer.context).data
            return Response({
                "message": "Assignment reassigned successfully",
                "data": created_data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Assignment updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class ReviewAssignmentReassignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user
        if not is_admin_or_editor(user):
            return Response({"detail": "Only admins or editors can manage reviewer reassignment."}, status=403)

        try:
            current_assignment = ReviewAssignment.objects.select_related('submission', 'submission_version', 'assigned_to').get(pk=pk)
        except ReviewAssignment.DoesNotExist:
            return Response({"detail": "Assignment not found"}, status=404)

        mode = (request.data.get('mode') or request.data.get('action') or 'add').strip().lower()
        if mode not in {'add', 'replace'}:
            return Response({"detail": "Invalid reassignment mode"}, status=400)

        new_reviewer_id = request.data.get('assigned_to') or request.data.get('new_assigned_to')
        if not new_reviewer_id:
            return Response({"detail": "New reviewer is required"}, status=400)

        try:
            new_reviewer = User.objects.get(pk=new_reviewer_id)
        except User.DoesNotExist:
            return Response({"detail": "Reviewer not found"}, status=404)

        if not (new_reviewer.role and new_reviewer.role.name and new_reviewer.role.name.lower() in ['reviewer', 'editorial_board']):
            return Response({"detail": "Selected user is not a reviewer"}, status=400)

        if mode == 'replace':
            confirm_replace = request.data.get('confirm_replace')
            if confirm_replace not in [True, 'true', 'True', 1, '1']:
                return Response({"detail": "Please confirm replacement before continuing"}, status=400)

            current_assignment.status = 'cancelled'
            current_assignment.invite_response = 'withdrawn'
            current_assignment.invite_rejection_note = 'Assignment withdrawn and replaced by a new reviewer.'
            current_assignment.save(update_fields=['status', 'invite_response', 'invite_rejection_note'])
            send_review_assignment_withdrawal_email(current_assignment, triggered_by=user)

        create_data = {
            'submission': current_assignment.submission_id,
            'submission_version': current_assignment.submission_version_id,
            'assigned_to': new_reviewer.id,
            'due_date': request.data.get('due_date') or current_assignment.due_date,
            'admin_remarks': request.data.get('admin_remarks', current_assignment.admin_remarks),
        }
        create_serializer = ReviewAssignmentCreateSerializer(data=create_data, context={'request': request})
        create_serializer.is_valid(raise_exception=True)
        new_assignment = create_serializer.save()

        try:
            send_review_assignment_invite_email(new_assignment, triggered_by=user)
        except Exception as e:
            print(f"Invite email send failed for reassigned assignment {new_assignment.id}: {e}")

        return Response({
            "message": "Reviewer reassignment processed successfully",
            "mode": mode,
            "current_assignment_id": current_assignment.id,
            "new_assignment_id": new_assignment.id,
            "current_assignment": ReviewAssignmentSerializer(current_assignment).data,
            "new_assignment": ReviewAssignmentSerializer(new_assignment).data,
        }, status=status.HTTP_201_CREATED)


class SendFeedbackToAuthorView(generics.UpdateAPIView):
    """API endpoint for editor/admin to send reviewer feedback to author."""
    queryset = ReviewAssignment.objects.all()
    serializer_class = ReviewAssignmentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if not is_admin_or_editor(user):
            raise PermissionDenied("Only editors and admins can send feedback to authors.")
        return obj

    def perform_update(self, serializer):
        instance = self.get_object()
        
        # Check if review is completed
        if instance.status != 'completed':
            raise ValidationError("Can only send feedback for completed reviews.")
        
        # Check if feedback was already sent
        if instance.feedback_sent_to_author:
            raise ValidationError("Feedback has already been sent to the author.")

        # Get the comment to author and checklist data
        feedback_data = {
            'reviewer_name': instance.assigned_to.full_name if instance.assigned_to else 'Unknown',
            'reviewer_email': instance.assigned_to.email if instance.assigned_to else '',
            'comment_to_author': instance.comment_to_author or '',
            'checklist': {
                'is_important_for_scientific_community': instance.is_important_for_scientific_community,
                'is_title_suitable': instance.is_title_suitable,
                'alternative_title': instance.alternative_title,
                'is_abstract_comprehensive': instance.is_abstract_comprehensive,
                'is_intro_conclusion_sufficient': instance.is_intro_conclusion_sufficient,
                'is_structure_appropriate': instance.is_structure_appropriate,
                'are_references_sufficient': instance.are_references_sufficient,
                'additional_references': instance.additional_references,
                'is_language_quality_suitable': instance.is_language_quality_suitable,
            },
            'recommendation': instance.recommendation,
            'sent_at': timezone.now().isoformat(),
            'sent_by': self.request.user.full_name,
        }

        # Send notification email to the author before marking feedback delivered.
        send_feedback_to_author_notification(
            assignment=instance,
            sender=self.request.user,
            request=self.request,
        )

        # Update the review assignment
        serializer.save(
            feedback_sent_to_author=True,
            feedback_sent_at=timezone.now(),
            feedback_sent_by=self.request.user
        )

        # Also update the submission's reviewer_feedback field
        submission = instance.submission
        current_feedback = submission.reviewer_feedback or []
        current_feedback.append(feedback_data)
        submission.reviewer_feedback = current_feedback
        submission.save(update_fields=['reviewer_feedback'])

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response({
            "message": "Feedback sent to author successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)
        
    def get_serializer(self, *args, **kwargs):
        # Use a minimal serializer that doesn't require all fields
        return super().get_serializer(*args, **kwargs)


class EditorSubmissionsListView(generics.ListAPIView):
    """Editor sees submissions; includes all submissions for editors and admins."""
    serializer_class = SubmissionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.role or user.role.name.lower() not in ['editor', 'admin']:
            return Submission.objects.none()
        queryset = Submission.objects.all()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            status_filter = status_filter.lower().strip()
            if status_filter == 'pending':
                # Allow use case where editor wants newly submitted papers
                queryset = queryset.filter(current_status='submitted')
            elif status_filter == 'desk_review':
                queryset = queryset.filter(desk_review_status='pending')
            elif status_filter == 'reviewed':
                queryset = queryset.filter(current_status__in=['under_review', 'revision_requested'])
            else:
                queryset = queryset.filter(current_status=status_filter)
        else:
            # By default, editors should not see submissions that are already accepted
            # and moved to publication workflow or completed archive in the general
            # submissions list. Allow explicit status queries to override this.
            queryset = queryset.exclude(current_status__in=['ready_for_publication', 'completed'])

        return queryset.order_by('-created_at')

class EditorDeskReviewView(generics.UpdateAPIView):
    """Editor performs desk review (screening)"""
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.role or user.role.name.lower() != 'editor':
            return Submission.objects.none()
        # Allow desk review on submissions assigned to this editor OR unassigned submissions
        return Submission.objects.filter(
            models.Q(editor_assigned=user) | models.Q(editor_assigned__isnull=True)
        ).filter(desk_review_status='pending')

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Assign editor if not already assigned
        if not instance.editor_assigned:
            instance.editor_assigned = self.request.user
            instance.editor_assigned_at = timezone.now()
        
        instance.desk_review_date = timezone.now()

        if instance.desk_review_status == 'passed':
            instance.current_status = 'under_review'
        elif instance.desk_review_status == 'desk_rejected':
            instance.current_status = 'rejected'

        instance.save(update_fields=['editor_assigned', 'editor_assigned_at', 'desk_review_date', 'current_status'])

        # Log action
        DecisionLog.objects.create(
            submission=instance,
            user=self.request.user,
            action=f"Desk review: {instance.desk_review_status}",
            remarks=instance.desk_review_remarks
        )

        # Notify author(s) on desk review decisions
        send_editor_decision_notification(instance, self.request.user)

class DecisionLogListView(ListAPIView):
    """
    Admin/Editor: List all decision logs (audit trail)
    """
    queryset = DecisionLog.objects.all().order_by('-timestamp')
    serializer_class = DecisionLogSerializer
    permission_classes = [IsAdminOrEditor]

class EditorAssignReviewersView(APIView):
    """Editor assigns reviewers to a submission"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        user = request.user
        if not user.role or user.role.name.lower() != 'editor':
            return Response({"detail": "Not authorized"}, status=403)

        try:
            submission = Submission.objects.get(pk=pk, editor_assigned=user)
        except Submission.DoesNotExist:
            return Response({"detail": "Submission not found or not assigned to you"}, status=404)

        reviewer_ids = request.data.get('reviewer_ids', [])
        submission_version_id = request.data.get('submission_version')

        submission_version = None
        if submission_version_id:
            try:
                submission_version = SubmissionVersion.objects.get(id=submission_version_id, submission=submission)
            except SubmissionVersion.DoesNotExist:
                return Response({"detail": "Selected manuscript version not found for this submission"}, status=400)
        else:
            submission_version = submission.versions.order_by('-version_number').first()

        if not reviewer_ids:
            return Response({"detail": "No reviewers selected"}, status=400)

        assigned = []
        for reviewer_id in reviewer_ids:
            try:
                reviewer = User.objects.get(id=reviewer_id, role__name='reviewer')
                assignment, created = ReviewAssignment.objects.get_or_create(
                    submission=submission,
                    submission_version=submission_version,
                    assigned_to=reviewer,
                    defaults={'due_date': timezone.now().date() + timezone.timedelta(days=21)}
                )
                assigned.append(assignment.id)
                if created:
                    try:
                        send_review_assignment_invite_email(assignment, triggered_by=user)
                    except Exception as e:
                        print(f"Invite email send failed for assignment {assignment.id}: {e}")
            except User.DoesNotExist:
                continue

        return Response({"message": "Reviewers assigned", "assigned_ids": assigned})


class ReviewInvitationPreviewView(APIView):
    """
    Public preview for an invitation token (title/keywords/abstract).
    This is used by the frontend invitation landing pages.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "")
        if not token:
            return Response({"detail": "Missing token"}, status=400)

        try:
            assignment_id, reviewer_id = parse_review_invite_token(token)
        except SignatureExpired:
            return Response({"detail": "Invitation link expired"}, status=410)
        except BadSignature:
            return Response({"detail": "Invalid invitation link"}, status=400)

        try:
            assignment = ReviewAssignment.objects.select_related("submission", "assigned_to").get(
                id=assignment_id, assigned_to_id=reviewer_id
            )
        except ReviewAssignment.DoesNotExist:
            return Response({"detail": "Invitation not found"}, status=404)

        sub = assignment.submission
        reviewer = assignment.assigned_to
        return Response({
            "assignment_id": assignment.id,
            "invite_response": assignment.invite_response,
            "invitation_sent_at": assignment.invitation_sent_at,
            "due_date": assignment.due_date,
            "admin_remarks": assignment.admin_remarks,
            "reviewer": {
                "id": reviewer.id,
                "full_name": reviewer.full_name,
                "email": reviewer.email,
            },
            "submission": {
                "id": sub.id,
                "title": sub.title,
                "keywords": sub.keywords,
                "abstract": sub.abstract,
            }
        })


class ReviewInvitationAcceptView(APIView):
    """
    Authenticated accept: reviewer must be logged in, and must match token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token") or request.query_params.get("token") or ""
        if not token:
            return Response({"detail": "Missing token"}, status=400)

        try:
            assignment_id, reviewer_id = parse_review_invite_token(token)
        except SignatureExpired:
            return Response({"detail": "Invitation link expired"}, status=410)
        except BadSignature:
            return Response({"detail": "Invalid invitation link"}, status=400)

        if request.user.id != reviewer_id:
            return Response({"detail": "This invitation does not belong to your account"}, status=403)

        try:
            assignment = ReviewAssignment.objects.select_related("submission", "assigned_to").get(
                id=assignment_id, assigned_to_id=reviewer_id
            )
        except ReviewAssignment.DoesNotExist:
            return Response({"detail": "Invitation not found"}, status=404)

        if assignment.status == "cancelled" or assignment.invite_response == "withdrawn":
            return Response({"detail": "This invitation has been withdrawn"}, status=409)

        if assignment.invite_response == "rejected":
            return Response({"detail": "This invitation was already rejected"}, status=409)

        assignment.invite_response = "accepted"
        assignment.invite_responded_at = timezone.now()
        if assignment.status == "assigned":
            assignment.status = "in_progress"
        assignment.save(update_fields=["invite_response", "invite_responded_at", "status"])

        return Response({"message": "Invitation accepted", "assignment_id": assignment.id})


class ReviewInvitationRejectView(APIView):
    """
    Public reject: does not require login, but requires a valid token.
    Sends an email to the journal with rejection details.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token") or request.query_params.get("token") or ""
        reasons = request.data.get("reasons") or []
        note = request.data.get("note") or ""

        if not token:
            return Response({"detail": "Missing token"}, status=400)

        try:
            assignment_id, reviewer_id = parse_review_invite_token(token)
        except SignatureExpired:
            return Response({"detail": "Invitation link expired"}, status=410)
        except BadSignature:
            return Response({"detail": "Invalid invitation link"}, status=400)

        try:
            assignment = ReviewAssignment.objects.select_related("submission", "assigned_to").get(
                id=assignment_id, assigned_to_id=reviewer_id
            )
        except ReviewAssignment.DoesNotExist:
            return Response({"detail": "Invitation not found"}, status=404)

        if assignment.status == "cancelled" or assignment.invite_response == "withdrawn":
            return Response({"detail": "This invitation has been withdrawn"}, status=409)

        if assignment.invite_response == "accepted":
            return Response({"detail": "This invitation was already accepted"}, status=409)

        if not isinstance(reasons, list):
            return Response({"detail": "Reasons must be a list"}, status=400)

        reasons = [str(r).strip() for r in reasons if str(r).strip()]

        assignment.invite_response = "rejected"
        assignment.invite_responded_at = timezone.now()
        assignment.invite_rejection_reasons = reasons
        assignment.invite_rejection_note = note
        assignment.status = "rejected"
        assignment.save(update_fields=[
            "invite_response", "invite_responded_at", "invite_rejection_reasons",
            "invite_rejection_note", "status"
        ])

        # Notify journal inbox
        notify = _journal_notify_email()
        reviewer = assignment.assigned_to
        sub = assignment.submission
        subject = f"Reviewer Rejected Assignment: {sub.title}"
        body = (
            f"Reviewer rejected the review invitation.\n\n"
            f"Reviewer: {reviewer.full_name} <{reviewer.email}>\n"
            f"Assignment ID: {assignment.id}\n"
            f"Submission ID: {sub.id}\n"
            f"Title: {sub.title}\n\n"
            f"Reasons:\n- " + "\n- ".join(reasons) + "\n\n"
            f"Additional note:\n{note}\n"
        )
        try:
            send_mail(subject, body, notify, [notify], fail_silently=False)
        except Exception as e:
            print(f"Failed to send rejection notification email: {e}")

        return Response({"message": "Rejection recorded. Thank you."})


class ReviewAssignmentResendInviteView(APIView):
    """
    Admin/editor action: resend invitation email for a specific assignment.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        user = request.user
        if not (user.is_superuser or (user.role and user.role.name and user.role.name.lower() in ["admin", "editor"])):
            return Response({"detail": "Not authorized"}, status=403)

        try:
            assignment = ReviewAssignment.objects.select_related("submission", "assigned_to").get(pk=pk)
        except ReviewAssignment.DoesNotExist:
            return Response({"detail": "Assignment not found"}, status=404)

        try:
            send_review_assignment_invite_email(assignment, triggered_by=user)
        except Exception as e:
            return Response({"detail": f"Failed to send email: {e}"}, status=500)

        return Response({"message": "Invitation email resent"})

class EditorFinalDecisionView(generics.UpdateAPIView):
    """Editor makes final decision"""
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.role or user.role.name.lower() != 'editor':
            return Submission.objects.none()
        return Submission.objects.filter(editor_assigned=user)

    def perform_update(self, serializer):
        instance = serializer.save()

        revision_due_date = self.request.data.get('revision_due_date') if isinstance(self.request.data, dict) else None
        if revision_due_date:
            instance.revision_due_date = revision_due_date

        # Update the workflow status based on the editor decision
        decision = (instance.final_decision or '').lower()
        if decision == 'accept':
            instance.current_status = 'ready_for_publication'
        elif decision in ['minor_revision', 'major_revision']:
            instance.current_status = 'revision_requested'
        elif decision == 'reject':
            instance.current_status = 'rejected'
        elif decision == 'pending':
            instance.current_status = 'desk_review'
        else:
            # Keep existing current_status for unknown values.
            pass

        instance.decision_date = timezone.now()

        if instance.final_decision in ['minor_revision', 'major_revision'] and instance.revision_due_date:
            instance.revision_extension_status = 'approved'

        instance.save(update_fields=['decision_date', 'current_status', 'revision_due_date', 'revision_extension_status'])

        # Log decision
        DecisionLog.objects.create(
            submission=instance,
            user=self.request.user,
            action=f"Final decision: {instance.final_decision}",
            remarks=instance.decision_remarks
        )

        # Notify author(s) by email
        send_editor_decision_notification(instance, self.request.user)


def send_publication_congratulation_email(submission: Submission, editor: User, request=None) -> bool:
    """Send congratulation email to author(s) when manuscript is published."""
    recipient_emails = set()
    recipient_names = []
    
    if submission.submitted_by and submission.submitted_by.email:
        recipient_emails.add(submission.submitted_by.email)
        recipient_names.append(submission.submitted_by.full_name or submission.submitted_by.email)
    
    if submission.corresponding_author and submission.corresponding_author.email and submission.corresponding_author.email not in recipient_emails:
        recipient_emails.add(submission.corresponding_author.email)
        recipient_names.append(submission.corresponding_author.full_name or submission.corresponding_author.email)
    
    for author in submission.authors.all():
        if author.email and author.email not in recipient_emails:
            recipient_emails.add(author.email)
            recipient_names.append(author.full_name or author.email)

    if not recipient_emails:
        return False

    author_names = ", ".join(recipient_names) if recipient_names else "Dear Author"
    dashboard_link = f"{_frontend_base_url(request)}/author-dashboard/my-submissions"
    manuscript_code = getattr(submission, 'submission_code', None) or f"RRIJ_{submission.id}"

    subject = f"Congratulations: Your Manuscript '{submission.title}' Has Been Published!"

    text_message = (
        f"Dear {author_names},\n\n"
        f"We are delighted to inform you that your manuscript has been successfully published in Technical Journal.\n\n"
        f"Manuscript Title: {submission.title}\n"
        f"Manuscript ID: {manuscript_code}\n"
        f"Manuscript Type: {submission.manuscript_type or 'Not specified'}\n"
        f"Publication Date: {timezone.now().strftime('%B %d, %Y')}\n\n"
        f"Your hard work and dedication in preparing this manuscript have contributed significantly to the scientific community. "
        f"We are proud to have published your research and hope it will make a meaningful impact in your field.\n\n"
        f"You can now view your published manuscript on our website and in your author dashboard.\n\n"
        f"Visit your dashboard: {dashboard_link}\n\n"
        f"Thank you for choosing Technical Journal as the platform for your research dissemination. "
        f"We look forward to receiving more submissions from you in the future.\n\n"
        f"Warm regards,\n"
        f"Technical Journal Editorial Team"
    )

    html_message = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🎉 Congratulations!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your Manuscript Has Been Published</p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 20px 0;">Dear <strong>{author_names}</strong>,</p>
        
        <p style="margin: 0 0 20px 0;">We are delighted to inform you that your manuscript has been <strong>successfully published</strong> in <strong>Technical Journal</strong>.</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 8px 0;"><strong>Manuscript Title:</strong><br />{submission.title}</p>
          <p style="margin: 8px 0;"><strong>Manuscript ID:</strong> {manuscript_code}</p>
          <p style="margin: 8px 0;"><strong>Manuscript Type:</strong> {submission.manuscript_type or 'Not specified'}</p>
          <p style="margin: 8px 0;"><strong>Publication Date:</strong> {timezone.now().strftime('%B %d, %Y')}</p>
        </div>
        
        <p style="margin: 0 0 20px 0;">Your hard work and dedication in preparing this manuscript have contributed significantly to the scientific community. We are proud to have published your research and hope it will make a meaningful impact in your field.</p>
        
        <p style="margin: 0 0 20px 0;">You can now view your published manuscript on our website and in your author dashboard.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="{dashboard_link}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Dashboard</a>
        </div>
        
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">Thank you for choosing Technical Journal as the platform for your research dissemination. We look forward to receiving more submissions from you in the future.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="margin: 0; font-size: 14px; color: #666;">Warm regards,<br /><strong>Technical Journal Editorial Team</strong></p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
    """

    from_email = _journal_from_email()
    try:
        send_mail(
            subject,
            text_message,
            from_email,
            list(recipient_emails),
            fail_silently=False,
            html_message=html_message,
        )
        return True
    except Exception as e:
        print(f"Failed to send publication congratulation email: {e}")
        return False


class AuthorRevisionExtensionRequestView(generics.UpdateAPIView):
    """Author requests an extension for a manuscript that needs revision."""
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Submission.objects.filter(
            models.Q(submitted_by=user) |
            models.Q(corresponding_author=user) |
            models.Q(authors=user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        requested_due_date = request.data.get('revision_due_date')
        reason = (request.data.get('revision_extension_reason') or '').strip()

        if not requested_due_date:
            return Response({'detail': 'Please provide a revised due date.'}, status=400)

        if (instance.final_decision or '').lower() not in ['minor_revision', 'major_revision']:
            return Response({'detail': 'Extension requests are only allowed for manuscripts requiring revision.'}, status=400)

        instance.revision_due_date = requested_due_date
        instance.revision_extension_reason = reason
        instance.revision_extension_status = 'requested'
        instance.revision_extension_requested_at = timezone.now()
        instance.save(update_fields=['revision_due_date', 'revision_extension_reason', 'revision_extension_status', 'revision_extension_requested_at'])

        DecisionLog.objects.create(
            submission=instance,
            user=request.user,
            action='Revision extension requested',
            remarks=reason or 'Author requested additional revision time.',
        )

        return Response({
            'message': 'Revision extension request submitted successfully.',
            'revision_due_date': instance.revision_due_date,
            'revision_extension_status': instance.revision_extension_status,
        }, status=status.HTTP_200_OK)


class EditorRevisionExtensionUpdateView(generics.UpdateAPIView):
    """Editor approves or updates the revision due date for a manuscript."""
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.role or user.role.name.lower() != 'editor':
            return Submission.objects.none()
        return Submission.objects.filter(editor_assigned=user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        action = (request.data.get('action') or request.data.get('decision') or 'approved').lower()
        requested_due_date = request.data.get('revision_due_date') or instance.revision_due_date
        note = (request.data.get('decision_note') or request.data.get('remarks') or '').strip()

        if action == 'approved' and not requested_due_date:
            return Response({'detail': 'Please provide the updated revision due date before approving.'}, status=400)

        if action == 'approved':
            instance.revision_due_date = requested_due_date
            instance.revision_extension_status = 'approved'
            instance.revision_extension_approved_by = request.user
            instance.revision_extension_requested_at = instance.revision_extension_requested_at or timezone.now()
            decision_text = 'Revision due date approved.'
            send_revision_extension_decision_email(instance, request.user, 'approved', requested_due_date, note)
        else:
            instance.revision_extension_status = 'rejected'
            instance.revision_extension_approved_by = request.user
            decision_text = note or 'Revision extension request rejected.'
            send_revision_extension_decision_email(instance, request.user, 'rejected', requested_due_date, note)

        instance.save(update_fields=['revision_due_date', 'revision_extension_status', 'revision_extension_approved_by', 'revision_extension_requested_at'])

        DecisionLog.objects.create(
            submission=instance,
            user=request.user,
            action='Revision extension decision' if action != 'approved' else 'Revision due date extended',
            remarks=decision_text,
        )

        return Response({
            'message': 'Revision extension decision updated successfully.',
            'revision_due_date': instance.revision_due_date,
            'revision_extension_status': instance.revision_extension_status,
        }, status=status.HTTP_200_OK)


class EditorPublishSubmissionView(generics.UpdateAPIView):
    """Editor publishes a ready-for-publication submission to completed archive."""
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.role or user.role.name.lower() != 'editor':
            return Submission.objects.none()
        return Submission.objects.filter(editor_assigned=user, current_status='ready_for_publication')

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.current_status = 'completed'
        instance.save(update_fields=['current_status'])

        DecisionLog.objects.create(
            submission=instance,
            user=self.request.user,
            action='Publish to Completed',
            remarks=instance.decision_remarks or 'Marked completed by editor'
        )
        
        # Send congratulation email to author(s)
        send_publication_congratulation_email(instance, self.request.user, self.request)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data or {}, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            'message': 'Submission published and moved to completed archive',
            'data': serializer.data,
        }, status=status.HTTP_200_OK)


class ReviewerListView(generics.ListAPIView):
    """
    List all users with role 'reviewer' (used by editors to assign)
    """
    serializer_class = UserListSerializer  # or a lighter one if you want
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only editors/admins should see this list
        user = self.request.user
        if not user.role or user.role.name.lower() not in ['editor', 'admin']:
            return User.objects.none()
        
        return User.objects.filter(role__name__iexact='reviewer').order_by('full_name')
    

class AuthorSubmissionsListView(generics.ListAPIView):
    """
    Returns all submissions where the user is:
    - submitted_by
    - corresponding_author
    - or one of the authors (co-authors)
    """
    serializer_class = SubmissionDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Submissions where user is submitter, corresponding author, OR co-author
        return Submission.objects.filter(
            models.Q(submitted_by=user) |
            models.Q(corresponding_author=user) |
            models.Q(authors=user)
        ).distinct().order_by('-created_at')

class SubmissionUpdateView(generics.UpdateAPIView):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [IsAdminOrEditor]
    lookup_field = 'pk'

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
            return Submission.objects.all()
        return Submission.objects.none()

    def perform_update(self, serializer):
        instance = serializer.save()

        if self.request.user.role and self.request.user.role.name.lower() == 'editor':
            # Keep workflow consistent: updates by editors to submission status should track current status "under_review" / "rejected" etc
            if instance.current_status == 'submitted' and instance.desk_review_status == 'passed':
                instance.current_status = 'under_review'
            if instance.current_status == 'rejected':
                instance.final_decision = 'reject'
            instance.save(update_fields=['current_status', 'final_decision'])

            DecisionLog.objects.create(
                submission=instance,
                user=self.request.user,
                action=f"Submission update by editor: {instance.current_status}",
                remarks=instance.decision_remarks or ''
            )
            send_editor_decision_notification(instance, self.request.user)


class AuthorSubmissionDetailView(generics.RetrieveAPIView):
    serializer_class = SubmissionDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def get_queryset(self):
        user = self.request.user
        try:
            pk = int(self.kwargs.get('pk'))
        except (TypeError, ValueError):
            print(f"Invalid pk: {self.kwargs.get('pk')}")
            return Submission.objects.none()

        qs = Submission.objects.filter(
            Q(submitted_by=user) |
            Q(corresponding_author=user) |
            Q(authors=user),
            id=pk  # use 'id' instead of 'pk' to be safe
        )

        print(f"User {user.email} (ID {user.id}) querying submission ID {pk}")
        print(f"Found {qs.count()} matching submissions")
        if qs.count() > 1:
            print("Multiple matches! Listing IDs:")
            for obj in qs:
                print(f" - Submission {obj.id}: submitted_by={obj.submitted_by_id}, corr={obj.corresponding_author_id}, authors={[a.id for a in obj.authors.all()]}")

        return qs

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        try:
            # Use .get() only after pk filter — should be 0 or 1 result
            obj = queryset.get()
        except Submission.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Submission not found or you do not have access.")
        except Submission.MultipleObjectsReturned:
            raise PermissionDenied("Multiple submissions matched unexpectedly - contact admin.")
        
        return obj


class SubmissionVersionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SubmissionVersionCreateSerializer
        return SubmissionVersionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = SubmissionVersion.objects.select_related('submission', 'created_by').all()

        if is_admin_or_editor(user):
            pass
        else:
            queryset = queryset.filter(
                Q(submission__submitted_by=user) |
                Q(submission__corresponding_author=user) |
                Q(submission__authors=user)
            ).distinct()

        submission_id = self.request.query_params.get('submission')
        if submission_id:
            queryset = queryset.filter(submission_id=submission_id)

        return queryset.order_by('submission_id', '-version_number')

    def perform_create(self, serializer):
        user = self.request.user
        submission = serializer.validated_data['submission']

        if not (
            submission.submitted_by_id == user.id or
            submission.corresponding_author_id == user.id or
            submission.authors.filter(id=user.id).exists()
        ):
            raise PermissionDenied("You are not allowed to submit revisions for this manuscript.")

        latest_decision = (submission.final_decision or '').lower()
        if latest_decision not in ['minor_revision', 'major_revision']:
            raise serializers.ValidationError(
                {"detail": "Revision upload is allowed only when final decision is minor or major revision."}
            )

        latest_version = submission.versions.order_by('-version_number').first()
        next_version_number = 1 if not latest_version else latest_version.version_number + 1

        new_version = serializer.save(
            version_number=next_version_number,
            version_type=latest_decision,
            created_by=user,
            based_on_decision=latest_decision,
        )

        # Keep submission workflow state in sync, but do NOT overwrite the original file field.
        # File history is tracked in SubmissionVersion records.
        submission.current_status = 'under_review'
        submission.final_decision = 'pending'
        submission.decision_remarks = ''
        submission.decision_date = None
        submission.save(update_fields=['current_status', 'final_decision', 'decision_remarks', 'decision_date'])

        try:
            send_revision_submission_acknowledgement(new_version, request=self.request)
        except Exception:
            print(f"Failed to send revision submission acknowledgement for submission {submission.id}")

        DecisionLog.objects.create(
            submission=submission,
            user=user,
            action=f"Revision submitted: V{new_version.version_number}",
            remarks=new_version.revision_note or ''
        )


class SubmissionVersionBySubmissionListView(generics.ListAPIView):
    serializer_class = SubmissionVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        submission_id = self.kwargs.get('pk')
        queryset = SubmissionVersion.objects.select_related('submission', 'created_by').filter(submission_id=submission_id)

        if is_admin_or_editor(user):
            return queryset.order_by('-version_number')

        return queryset.filter(
            Q(submission__submitted_by=user) |
            Q(submission__corresponding_author=user) |
            Q(submission__authors=user)
        ).distinct().order_by('-version_number')

class ReviewerApplicationListCreateView(generics.ListCreateAPIView):
    queryset = ReviewerApplication.objects.all().order_by('-submitted_at')
    serializer_class = ReviewerApplicationSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        application = serializer.save()
        send_reviewer_application_received_email(application, request=self.request)

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAdminOrEditor()]
        return [AllowAny()]

    def get_queryset(self):
        if self.request.method == 'GET':
            user = self.request.user
            if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
                return ReviewerApplication.objects.all().order_by('-submitted_at')
            return ReviewerApplication.objects.none()
        return super().get_queryset()

    
class ReviewerApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve single application
    PATCH: Admin/editor can update status + remarks
    DELETE: Admin/editor can permanently remove an application (allows re-apply)
    """
    queryset = ReviewerApplication.objects.all()
    serializer_class = ReviewerApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Restrict GET/PATCH/DELETE to admin/editor; other methods default to authenticated
        if self.request.method in ['GET', 'PATCH', 'DELETE']:
            user = self.request.user
            if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
                return [IsAdminOrEditor()]
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor']):
            application = self.get_object()
            previous_status = application.status
            updated_application = serializer.save(reviewed_by=user, reviewed_at=timezone.now())
            if previous_status != updated_application.status and updated_application.status in ['approved', 'rejected']:
                send_reviewer_application_status_email(updated_application, request=self.request)
                if updated_application.status == 'rejected':
                    updated_application.delete()
            return updated_application
        else:
            raise PermissionDenied("Only admin/editor can review applications")

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or (user.role and user.role.name.lower() in ['admin', 'editor'])):
            raise PermissionDenied("Only admin/editor can delete applications")
        # Delete the application record permanently
        instance.delete()


class ReviewerPerformanceView(APIView):
    """
    Calculate and return reviewer performance metrics
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not is_admin_or_editor(user):
            return Response({"detail": "Not authorized"}, status=403)

        # Get all reviewers
        reviewers = User.objects.filter(role__name__iexact='reviewer')

        reviewer_data = []
        total_reviews = 0
        total_completion_rate = 0
        total_timely_rate = 0
        reviewer_count = 0

        for reviewer in reviewers:
            assignments = ReviewAssignment.objects.filter(assigned_to=reviewer)

            total_assigned = assignments.count()
            completed_reviews = assignments.filter(status='completed').count()
            rejected_reviews = assignments.filter(invite_response='rejected').count()
            pending_reviews = assignments.filter(
                models.Q(status='pending') | 
                models.Q(status='in_progress') | 
                models.Q(invite_response='pending')
            ).count()

            # Calculate timely reviews (submitted before due date)
            timely_reviews = 0
            late_reviews = 0
            total_completion_days = 0
            completed_assignments = assignments.filter(status='completed', submitted_at__isnull=False)

            for assignment in completed_assignments:
                if assignment.submitted_at and assignment.due_date:
                    days_taken = (assignment.submitted_at.date() - assignment.assigned_at.date()).days
                    total_completion_days += days_taken

                    if assignment.submitted_at.date() <= assignment.due_date:
                        timely_reviews += 1
                    else:
                        late_reviews += 1

            average_completion_days = total_completion_days / completed_reviews if completed_reviews > 0 else 0
            completion_rate = (completed_reviews / total_assigned * 100) if total_assigned > 0 else 0
            timely_rate = (timely_reviews / completed_reviews * 100) if completed_reviews > 0 else 0

            reviewer_data.append({
                'id': reviewer.id,
                'full_name': reviewer.full_name,
                'email': reviewer.email,
                'total_assigned': total_assigned,
                'completed_reviews': completed_reviews,
                'rejected_reviews': rejected_reviews,
                'pending_reviews': pending_reviews,
                'timely_reviews': timely_reviews,
                'late_reviews': late_reviews,
                'average_completion_days': average_completion_days,
                'completion_rate': completion_rate,
                'timely_rate': timely_rate,
            })

            total_reviews += total_assigned
            total_completion_rate += completion_rate
            total_timely_rate += timely_rate
            reviewer_count += 1

        stats = {
            'totalReviewers': reviewer_count,
            'totalReviews': total_reviews,
            'averageCompletionRate': total_completion_rate / reviewer_count if reviewer_count > 0 else 0,
            'averageTimelyRate': total_timely_rate / reviewer_count if reviewer_count > 0 else 0,
        }

        return Response({
            'reviewers': reviewer_data,
            'stats': stats
        })


def _ssl_base_frontend():
    return _frontend_base_url()


def _generate_reviewer_invoice_number() -> str:
    return f"RVP-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _payment_return_urls(tran_id: str):
    base = _ssl_base_frontend()
    # Frontend pages to show result; they will call backend to confirm status.
    return {
        'success_url': f"{base}/author-dashboard/payments/success?tran_id={tran_id}",
        'fail_url': f"{base}/author-dashboard/payments/fail?tran_id={tran_id}",
        'cancel_url': f"{base}/author-dashboard/payments/cancel?tran_id={tran_id}",
        'ipn_url': f"{_frontend_base_url()}/api/sslcommerz/ipn/",  # not used by SSLCommerz; real IPN endpoint is backend. overwritten below.
    }


def _sslcommerz_init(payload: dict) -> dict:
    res = requests.post(settings.SSLCOMMERZ_INIT_URL, data=payload, timeout=30)
    res.raise_for_status()
    return res.json()


def _sslcommerz_validate(val_id: str) -> dict:
    params = {
        'val_id': val_id,
        'store_id': settings.SSLCOMMERZ_STORE_ID,
        'store_passwd': settings.SSLCOMMERZ_STORE_PASSWORD,
        'format': 'json',
    }
    res = requests.get(settings.SSLCOMMERZ_VALIDATE_URL, params=params, timeout=30)
    res.raise_for_status()
    return res.json()


class AdminSubmissionFeeUpsertView(APIView):
    """
    Admin/Editor sets processing fee for a submission.
    """
    permission_classes = [IsAdminOrEditor]

    def post(self, request, submission_id: int):
        try:
            submission = Submission.objects.get(id=submission_id)
        except Submission.DoesNotExist:
            return Response({'detail': 'Submission not found'}, status=404)

        amount = request.data.get('amount_bdt')
        is_enabled = bool(request.data.get('is_enabled'))
        note = request.data.get('note') or ''

        try:
            amount_val = float(amount)
        except Exception:
            return Response({'detail': 'amount_bdt must be a number'}, status=400)

        fee, _ = SubmissionFee.objects.get_or_create(submission=submission)
        fee.amount_bdt = amount_val
        fee.is_enabled = is_enabled
        fee.note = str(note)
        fee.set_by = request.user
        fee.save()

        return Response(SubmissionFeeSerializer(fee).data)


class AdminPaymentTransactionListView(generics.ListAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return PaymentTransaction.objects.select_related('submission', 'payer').all().order_by('-created_at')


class AuthorPaymentOverviewView(APIView):
    """
    Author sees fees + payment state for their submissions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only authors see their own submissions fee/payment summary.
        subs = Submission.objects.filter(submitted_by=request.user).order_by('-created_at')
        out = []
        for s in subs:
            fee = SubmissionFee.objects.filter(submission=s).first()
            last_tx = PaymentTransaction.objects.filter(submission=s, payer=request.user).order_by('-created_at').first()
            has_success = PaymentTransaction.objects.filter(submission=s, status='success').exists()
            out.append({
                'submission_id': s.id,
                'title': s.title,
                'created_at': s.created_at,
                'fee': None if not fee else {
                    'amount_bdt': str(fee.amount_bdt),
                    'is_enabled': bool(fee.is_enabled),
                    'note': fee.note or '',
                    'set_at': fee.set_at,
                },
                'payment': None if not last_tx else {
                    'tran_id': last_tx.tran_id,
                    'status': last_tx.status,
                    'amount_bdt': str(last_tx.amount_bdt),
                    'created_at': last_tx.created_at,
                },
                'has_success_payment': has_success,
            })
        return Response(out)


class AuthorInitiatePaymentView(APIView):
    """
    Author initiates a payment for a submission fee.
    Returns GatewayPageURL for redirect.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id: int):
        try:
            submission = Submission.objects.get(id=submission_id, submitted_by=request.user)
        except Submission.DoesNotExist:
            return Response({'detail': 'Submission not found'}, status=404)

        fee = SubmissionFee.objects.filter(submission=submission, is_enabled=True).first()
        if not fee or fee.amount_bdt <= 0:
            return Response({'detail': 'No active fee set for this submission'}, status=400)

        if PaymentTransaction.objects.filter(submission=submission, status='success').exists():
            return Response({'detail': 'This submission fee is already paid'}, status=409)

        tran_id = f"TJ-{submission.id}-{uuid.uuid4().hex[:10]}"

        # Build backend callback URLs (SSLCOMMERZ posts to backend).
        # Use request-based absolute URIs so dev/prod both work without code changes.
        success_url = request.build_absolute_uri('/api/sslcommerz/success/')
        fail_url = request.build_absolute_uri('/api/sslcommerz/fail/')
        cancel_url = request.build_absolute_uri('/api/sslcommerz/cancel/')
        ipn_url = request.build_absolute_uri('/api/sslcommerz/ipn/')

        init_payload = {
            'store_id': settings.SSLCOMMERZ_STORE_ID,
            'store_passwd': settings.SSLCOMMERZ_STORE_PASSWORD,
            'total_amount': str(fee.amount_bdt),
            'currency': 'BDT',
            'tran_id': tran_id,
            'success_url': success_url,
            'fail_url': fail_url,
            'cancel_url': cancel_url,
            'ipn_url': ipn_url,
            'product_name': 'Manuscript Processing Fee',
            'product_category': 'Journal',
            'product_profile': 'general',
            'cus_name': request.user.full_name or request.user.email,
            'cus_email': request.user.email or '',
            'cus_add1': request.user.address or 'N/A',
            'cus_city': request.user.city or 'N/A',
            'cus_country': request.user.country or 'Bangladesh',
            'cus_phone': request.user.mobile_number or 'N/A',
            'shipping_method': 'NO',
        }

        tx = PaymentTransaction.objects.create(
            submission=submission,
            payer=request.user,
            amount_bdt=fee.amount_bdt,
            currency='BDT',
            status='initiated',
            tran_id=tran_id,
            raw_init_payload=init_payload,
        )

        try:
            init_res = _sslcommerz_init(init_payload)
        except Exception as e:
            tx.status = 'failed'
            tx.raw_callback_payload = {'error': str(e)}
            tx.save(update_fields=['status', 'raw_callback_payload'])
            return Response({'detail': f'Payment gateway init failed: {e}'}, status=502)

        tx.raw_callback_payload = init_res
        tx.gateway_page_url = init_res.get('GatewayPageURL') or ''
        tx.sessionkey = init_res.get('sessionkey') or ''
        # SSLCommerz returns status: SUCCESS/FAILED
        if (init_res.get('status') or '').upper() == 'SUCCESS' and tx.gateway_page_url:
            tx.status = 'pending'
        else:
            tx.status = 'failed'
        tx.save(update_fields=['raw_callback_payload', 'gateway_page_url', 'sessionkey', 'status'])

        if tx.status != 'pending':
            return Response({'detail': 'Payment gateway rejected the request', 'gateway': init_res}, status=400)

        return Response({'tran_id': tran_id, 'gateway_page_url': tx.gateway_page_url})


class ReviewerPayoutListCreateView(APIView):
    permission_classes = [IsAdminOrEditor]

    def get(self, request):
        payouts = ReviewerPayout.objects.select_related('reviewer', 'submission', 'assignment', 'generated_by').all().order_by('-created_at')
        return Response(ReviewerPayoutSerializer(payouts, many=True).data)

    def post(self, request):
        serializer = ReviewerPayoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.validated_data['assignment']
        reviewer = assignment.assigned_to
        submission = assignment.submission

        payout = ReviewerPayout.objects.create(
            reviewer=reviewer,
            submission=submission,
            assignment=assignment,
            amount_bdt=serializer.validated_data['amount_bdt'],
            payment_method=serializer.validated_data.get('payment_method', 'bank_transfer'),
            status='completed',
            invoice_number=_generate_reviewer_invoice_number(),
            payment_reference=f"AUTO-{assignment.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}",
            notes=serializer.validated_data.get('notes', '') or f"Reviewer payout for review of '{submission.title}'.",
            generated_by=request.user,
            paid_at=timezone.now(),
        )

        invoice = {
            'invoice_number': payout.invoice_number,
            'issued_on': payout.created_at.isoformat(),
            'paid_on': payout.paid_at.isoformat() if payout.paid_at else None,
            'reviewer': {'id': reviewer.id, 'name': reviewer.full_name, 'email': reviewer.email},
            'paper': {'id': submission.id, 'title': submission.title, 'code': submission.submission_code or f'RRIJ-{submission.id}'},
            'assignment_id': assignment.id,
            'amount_bdt': str(payout.amount_bdt),
            'payment_method': payout.get_payment_method_display(),
            'status': payout.get_status_display(),
            'notes': payout.notes,
            'generated_by': request.user.full_name or request.user.email,
        }

        return Response({
            'message': 'Reviewer payout generated successfully.',
            'payout': ReviewerPayoutSerializer(payout).data,
            'invoice': invoice,
        }, status=status.HTTP_201_CREATED)


class ReviewerPayoutHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payouts = ReviewerPayout.objects.select_related('submission', 'assignment', 'generated_by').filter(reviewer=request.user).order_by('-created_at')
        return Response(ReviewerPayoutSerializer(payouts, many=True).data)


class AuthorPaymentTransactionStatusView(APIView):
    """
    Author checks status for a transaction (by tran_id).
    This is used by frontend success/fail/cancel pages after redirect.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tran_id = (request.query_params.get('tran_id') or '').strip()
        if not tran_id:
            return Response({'detail': 'tran_id is required'}, status=400)

        tx = PaymentTransaction.objects.select_related('submission').filter(tran_id=tran_id).order_by('-created_at').first()
        if not tx:
            return Response({'detail': 'Transaction not found'}, status=404)

        # Author must own the submission (or be the payer).
        if tx.submission.submitted_by_id != request.user.id and tx.payer_id != request.user.id:
            return Response({'detail': 'Not allowed'}, status=403)

        return Response({
            'tran_id': tx.tran_id,
            'status': tx.status,
            'amount_bdt': str(tx.amount_bdt),
            'submission_id': tx.submission_id,
            'submission_title': tx.submission.title,
            'created_at': tx.created_at,
            'updated_at': tx.updated_at,
        })


def _finalize_ssl_callback(request, status_value: str):
    payload = request.data if hasattr(request, 'data') else {}
    tran_id = payload.get('tran_id') or request.query_params.get('tran_id')
    if not tran_id:
        return Response({'detail': 'Missing tran_id'}, status=400)

    tx = PaymentTransaction.objects.filter(tran_id=tran_id).order_by('-created_at').first()
    if not tx:
        return Response({'detail': 'Transaction not found'}, status=404)

    tx.raw_callback_payload = payload
    tx.val_id = payload.get('val_id') or tx.val_id
    tx.status = status_value
    tx.save(update_fields=['raw_callback_payload', 'val_id', 'status'])

    # Validate on success/pending
    if tx.val_id and status_value in ['success', 'pending']:
        try:
            val_res = _sslcommerz_validate(tx.val_id)
            tx.raw_validation_payload = val_res
            vstatus = (val_res.get('status') or '').upper()
            if vstatus == 'VALID' or vstatus == 'VALIDATED':
                tx.status = 'success'
            elif vstatus == 'FAILED':
                tx.status = 'failed'
            elif vstatus == 'CANCELLED':
                tx.status = 'cancelled'
            else:
                tx.status = 'invalid'

            tx.bank_tran_id = val_res.get('bank_tran_id') or ''
            tx.card_type = val_res.get('card_type') or ''
            tx.card_brand = val_res.get('card_brand') or ''
            tx.card_issuer = val_res.get('card_issuer') or ''
            tx.risk_level = str(val_res.get('risk_level') or '')
            tx.risk_title = str(val_res.get('risk_title') or '')
            tx.save(update_fields=[
                'raw_validation_payload', 'status',
                'bank_tran_id', 'card_type', 'card_brand', 'card_issuer',
                'risk_level', 'risk_title',
            ])
        except Exception as e:
            # keep callback status, but mark as invalid
            tx.status = 'invalid'
            tx.raw_validation_payload = {'error': str(e)}
            tx.save(update_fields=['status', 'raw_validation_payload'])

    # Redirect author back to frontend result page
    base = _frontend_base_url()
    return_url = f"{base}/author-dashboard/payments"
    if tx.status == 'success':
        return_url = f"{base}/author-dashboard/payments/success?tran_id={tx.tran_id}"
    elif tx.status == 'failed':
        return_url = f"{base}/author-dashboard/payments/fail?tran_id={tx.tran_id}"
    elif tx.status == 'cancelled':
        return_url = f"{base}/author-dashboard/payments/cancel?tran_id={tx.tran_id}"
    return HttpResponse(status=302, headers={'Location': return_url})


def _finalize_ssl_ipn(request):
    """
    Server-to-server IPN handler: update tx + validate (no redirects).
    """
    payload = request.data if hasattr(request, 'data') else {}
    tran_id = payload.get('tran_id') or request.query_params.get('tran_id')
    if not tran_id:
        return Response({'detail': 'Missing tran_id'}, status=400)

    tx = PaymentTransaction.objects.filter(tran_id=tran_id).order_by('-created_at').first()
    if not tx:
        return Response({'detail': 'Transaction not found'}, status=404)

    tx.raw_callback_payload = payload
    tx.val_id = payload.get('val_id') or tx.val_id
    tx.status = 'pending'
    tx.save(update_fields=['raw_callback_payload', 'val_id', 'status'])

    if tx.val_id:
        try:
            val_res = _sslcommerz_validate(tx.val_id)
            tx.raw_validation_payload = val_res
            vstatus = (val_res.get('status') or '').upper()
            if vstatus in ['VALID', 'VALIDATED']:
                tx.status = 'success'
            elif vstatus == 'FAILED':
                tx.status = 'failed'
            elif vstatus == 'CANCELLED':
                tx.status = 'cancelled'
            else:
                tx.status = 'invalid'

            tx.bank_tran_id = val_res.get('bank_tran_id') or ''
            tx.card_type = val_res.get('card_type') or ''
            tx.card_brand = val_res.get('card_brand') or ''
            tx.card_issuer = val_res.get('card_issuer') or ''
            tx.risk_level = str(val_res.get('risk_level') or '')
            tx.risk_title = str(val_res.get('risk_title') or '')
            tx.save(update_fields=[
                'raw_validation_payload', 'status',
                'bank_tran_id', 'card_type', 'card_brand', 'card_issuer',
                'risk_level', 'risk_title',
            ])
        except Exception as e:
            tx.status = 'invalid'
            tx.raw_validation_payload = {'error': str(e)}
            tx.save(update_fields=['status', 'raw_validation_payload'])

    return Response({'detail': 'IPN processed', 'tran_id': tx.tran_id, 'status': tx.status}, status=200)

class SSLCommerzSuccessView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        return _finalize_ssl_callback(request, 'success')


class SSLCommerzFailView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        return _finalize_ssl_callback(request, 'failed')


class SSLCommerzCancelView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        return _finalize_ssl_callback(request, 'cancelled')


class SSLCommerzIPNView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        return _finalize_ssl_ipn(request)


class GoogleAnalyticsView(APIView):
    permission_classes = [IsAdminOrEditor]

    def get(self, request):
        try:
            from google.analytics.data_v1beta import BetaAnalyticsDataClient
            from google.oauth2 import service_account
            import os
            from datetime import datetime, timedelta

            # Path to the service account key file
            key_path = os.path.join(settings.BASE_DIR, 'ga_key.json')
            credentials = service_account.Credentials.from_service_account_file(key_path)
            scoped_credentials = credentials.with_scopes(['https://www.googleapis.com/auth/analytics.readonly'])

            # Create the client
            client = BetaAnalyticsDataClient(credentials=scoped_credentials)

            # Define the property ID (GA4 property ID, not the measurement ID)
            # This should be configured in Django settings or environment variables
            property_id = getattr(settings, 'GA4_PROPERTY_ID', 'YOUR_GA4_PROPERTY_ID')
            if property_id == 'YOUR_GA4_PROPERTY_ID':
                return Response({
                    'error': 'GA4 Property ID not configured. Please set GA4_PROPERTY_ID in Django settings.'
                }, status=500)

            # Define the date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)

            # Run a simple report
            request_body = {
                'property': f'properties/{property_id}',
                'date_ranges': [{'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()}],
                'metrics': [
                    {'name': 'totalUsers'},
                    {'name': 'sessions'},
                    {'name': 'screenPageViews'},
                    {'name': 'averageSessionDuration'},
                ],
                'dimensions': [
                    {'name': 'date'},
                    {'name': 'country'},
                ],
            }

            response = client.run_report(request_body)

            # Process the response
            total_users = 0
            total_sessions = 0
            total_pageviews = 0
            avg_session_duration = 0
            geographic_data = {}
            views_over_time = {}

            for row in response.rows:
                dimensions = [dim.value for dim in row.dimension_values]
                metrics = [metric.value for metric in row.metric_values]

                date = dimensions[0]
                country = dimensions[1]
                users = int(metrics[0])
                sessions = int(metrics[1])
                pageviews = int(metrics[2])
                session_duration = float(metrics[3])

                total_users += users
                total_sessions += sessions
                total_pageviews += pageviews
                avg_session_duration = max(avg_session_duration, session_duration)  # Take max as approximation

                # Geographic data
                if country not in geographic_data:
                    geographic_data[country] = 0
                geographic_data[country] += pageviews

                # Views over time
                if date not in views_over_time:
                    views_over_time[date] = 0
                views_over_time[date] += pageviews

            # Convert to lists for frontend
            geographic_list = [{'country': country, 'views': views} for country, views in geographic_data.items()]
            views_over_time_list = [{'date': date, 'views': views} for date, views in views_over_time.items()]

            # Use real paper metrics from the database for top viewed and downloaded content
            most_viewed_papers = [
                {'title': paper.title, 'views': paper.views}
                for paper in Paper.objects.order_by('-views')[:5]
            ]
            most_downloaded_pdfs = [
                {'title': paper.title, 'downloads': paper.downloads}
                for paper in Paper.objects.order_by('-downloads')[:5]
            ]

            return Response({
                'total_pageviews': total_pageviews,
                'total_sessions': total_sessions,
                'total_users': total_users,
                'avg_session_duration': avg_session_duration,
                'geographic_readership': geographic_list,
                'most_viewed_papers': most_viewed_papers,
                'most_downloaded_pdfs': most_downloaded_pdfs,
                'views_over_time': views_over_time_list,
            })

        except Exception as e:
            return Response({'error': f'Failed to fetch analytics data: {str(e)}'}, status=500)



#Version1
# class PlagiarismCheckView(APIView):
#     """
#     POST: Submit a file for plagiarism checking via Copyleaks API
#     Returns: plagiarism report with similarity percentage and sources
#     """
#     permission_classes = [IsAuthenticated]
#     parser_classes = (MultiPartParser, FormParser)

#     def post(self, request):
#         try:
#             import base64
#             import requests
#             from django.conf import settings

#             # Get file from request
#             uploaded_file = request.FILES.get('file')
#             if not uploaded_file:
#                 return Response(
#                     {'error': 'No file provided. Please upload a PDF, DOC, or TXT file.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Validate file type
#             allowed_extensions = ['.pdf', '.doc', '.docx', '.txt']
#             file_name = uploaded_file.name.lower()
#             if not any(file_name.endswith(ext) for ext in allowed_extensions):
#                 return Response(
#                     {'error': f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Validate file size (max 50MB)
#             if uploaded_file.size > 50 * 1024 * 1024:
#                 return Response(
#                     {'error': 'File size exceeds 50MB limit.'},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             # Get Copyleaks credentials from settings
#             email = getattr(settings, 'COPYLEAKS_EMAIL', 'mdredwanhossain9999@gmail.com')
#             api_key = getattr(settings, 'COPYLEAKS_API_KEY', '878aa6f5-e4ab-4856-9257-8d035c3d16df')

#             try:
#                 # First, authenticate with Copyleaks to get access token
#                 print(f"DEBUG: Starting authentication process")
#                 login_url = 'https://id.copyleaks.com/v3/account/login/api'
#                 login_payload = {
#                     'email': email,
#                     'key': api_key
#                 }
#                 print(f"DEBUG: Login payload prepared for email: {email}")

#                 login_response = requests.post(
#                     login_url,
#                     json=login_payload,
#                     headers={'Content-Type': 'application/json'},
#                     timeout=30
#                 )
#                 print(f"DEBUG: Login response status: {login_response.status_code}")

#                 if login_response.status_code != 200:
#                     error_msg = f'Copyleaks login failed with status {login_response.status_code}'
#                     try:
#                         error_data = login_response.json()
#                         error_msg += f': {error_data}'
#                         print(f"DEBUG: Login error response: {error_data}")
#                     except:
#                         error_msg += f': {login_response.text}'
#                         print(f"DEBUG: Login error text: {login_response.text}")
#                     return Response(
#                         {'error': f'Failed to authenticate with Copyleaks API: {error_msg}'},
#                         status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                     )

#                 auth_data = login_response.json()
#                 print(f"DEBUG: Login success response: {auth_data}")
#                 access_token = auth_data.get('access_token')

#                 if not access_token:
#                     print(f"DEBUG: No access_token found in response: {auth_data}")
#                     return Response(
#                         {'error': f'Invalid authentication response from Copyleaks API. Response: {auth_data}'},
#                         status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                     )
#                 print(f"DEBUG: Access token obtained, length: {len(access_token)}")

#                 # Try to use Copyleaks SDK first (more reliable)
#                 try:
#                     print(f"DEBUG: Attempting to import copyleaks SDK")
#                     from copyleaks import Copyleaks
#                     from copyleaks.models.submit.document import FileDocument
#                     from copyleaks.models.submit.properties.scan_properties import ScanProperties
#                     print(f"DEBUG: Copyleaks SDK imported successfully")

#                     # Authenticate using SDK
#                     print(f"DEBUG: Attempting authentication with email: {email}")
#                     auth_token = Copyleaks.login(email, api_key)
#                     print(f"DEBUG: Authentication successful, token keys: {list(auth_token.keys())}")

#                     # Read file content and encode to base64
#                     file_content = uploaded_file.read()
#                     base64_content = base64.b64encode(file_content).decode('utf-8')
#                     print(f"DEBUG: File encoded to base64, length: {len(base64_content)}")

#                     # Create scan properties
#                     scan_properties = ScanProperties()
#                     scan_properties.set_sandbox(True)  # Use sandbox for testing

#                     # Create file document
#                     file_submission = FileDocument(base64_content, uploaded_file.name)
#                     file_submission.set_properties(scan_properties)

#                     # Generate a unique scan ID
#                     import uuid
#                     scan_id = str(uuid.uuid4())
#                     print(f"DEBUG: Generated scan ID: {scan_id}")

#                     # Submit file using SDK
#                     print(f"DEBUG: Submitting file to Copyleaks")
#                     Copyleaks.submit_file(auth_token, scan_id, file_submission)
#                     print(f"DEBUG: File submitted successfully")

#                     return Response({
#                         'success': True,
#                         'message': 'File submitted for plagiarism check successfully',
#                         'scan_id': scan_id,
#                         'similarity_score': 0,
#                         'status': 'submitted',
#                         'report_url': '',
#                         'metadata': {'method': 'sdk'},
#                         'note': 'Results will be available shortly. Check back later for similarity score.'
#                     }, status=status.HTTP_200_OK)

#                 except ImportError as ie:
#                     print(f"DEBUG: ImportError - copyleaks SDK not available: {ie}")
#                     # Fall back to direct API calls if SDK is not available
#                     pass
#                 except Exception as sdk_error:
#                     print(f"DEBUG: SDK error: {type(sdk_error).__name__}: {sdk_error}")
#                     # Fall back to direct API calls if SDK fails
#                     pass

#                 # Read file content and encode to base64
#                 print(f"DEBUG: Falling back to direct API calls")
#                 file_content = uploaded_file.read()
#                 base64_content = base64.b64encode(file_content).decode('utf-8')
#                 print(f"DEBUG: File encoded to base64, length: {len(base64_content)}")

#                 # Prepare the submission payload
#                 submission_payload = {
#                     'base64': base64_content,
#                     'filename': uploaded_file.name,
#                     'properties': {
#                         'webhookUrl': None,
#                         'customHeaders': None
#                     }
#                 }
#                 print(f"DEBUG: Submission payload prepared")

#                 # Submit to Copyleaks API using the access token
#                 submit_url = 'https://api.copyleaks.com/v3/scans/submit/file'
#                 headers = {
#                     'Authorization': f'Bearer {access_token}',
#                     'Content-Type': 'application/json'
#                 }
#                 print(f"DEBUG: Making API request to {submit_url}")

#                 response = requests.post(
#                     submit_url,
#                     json=submission_payload,
#                     headers=headers,
#                     timeout=60  # Increased timeout for file processing
#                 )
#                 print(f"DEBUG: API response status: {response.status_code}")

#                 if response.status_code not in [200, 201]:
#                     error_msg = 'Unknown error'
#                     try:
#                         error_data = response.json()
#                         error_msg = error_data.get('message', error_data.get('error', 'Unknown error'))
#                         print(f"DEBUG: API error response: {error_data}")
#                     except:
#                         error_msg = response.text or f'HTTP {response.status_code}'
#                         print(f"DEBUG: API error text: {error_msg}")

#                     return Response(
#                         {'error': f'Copyleaks API error: {error_msg}'},
#                         status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                     )

#                 result = response.json()
#                 print(f"DEBUG: API success response: {result}")

#                 # Extract relevant information from response
#                 # Copyleaks API returns scan ID and other metadata
#                 scan_id = result.get('id', result.get('scanId', ''))
#                 status_info = result.get('status', {})
#                 status_code = status_info.get('code', 'submitted') if isinstance(status_info, dict) else 'submitted'

#                 # For now, return a mock similarity score since the actual results
#                 # would typically be retrieved asynchronously via webhook or polling
#                 # In a production setup, you'd implement webhook handling or polling

#                 return Response({
#                     'success': True,
#                     'message': 'File submitted for plagiarism check successfully',
#                     'scan_id': scan_id,
#                     'similarity_score': 0,  # Will be updated when results are available
#                     'status': status_code,
#                     'report_url': '',  # Will be available when processing completes
#                     'metadata': result,
#                     'note': 'Results will be available shortly. Check back later for similarity score.'
#                 }, status=status.HTTP_200_OK)

#             except requests.exceptions.Timeout:
#                 return Response(
#                     {'error': 'Request to Copyleaks API timed out. Please try again.'},
#                     status=status.HTTP_504_GATEWAY_TIMEOUT
#                 )
#             except requests.exceptions.RequestException as e:
#                 return Response(
#                     {'error': f'Network error communicating with Copyleaks: {str(e)}'},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                 )
#             except Exception as e:
#                 return Response(
#                     {'error': f'Failed to submit file for plagiarism check: {str(e)}'},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                 )

#         except Exception as e:
#             print(f"DEBUG: Unexpected error in plagiarism check: {type(e).__name__}: {e}")
#             import traceback
#             print(f"DEBUG: Traceback: {traceback.format_exc()}")
#             return Response(
#                 {'error': f'Unexpected error during plagiarism check: {str(e)}'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
            
# class PlagiarismCheckView(APIView):
#     permission_classes = [IsAuthenticated]
#     parser_classes = (MultiPartParser, FormParser)

#     def post(self, request):
#         try:
#             uploaded_file = request.FILES.get('file')
#             if not uploaded_file:
#                 return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

#             # Validate file type and size
#             allowed_ext = ['.pdf', '.doc', '.docx', '.txt']
#             if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_ext):
#                 return Response({'error': f'Allowed types: {", ".join(allowed_ext)}'}, status=status.HTTP_400_BAD_REQUEST)

#             if uploaded_file.size > 50 * 1024 * 1024:
#                 return Response({'error': 'File size exceeds 50MB'}, status=status.HTTP_400_BAD_REQUEST)

#             email = getattr(settings, 'COPYLEAKS_EMAIL', None)
#             api_key = getattr(settings, 'COPYLEAKS_API_KEY', None)

#             if not email or not api_key:
#                 return Response({'error': 'Copyleaks credentials not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#             # Step 1: Login to get access token
#             login_url = "https://id.copyleaks.com/v3/account/login/api"
#             login_payload = {"email": email, "key": api_key}

#             login_response = requests.post(login_url, json=login_payload, timeout=30)

#             if login_response.status_code != 200:
#                 return Response({
#                     'error': f'Copyleaks login failed: {login_response.status_code}',
#                     'details': login_response.text
#                 }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#             access_token = login_response.json().get('access_token')
#             if not access_token:
#                 return Response({'error': 'Failed to get access token'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#             # Step 2: Generate unique scan ID
#             scan_id = str(uuid.uuid4())

#             # Step 3: Read file and encode to base64
#             file_content = uploaded_file.read()
#             base64_content = base64.b64encode(file_content).decode('utf-8')

#             # Step 4: Submit file (CORRECT ENDPOINT)
#             submit_url = f"https://api.copyleaks.com/v3/scans/submit/file/{scan_id}"

#             payload = {
#                 "base64": base64_content,
#                 "filename": uploaded_file.name,
#                 "properties": {
#                     "sandbox": True,                    # Use sandbox for testing (no credits used)
#                     "aiGeneratedText": {"detect": True},
#                     "webhooks": {
#                         "status": f"https://rri.websoftbd.net/api/copyleaks/webhook/{scan_id}/status/",
#                         "result": f"https://rri.websoftbd.net/api/copyleaks/webhook/{scan_id}/result/"
#                     }
#                 }
#             }

#             headers = {
#                 "Authorization": f"Bearer {access_token}",
#                 "Content-Type": "application/json"
#             }

#             response = requests.put(submit_url, json=payload, headers=headers, timeout=60)

#             if response.status_code not in [200, 201]:
#                 error_msg = response.text
#                 try:
#                     error_msg = response.json()
#                 except:
#                     pass
#                 return Response({
#                     'error': f'Copyleaks submission failed: {response.status_code}',
#                     'details': error_msg
#                 }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#             return Response({
#                 'success': True,
#                 'message': 'File submitted successfully for plagiarism & AI detection',
#                 'scan_id': scan_id,
#                 'status': 'processing',
#                 'note': 'Results will be sent to your webhook. Check admin panel later.'
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({
#                 'error': f'Unexpected error: {str(e)}'
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PlagiarismCheckView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        try:
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Validation
            allowed_ext = ['.pdf', '.doc', '.docx', '.txt']
            if not any(uploaded_file.name.lower().endswith(ext) for ext in allowed_ext):
                return Response({'error': f'Allowed types: {", ".join(allowed_ext)}'}, status=status.HTTP_400_BAD_REQUEST)

            if uploaded_file.size > 50 * 1024 * 1024:
                return Response({'error': 'File too large (max 50MB)'}, status=status.HTTP_400_BAD_REQUEST)

            email = settings.COPYLEAKS_EMAIL
            api_key = settings.COPYLEAKS_API_KEY

            if not email or not api_key:
                return Response({'error': 'Copyleaks credentials not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Login to Copyleaks
            login_url = "https://id.copyleaks.com/v3/account/login/api"
            login_response = requests.post(
                login_url, 
                json={"email": email, "key": api_key}, 
                timeout=30
            )

            if login_response.status_code != 200:
                return Response({
                    'error': f'Copyleaks login failed: {login_response.status_code}',
                    'details': login_response.text
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            access_token = login_response.json().get('access_token')

            # Generate scan ID
            scan_id = str(uuid.uuid4())

            # Read file
            file_content = uploaded_file.read()
            base64_content = base64.b64encode(file_content).decode('utf-8')

            # Submit to Copyleaks
            submit_url = f"https://api.copyleaks.com/v3/scans/submit/file/{scan_id}"

            payload = {
                "base64": base64_content,
                "filename": uploaded_file.name,
                "properties": {
                    "sandbox": settings.COPYLEAKS_SANDBOX_MODE,
                    "aiGeneratedText": {"detect": True},
                    "webhooks": {
                        "status": f"{settings.COPYLEAKS_WEBHOOK_BASE}{scan_id}/status/",
                        "result": f"{settings.COPYLEAKS_WEBHOOK_BASE}{scan_id}/result/"
                    }
                }
            }

            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            response = requests.put(submit_url, json=payload, headers=headers, timeout=60)

            if response.status_code not in [200, 201]:
                return Response({
                    'error': f'Copyleaks submission failed ({response.status_code})',
                    'details': response.text
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Save scan (paper is optional now)
            PlagiarismScan.objects.create(
                scan_id=scan_id,
                status='processing',
                # paper_id will be None if not provided from frontend
            )

            return Response({
                'success': True,
                'message': 'Plagiarism & AI check started successfully',
                'scan_id': scan_id,
                'status': 'processing',
                'note': 'Results will be delivered via webhook shortly.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"PlagiarismCheckView Error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return Response({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
# ====================== WEBHOOKS ======================

@csrf_exempt
def copyleaks_status_webhook(request, scan_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            scan = PlagiarismScan.objects.filter(scan_id=scan_id).first()
            if scan:
                status_value = data.get('status')
                if isinstance(status_value, dict):
                    status_value = status_value.get('code') or status_value.get('name') or status_value.get('status')
                if not status_value:
                    status_value = data.get('statusCode') or data.get('status_message')
                if status_value:
                    normalize = str(status_value).strip().lower()
                elif data.get('results') is not None:
                    normalize = 'completed'
                else:
                    normalize = None

                if normalize:
                    if normalize in ('completed', 'done', 'finished'):
                        scan.status = 'completed'
                    elif normalize in ('failed', 'error', 'rejected'):
                        scan.status = 'error'
                    elif normalize in ('processing', 'pending', 'submitted', 'inprogress'):
                        scan.status = 'processing'
                    else:
                        scan.status = normalize
                    if scan.status == 'completed' and not scan.completed_at:
                        scan.completed_at = timezone.now()
                    scan.save()
            return JsonResponse({"received": True})
        except Exception as e:
            print(f"Status webhook error: {e}")
            return JsonResponse({"received": True})
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def copyleaks_result_webhook(request, scan_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            scan = PlagiarismScan.objects.filter(scan_id=scan_id).first()
            if scan:
                scan.status = 'completed'
                scan.similarity_score = (
                    data.get('results', {}).get('score', {}).get('aggregatedScore')
                    or data.get('results', {}).get('score', {}).get('percentage')
                    or data.get('results', {}).get('similarityScore')
                    or data.get('score')
                    or 0
                )
                ai_data = data.get('aiGeneratedText', {}) or {}
                scan.ai_score = ai_data.get('score') if ai_data.get('score') is not None else ai_data.get('probability', 0)
                scan.report_url = (
                    data.get('downloadableReport', {}).get('report')
                    or data.get('results', {}).get('downloadableReport', {}).get('report')
                    or data.get('report', '')
                )
                scan.raw_response = data
                scan.completed_at = timezone.now()
                scan.save()
            return JsonResponse({"received": True})
        except Exception as e:
            print(f"Result webhook error: {e}")
            return JsonResponse({"received": True})
    return JsonResponse({"error": "Method not allowed"}, status=405)

class CopyleaksScanStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, scan_id):
        scan = PlagiarismScan.objects.filter(scan_id=scan_id).first()
        if not scan:
            return Response({'detail': 'Scan not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'scan_id': scan.scan_id,
            'status': scan.status,
            'similarity_score': scan.similarity_score,
            'ai_score': scan.ai_score,
            'report_url': scan.report_url,
            'created_at': scan.created_at.isoformat() if scan.created_at else None,
            'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
        })

# class ReviewerPlagiarismScansView(generics.ListAPIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = PlagiarismScanSerializer

#     def get_queryset(self):
#         # Only show scans for the logged-in reviewer
#         return PlagiarismScan.objects.filter(
#             paper__reviewer=self.request.user
#         ).order_by('-created_at')

# class ReviewerPlagiarismScansView(generics.ListAPIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = PlagiarismScanSerializer

#     def get_queryset(self):
#         # Show scans where the reviewer is assigned to the paper, or all scans if no paper
#         user = self.request.user
#         return PlagiarismScan.objects.filter(
#             models.Q(paper__reviewer=user) | models.Q(paper__isnull=True)
#         ).order_by('-created_at')

class ReviewerPlagiarismScansView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scans = PlagiarismScan.objects.all().order_by('-created_at')
        data = []
        for scan in scans:
            data.append({
                'scan_id': scan.scan_id,
                'paper_title': scan.paper.title if scan.paper and getattr(scan.paper, 'title', None) else "Uploaded Manuscript",
                'paper_id': scan.paper.id if scan.paper else None,
                'status': scan.status,
                'similarity_score': scan.similarity_score,
                'ai_score': scan.ai_score,
                'report_url': scan.report_url,
                'created_at': scan.created_at.isoformat() if scan.created_at else None,
                'completed_at': scan.completed_at.isoformat() if scan.completed_at else None,
            })
        return Response(data)


class PublicSubmissionPeriodListView(generics.ListAPIView):
    serializer_class = SubmissionPeriodSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return SubmissionPeriod.objects.filter(is_active=True, start_date__lte=timezone.now(), end_date__gte=timezone.now()).order_by('-start_date')


class SubmissionPeriodListCreateView(generics.ListCreateAPIView):
    serializer_class = SubmissionPeriodSerializer
    permission_classes = [IsAdminOrEditor]

    def get_queryset(self):
        return SubmissionPeriod.objects.all().order_by('-start_date')

    def perform_create(self, serializer):
        serializer.save()


class SubmissionPeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SubmissionPeriod.objects.all()
    serializer_class = SubmissionPeriodSerializer
    permission_classes = [IsAdminOrEditor]
    lookup_field = 'pk'