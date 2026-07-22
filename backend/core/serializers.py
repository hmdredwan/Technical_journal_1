# backend/core/serializers.py
import re

from django.db import models
from rest_framework import serializers
from .models import DecisionLog, PlagiarismScan, ReviewAssignment, ReviewerApplication, Role, SubmissionDeadline, User, EditorialBoardMember, Submission, SubmissionVersion, Volume, Issue, Paper, Announcement, HeroImage, ManuscriptComment, GuidelineDocument, ManuscriptFormatDocument, SubmissionFee, PaymentTransaction, ReviewerPayout, NewsArticle, ImportantDate, CallForPaperAdvertize,SubmissionPeriod, AboutPageContent
from django.contrib.auth.password_validation import validate_password

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), required=True)

    class Meta:
        model = User
        fields = [
            'title', 'full_name', 'email', 'mobile_number', 'address', 'city', 'country',
            'designation', 'department', 'orcid_id', 'google_scholar_url', 'role',
            'password', 'password2', 'cv', 'profile_photo'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'full_name': {'required': True},
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        # Extract password and remove from validated_data
        password = validated_data.pop('password')
        validated_data.pop('password2')  # remove confirm password

        # Extract role separately (ForeignKey)
        role = validated_data.pop('role')

        # Extract email before using it as username
        email = validated_data.pop('email')

        # Preserve the raw password so views can send a welcome email.
        self._created_password = password

        # Check if this is admin/editor creation (via context flag)
        # Default is_active based on creation context
        is_admin_created = self.context.get('is_admin_created', False)
        is_active = is_admin_created  # True if admin-created, False if self-registered

        # Create user
        user = User.objects.create_user(
            email=email,
            username=email,
            password=password,
            is_active=is_active,
            **validated_data
        )

        # Assign role
        user.role = role
        user.save()

        return user

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'message',
            'link_url',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class NewsArticleSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)

    class Meta:
        model = NewsArticle
        fields = [
            'id',
            'title',
            'excerpt',
            'content',
            'attachment',
            'is_active',
            'sort_order',
            'published_at',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'published_at', 'created_at', 'updated_at']


class ImportantDateSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)

    class Meta:
        model = ImportantDate
        fields = [
            'id',
            'title',
            'date',
            'description',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class HeroImageSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)

    class Meta:
        model = HeroImage
        fields = [
            'id',
            'image',
            'alt_text',
            'link_url',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class CallForPaperAdvertizeSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)

    class Meta:
        model = CallForPaperAdvertize
        fields = [
            'id',
            'file',
            'file_type',
            'title',
            'description',
            'is_active',
            'inactive_after',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class GuidelineDocumentAdminSerializer(serializers.ModelSerializer):
    """
    Admin/Editor management serializer for guideline documents.
    """
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    extracted_text_preview = serializers.SerializerMethodField()

    # Required on create; optional on PATCH updates.
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = GuidelineDocument
        fields = [
            'id',
            'title',
            'file',
            'rendered_pdf',
            'file_extension',
            'extracted_text_preview',
            'extraction_error',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
            'extracted_text_preview',
            'rendered_pdf',
        ]

    def get_extracted_text_preview(self, obj):
        text = (obj.extracted_text or '').strip()
        if not text:
            return ''
        max_len = 500
        return text[:max_len] + ('...' if len(text) > max_len else '')

    def validate(self, attrs):
        if self.instance is None and not attrs.get('file'):
            raise serializers.ValidationError({'file': 'This field is required.'})
        return attrs


class GuidelineDocumentPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for `/guidelines/public/`.
    """
    class Meta:
        model = GuidelineDocument
        fields = [
            'id',
            'title',
            'file',
            'rendered_pdf',
            'file_extension',
            'extracted_text',
            'extraction_error',
            'is_active',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ManuscriptFormatDocumentAdminSerializer(serializers.ModelSerializer):
    """
    Admin/Editor management serializer for manuscript format documents.
    """
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    extracted_text_preview = serializers.SerializerMethodField()
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = ManuscriptFormatDocument
        fields = [
            'id',
            'title',
            'file',
            'rendered_pdf',
            'file_extension',
            'extracted_text_preview',
            'extraction_error',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
            'extracted_text_preview',
            'rendered_pdf',
        ]

    def get_extracted_text_preview(self, obj):
        text = (obj.extracted_text or '').strip()
        if not text:
            return ''
        max_len = 500
        return text[:max_len] + ('...' if len(text) > max_len else '')

    def validate(self, attrs):
        if self.instance is None and not attrs.get('file'):
            raise serializers.ValidationError({'file': 'This field is required.'})
        return attrs


class ManuscriptFormatDocumentPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for `/manuscript-formats/public/`.
    """
    class Meta:
        model = ManuscriptFormatDocument
        fields = [
            'id',
            'title',
            'file',
            'rendered_pdf',
            'file_extension',
            'extracted_text',
            'extraction_error',
            'is_active',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class AboutPageContentSerializer(serializers.ModelSerializer):
    """
    Serializer for About Page Content - used for admin/editor management.
    """
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    section_display = serializers.CharField(source='get_section_display', read_only=True)

    class Meta:
        model = AboutPageContent
        fields = [
            'id',
            'section',
            'section_display',
            'title',
            'content',
            'topics',
            'is_active',
            'sort_order',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class AboutPageContentPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for the About page - only returns active sections.
    """
    section_display = serializers.CharField(source='get_section_display', read_only=True)

    class Meta:
        model = AboutPageContent
        fields = [
            'id',
            'section',
            'section_display',
            'title',
            'content',
            'topics',
            'is_active',
            'sort_order',
        ]
        read_only_fields = fields


class ManuscriptCommentSerializer(serializers.ModelSerializer):
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = ManuscriptComment
        fields = [
            'id',
            'submission',
            'sender_role',
            'message',
            'is_own',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'sender_role', 'is_own', 'created_at', 'updated_at']

    def get_is_own(self, obj):
        request = self.context.get('request')
        return bool(request and request.user and request.user.is_authenticated and obj.sender_id == request.user.id)

class ProfileUpdateSerializer(serializers.ModelSerializer):
    orcid_id = serializers.CharField(allow_blank=True, allow_null=True, required=False)

    class Meta:
        model = User
        fields = [
            'title', 'full_name', 'email', 'mobile_number', 'address', 'city', 'country',
            'designation', 'department', 'orcid_id', 'google_scholar_url',
            'payment_bank_name', 'payment_account_holder', 'payment_account_number',
            'payment_bkash_number', 'payment_nagad_number', 'payment_paypal_email', 'payment_notes',
            'profile_photo', 'cv'
        ]
        read_only_fields = ['email']  # prevent changing email
    
    def update(self, instance, validated_data):
        # Prevent saving empty string into unique nullable field `orcid_id`.
        # Convert empty strings to None so DB unique constraint on '' is avoided.
        if 'orcid_id' in validated_data:
            val = validated_data.get('orcid_id')
            if val == '' or val is None:
                validated_data['orcid_id'] = None
        return super().update(instance, validated_data)

class ReviewerPayoutSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.full_name', read_only=True)
    reviewer_email = serializers.CharField(source='reviewer.email', read_only=True)
    submission_title = serializers.CharField(source='submission.title', read_only=True)
    submission_code = serializers.CharField(source='submission.submission_code', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = ReviewerPayout
        fields = [
            'id', 'reviewer', 'reviewer_name', 'reviewer_email', 'submission', 'submission_title',
            'submission_code', 'assignment', 'amount_bdt', 'payment_method', 'status',
            'invoice_number', 'payment_reference', 'notes', 'generated_by', 'generated_by_name',
            'paid_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'paid_at']


class ReviewerPayoutCreateSerializer(serializers.ModelSerializer):
    assignment_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = ReviewerPayout
        fields = ['assignment_id', 'amount_bdt', 'payment_method', 'notes']

    def validate(self, attrs):
        assignment_id = attrs.get('assignment_id')
        amount_bdt = attrs.get('amount_bdt')
        if amount_bdt is None or amount_bdt <= 0:
            raise serializers.ValidationError({'amount_bdt': 'Amount must be greater than zero.'})
        if assignment_id:
            try:
                assignment = ReviewAssignment.objects.select_related('submission', 'assigned_to').get(id=assignment_id)
            except ReviewAssignment.DoesNotExist:
                raise serializers.ValidationError({'assignment_id': 'Invalid review assignment.'})
            attrs['assignment'] = assignment
            attrs['reviewer'] = assignment.assigned_to
            attrs['submission'] = assignment.submission
        else:
            raise serializers.ValidationError({'assignment_id': 'Review assignment is required to generate a reviewer payout.'})
        return attrs


class EditorialBoardMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = EditorialBoardMember
        fields = '__all__'




class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',               # Critical for edit/delete
            'title',
            'full_name',
            'email',
            'mobile_number',
            'address',
            'city',
            'country',
            'designation',
            'department',
            'orcid_id',
            'google_scholar_url',
            'role',             # Will return {'id': ..., 'name': ...}
            'is_active',
            'date_joined',
            'last_login',
        ]

    def get_role(self, obj):
        if obj.role:
            return {
                'id': obj.role.id,
                'name': obj.role.name
            }
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'title', 'full_name', 'mobile_number', 'address', 'city', 'country',
            'designation', 'department', 'orcid_id', 'google_scholar_url',
            'role',  # ← accepts role ID (integer)
            'is_active',
        ]
        read_only_fields = ['email']  # email cannot be changed

    def update(self, instance, validated_data):
        # Handle role separately if present
        role = validated_data.pop('role', None)
        if role is not None:
            instance.role = role

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

# class SubmissionSerializer(serializers.ModelSerializer):
#     authors = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all())
#     corresponding_author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
#     editor_assigned_name = serializers.CharField(source='editor_assigned.full_name', read_only=True, allow_null=True)
#     editor_assigned_email = serializers.CharField(source='editor_assigned.email', read_only=True, allow_null=True)

#     class Meta:
#         model = Submission
#         fields = [
#             'id', 'title', 'abstract', 'keywords', 'manuscript_type',
#             'corresponding_author', 'authors', 'files', 'submitted_by',
#             'status', 'created_at', 'editor_assigned', 'editor_assigned_name',
#             'editor_assigned_email'
#         ]
#         read_only_fields = ['submitted_by', 'status', 'created_at', 'id']

#     def create(self, validated_data):
#         authors_data = validated_data.pop('authors', [])
#         submission = Submission.objects.create(**validated_data)
#         for author in authors_data:
#             submission.authors.add(author)
#         return submission

class SubmissionSerializer(serializers.ModelSerializer):
    authors = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)
    corresponding_author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    submission_period = serializers.PrimaryKeyRelatedField(queryset=SubmissionPeriod.objects.all(), required=True)
    submission_code = serializers.CharField(read_only=True)
    manual_authors = serializers.CharField(required=False, allow_blank=True)
    conflict_of_interest = serializers.CharField(required=False, allow_blank=True)
    acknowledgement = serializers.CharField(required=False, allow_blank=True)
    originality_declaration = serializers.BooleanField(required=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'submission_code', 'submission_period', 'title', 'abstract', 'keywords', 'manuscript_type',
            'corresponding_author', 'authors', 'manual_authors',
            'conflict_of_interest', 'acknowledgement', 'originality_declaration',
            'files', 'submitted_by',
            'status', 'created_at',
            'editor_assigned', 'editor_assigned_at',
            'desk_review_status', 'desk_review_remarks', 'desk_review_date',
            'final_decision', 'decision_remarks', 'decision_date',
            'current_status', 'reviewer_feedback',
            'revision_due_date', 'revision_extension_reason', 'revision_extension_status',
            'revision_extension_requested_at', 'revision_extension_approved_by'
        ]
        read_only_fields = [
            'submitted_by', 'status', 'created_at', 'id', 'submission_code',
            'editor_assigned', 'editor_assigned_at', 'desk_review_date',
            'decision_date', 'revision_extension_status', 'revision_extension_requested_at',
            'revision_extension_approved_by'
        ]

    def validate(self, attrs):
        title = attrs.get('title')
        if self.instance is None and title:
            normalized_title = re.sub(r'\s+', ' ', str(title).strip()).lower()
            if normalized_title:
                request = self.context.get('request')
                user = None
                if request is not None and getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False):
                    user = request.user
                else:
                    user = self.context.get('submitted_by') or self.context.get('user')

                if user:
                    for existing_submission in Submission.objects.filter(submitted_by=user).exclude(pk=getattr(self.instance, 'pk', None)):
                        existing_title = re.sub(r'\s+', ' ', str(existing_submission.title or '').strip()).lower()
                        if existing_title == normalized_title:
                            raise serializers.ValidationError({
                                'title': 'A manuscript with this title has already been submitted by you.'
                            })
        return attrs

    def validate_originality_declaration(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must confirm that this manuscript is original, has not been previously published, is not under consideration elsewhere, and that all authors approve its submission."
            )
        return value

    def create(self, validated_data):
        authors_data = validated_data.pop('authors', [])
        submission_period = validated_data.get('submission_period')
        serial = 1

        if submission_period:
            serial = Submission.objects.filter(submission_period=submission_period).count() + 1

        submission = Submission.objects.create(**validated_data)
        for author in authors_data:
            submission.authors.add(author)

        if submission_period:
            year = submission_period.start_date.year if getattr(submission_period, 'start_date', None) else 0
            volume_match = re.search(r'(\d+)', str(submission_period.volume or ''))
            issue_match = re.search(r'(\d+)', str(submission_period.issue or ''))
            volume_value = volume_match.group(1) if volume_match else '0'
            issue_value = issue_match.group(1) if issue_match else '0'
            submission_code = f"RRIJ_{year}_{volume_value}({issue_value})_{serial:02d}"
            while Submission.objects.filter(submission_code=submission_code).exists():
                serial += 1
                submission_code = f"RRIJ_{year}_{volume_value}({issue_value})_{serial:02d}"

            submission.submission_code = submission_code
            submission.save(update_fields=['submission_code'])

        return submission

class SubmissionDetailSerializer(serializers.ModelSerializer):
    authors = UserListSerializer(many=True, read_only=True)
    submission_period = serializers.SerializerMethodField()
    corresponding_author = UserListSerializer(read_only=True)
    submitted_by = UserListSerializer(read_only=True)
    editor_assigned_name = serializers.CharField(source='editor_assigned.full_name', read_only=True, allow_null=True)
    manual_authors = serializers.CharField(read_only=True)
    conflict_of_interest = serializers.CharField(read_only=True)
    acknowledgement = serializers.CharField(read_only=True)
    originality_declaration = serializers.BooleanField(read_only=True)
    latest_version = serializers.SerializerMethodField()
    versions = serializers.SerializerMethodField()
    processing_fee = serializers.SerializerMethodField()
    has_success_payment = serializers.SerializerMethodField()
    class Meta:
        model = Submission
        fields = [
            'id', 'submission_code', 'submission_period', 'title', 'abstract', 'keywords', 'manuscript_type',
            'corresponding_author', 'authors', 'submitted_by', 'files','manual_authors', 'conflict_of_interest', 'acknowledgement', 'originality_declaration',
            'status', 'created_at', 'editor_assigned', 'editor_assigned_name','current_status',
            'desk_review_status', 'desk_review_remarks', 'desk_review_date',
            'final_decision', 'decision_remarks', 'decision_date',
            'revision_due_date', 'revision_extension_reason', 'revision_extension_status',
            'revision_extension_requested_at', 'revision_extension_approved_by',
            'latest_version', 'versions',
            'processing_fee', 'has_success_payment', 'reviewer_feedback',
        ]
        read_only_fields = ['submitted_by', 'status', 'created_at', 'id']

    def get_latest_version(self, obj):
        latest = obj.versions.order_by('-version_number').first()
        if not latest:
            return None
        return {
            'id': latest.id,
            'version_number': latest.version_number,
            'version_type': latest.version_type,
            'file': latest.file.url if latest.file else None,
            'created_at': latest.created_at,
        }

    def get_submission_period(self, obj):
        if not obj.submission_period:
            return None
        return {
            'id': obj.submission_period.id,
            'title': obj.submission_period.title,
            'volume': obj.submission_period.volume,
            'issue': obj.submission_period.issue,
            'start_date': obj.submission_period.start_date,
            'end_date': obj.submission_period.end_date,
        }

    def get_versions(self, obj):
        versions = obj.versions.order_by('version_number')
        return [
            {
                'id': v.id,
                'version_number': v.version_number,
                'version_type': v.version_type,
                'file': v.file.url if v.file else None,
                'revision_note': v.revision_note,
                'created_at': v.created_at,
            }
            for v in versions
        ]

    def get_processing_fee(self, obj):
        fee = getattr(obj, 'processing_fee', None)
        if not fee:
            fee = SubmissionFee.objects.filter(submission=obj).first()
        if not fee:
            return None
        return {
            'amount_bdt': str(fee.amount_bdt),
            'is_enabled': bool(fee.is_enabled),
            'note': fee.note or '',
            'set_at': fee.set_at,
        }

    def get_has_success_payment(self, obj):
        return PaymentTransaction.objects.filter(submission=obj, status='success').exists()


class SubmissionFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionFee
        fields = ['id', 'submission', 'amount_bdt', 'is_enabled', 'note', 'set_by', 'set_at']
        read_only_fields = ['id', 'set_by', 'set_at']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    submission_title = serializers.CharField(source='submission.title', read_only=True)
    payer_email = serializers.CharField(source='payer.email', read_only=True, allow_null=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id',
            'submission',
            'submission_title',
            'payer',
            'payer_email',
            'amount_bdt',
            'currency',
            'status',
            'tran_id',
            'gateway_page_url',
            'val_id',
            'bank_tran_id',
            'card_type',
            'card_brand',
            'card_issuer',
            'risk_level',
            'risk_title',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class SubmissionVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    submission_title = serializers.CharField(source='submission.title', read_only=True)

    class Meta:
        model = SubmissionVersion
        fields = [
            'id', 'submission', 'submission_title',
            'version_number', 'version_type',
            'file', 'revision_note', 'based_on_decision',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'version_number', 'created_by', 'created_at']


class SubmissionVersionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionVersion
        fields = ['submission', 'file', 'revision_note']

class SubmissionDeadlineSerializer(serializers.ModelSerializer):
    extended_by_name = serializers.CharField(source='extended_by.full_name', read_only=True)

    class Meta:
        model = SubmissionDeadline
        fields = [
            'id', 'deadline', 'extended_by', 'extended_by_name',
            'extended_at', 'note', 'created_at', 'updated_at'
        ]
        read_only_fields = ['extended_by', 'extended_at', 'created_at', 'updated_at']


class DecisionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    submission_title = serializers.CharField(source='submission.title', read_only=True)

    class Meta:
        model = DecisionLog
        fields = ['id', 'submission', 'submission_title', 'user', 'user_name', 'action', 'remarks', 'timestamp']
        read_only_fields = ['id', 'timestamp']

class VolumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Volume
        fields = '__all__'
        
class PaperSerializer(serializers.ModelSerializer):
    issue_number = serializers.IntegerField(source='issue.number', read_only=True)
    issue_period = serializers.CharField(source='issue.period', read_only=True, allow_null=True)
    issue_publication_date = serializers.DateField(source='issue.publication_date', read_only=True, allow_null=True)
    issue_cover_image = serializers.SerializerMethodField()
    volume_number = serializers.IntegerField(source='issue.volume.number', read_only=True)
    volume_year = serializers.IntegerField(source='issue.volume.year', read_only=True)
    issue_id = serializers.PrimaryKeyRelatedField(
        queryset=Issue.objects.all(), source='issue', write_only=True
    )

    class Meta:
        model = Paper
        fields = [
            'id', 'title', 'authors', 'abstract', 'keywords',
            'pages', 'doi', 'file', 'views', 'downloads', 'created_at',
            'issue_id',
            'issue_number', 'issue_period', 'issue_publication_date', 'issue_cover_image',
            'volume_number', 'volume_year',
        ]

    def validate_doi(self, value):
        if not value:
            return value

        existing_paper = Paper.objects.filter(doi=value).first()
        if existing_paper and getattr(self.instance, 'pk', None) != existing_paper.pk:
            raise serializers.ValidationError('This DOI already exists. Please use a different DOI.')
        return value

    def get_issue_cover_image(self, obj):
        issue = getattr(obj, 'issue', None)
        if issue and issue.cover_image:
            try:
                return issue.cover_image.url
            except Exception:
                return None
        return None

class IssueSerializer(serializers.ModelSerializer):
    volume = VolumeSerializer(read_only=True)
    volume_id = serializers.PrimaryKeyRelatedField(
        queryset=Volume.objects.all(), source='volume', write_only=True
    )
    papers = PaperSerializer(many=True, read_only=True)
    

    class Meta:
        model = Issue
        fields = '__all__'


class PublicIssueSerializer(serializers.ModelSerializer):
    volume = serializers.PrimaryKeyRelatedField(read_only=True)  
    papers_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'volume', 'number', 'period', 'publication_date',
            'cover_image', 'introductory_file', 'created_at', 'papers_count'
        ]
        
    def get_papers_count(self, obj):
        return obj.papers.count()
        


class ReviewAssignmentSerializer(serializers.ModelSerializer):
    submission_title = serializers.CharField(source='submission.title', read_only=True)
    submission_code = serializers.CharField(source='submission.submission_code', read_only=True)
    submission_file = serializers.SerializerMethodField()
    submission_version_number = serializers.IntegerField(source='submission_version.version_number', read_only=True)
    submission_version_type = serializers.CharField(source='submission_version.version_type', read_only=True)
    submission_abstract = serializers.CharField(source='submission.abstract', read_only=True)
    submission_keywords = serializers.CharField(source='submission.keywords', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invite_response_display = serializers.CharField(source='get_invite_response_display', read_only=True)
    feedback_sent_by_name = serializers.CharField(source='feedback_sent_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = ReviewAssignment
        fields = [
            'id', 'submission', 'submission_title', 'submission_code', 'submission_file',
            'submission_version', 'submission_version_number', 'submission_version_type',
            'submission_abstract', 'submission_keywords',
            'assigned_to', 'assigned_to_name', 'assigned_to_email',
            'assigned_at', 'due_date', 'admin_remarks', 'status', 'status_display',
            'invite_response', 'invite_response_display', 'invitation_sent_at', 'invite_responded_at',
            'invite_rejection_reasons', 'invite_rejection_note',
            'review_report', 'plagiarism_report', 'reviewer_remarks', 'submitted_at',
            'comment_to_author', 'comment_to_editor', 'recommendation',
            # Checklist fields
            'is_important_for_scientific_community', 'is_title_suitable', 'alternative_title',
            'is_abstract_comprehensive', 'is_intro_conclusion_sufficient', 'is_structure_appropriate',
            'are_references_sufficient', 'additional_references', 'is_language_quality_suitable',
            # Feedback tracking fields
            'feedback_sent_to_author', 'feedback_sent_at', 'feedback_sent_by', 'feedback_sent_by_name',
        ]
        read_only_fields = ['assigned_at', 'submitted_at', 'status_display', 'feedback_sent_at', 'feedback_sent_by']

    def get_submission_file(self, obj):
        # Prefer explicitly selected version file, then latest version, then legacy submission file.
        if obj.submission_version and obj.submission_version.file:
            return obj.submission_version.file.url
        latest_version = obj.submission.versions.order_by('-version_number').first()
        if latest_version and latest_version.file:
            return latest_version.file.url
        if obj.submission.files:
            return obj.submission.files.url
        return None
    
    def get_validators(self):
        # Remove all default uniqueness validators (DRF's UniqueTogetherValidator etc.)
        # Your model constraints already protect uniqueness at DB level
        validators = super().get_validators()
        return [
            v for v in validators 
            if not isinstance(v, serializers.UniqueTogetherValidator) 
            and not getattr(v, 'is_unique_validator', False)  # in case of custom ones
        ]

class ReviewAssignmentCreateSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        submission = attrs.get('submission')
        submission_version = attrs.get('submission_version')
        if submission_version and submission_version.submission_id != submission.id:
            raise serializers.ValidationError("Selected submission version does not belong to the selected manuscript.")

        assigned_to = attrs.get('assigned_to')
        existing_qs = ReviewAssignment.objects.filter(assigned_to=assigned_to)
        if submission_version:
            existing_assignments = existing_qs.filter(submission_version=submission_version)
        else:
            existing_assignments = existing_qs.filter(submission=submission, submission_version__isnull=True)

        reusable_assignment = existing_assignments.filter(
            models.Q(invite_response='withdrawn') |
            models.Q(invite_response='rejected') |
            models.Q(status='cancelled')
        ).first()

        if existing_assignments.exclude(pk=getattr(self.instance, 'pk', None)).exists() and not reusable_assignment:
            raise serializers.ValidationError("This version is already assigned to this reviewer. Please choose another reviewer.")
        return attrs

    class Meta:
        model = ReviewAssignment
        fields = ['submission', 'submission_version', 'assigned_to', 'due_date', 'admin_remarks']
        

# class ReviewerApplicationSerializer(serializers.ModelSerializer):
#     applicant_name = serializers.CharField(source='applicant.full_name', read_only=True)
#     applicant_email = serializers.CharField(source='applicant.email', read_only=True)
#     reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)

#     class Meta:
#         model = ReviewerApplication
#         fields = [
#             'id', 'applicant', 'applicant_name', 'applicant_email',
#             'expertise', 'affiliation', 'publications', 'cv',
#             'availability', 'interests', 'orcid', 'google_scholar',
#             'motivation', 'status', 'submitted_at',
#             'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_remarks'
#         ]
#         read_only_fields = [
#             'applicant', 'submitted_at', 'reviewed_by', 'reviewed_at',
#             'applicant_name', 'applicant_email', 'reviewed_by_name'
#         ]

#     def create(self, validated_data):
#         # Set applicant to current user
#         request = self.context.get('request')
#         if request and request.user.is_authenticated:
#             validated_data['applicant'] = request.user
#         return super().create(validated_data)

# class ReviewerApplicationSerializer(serializers.ModelSerializer):
#     applicant_name = serializers.CharField(source='applicant.full_name', read_only=True, allow_null=True)
#     applicant_email = serializers.CharField(source='applicant.email', read_only=True, allow_null=True)
#     reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)

#     class Meta:
#         model = ReviewerApplication
#         fields = [
#             'id', 'applicant', 'applicant_name', 'applicant_email',
#             'expertise', 'affiliation', 'publications', 'cv',
#             'availability', 'interests', 'orcid', 'google_scholar',
#             'motivation', 'status', 'submitted_at',
#             'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_remarks'
#         ]
#         read_only_fields = [
#             'submitted_at', 'reviewed_by', 'reviewed_at', 'status',
#             'applicant_name', 'applicant_email', 'reviewed_by_name'
#         ]

#     def validate(self, data):
#         # Require email or name for non-logged-in applicants (optional)
#         if not self.context['request'].user.is_authenticated:
#             if not data.get('email') and not data.get('full_name'):
#                 raise serializers.ValidationError("Email or full name is required for guest applications.")
#         return data

#     def create(self, validated_data):
#         request = self.context.get('request')
#         if request and request.user.is_authenticated:
#             validated_data['applicant'] = request.user
#         else:
#             # Public submission → applicant remains None
#             validated_data['applicant'] = None
#         return super().create(validated_data)

# class ReviewerApplicationSerializer(serializers.ModelSerializer):
#     applicant_name = serializers.CharField(source='applicant.full_name', read_only=True, allow_null=True)
#     applicant_email = serializers.CharField(source='applicant.email', read_only=True, allow_null=True)
#     reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)

#     class Meta:
#         model = ReviewerApplication
#         fields = [
#             'id', 'applicant', 'applicant_name', 'applicant_email',
#             'expertise', 'affiliation', 'publications', 'cv',
#             'availability', 'interests', 'orcid', 'google_scholar',
#             'motivation', 'status', 'submitted_at',
#             'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_remarks'
#         ]
#         read_only_fields = [
#             'submitted_at', 'reviewed_by', 'reviewed_at', 'status',
#             'applicant_name', 'applicant_email', 'reviewed_by_name'
#         ]
#         # Important: explicitly allow null/blank for applicant
#         extra_kwargs = {
#             'applicant': {'required': False, 'allow_null': True},
#         }

#     def validate(self, data):
#         # Optional: add custom validation if needed
#         # For guest users, require email/full_name instead
#         request = self.context.get('request')
#         if request and not request.user.is_authenticated:
#             if not data.get('email') or not data.get('full_name'):
#                 raise serializers.ValidationError(
#                     {"non_field_errors": "Email and full name are required for guest submissions."}
#                 )
#         return data

#     def create(self, validated_data):
#         request = self.context.get('request')
#         if request and request.user.is_authenticated:
#             validated_data['applicant'] = request.user
#         else:
#             # For anonymous/public submissions → applicant stays None
#             validated_data['applicant'] = None
#         return super().create(validated_data)

class ReviewerApplicationSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField( required=False)  # ← new
    email = serializers.EmailField( required=False)      # ← new

    applicant_name = serializers.CharField(source='applicant.full_name', read_only=True, allow_null=True)
    applicant_email = serializers.CharField(source='applicant.email', read_only=True, allow_null=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, allow_null=True)

    class Meta:
        model = ReviewerApplication
        fields = [
            'id', 'applicant', 'full_name', 'email', 'applicant_name', 'applicant_email',
            'expertise', 'affiliation', 'publications', 'cv',
            'availability', 'interests', 'orcid', 'google_scholar',
            'motivation', 'status', 'submitted_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_remarks'
        ]
        read_only_fields = [
            'submitted_at', 'reviewed_by', 'reviewed_at',
            'applicant_name', 'applicant_email', 'reviewed_by_name'
        ]
        extra_kwargs = {
            'applicant': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        request = self.context.get('request')
        if request and not request.user.is_authenticated:
            # For guests: require full_name and email
            if not data.get('full_name'):
                raise serializers.ValidationError({"full_name": "Full name is required for guest submissions."})
            if not data.get('email'):
                raise serializers.ValidationError({"email": "Email is required for guest submissions."})

        # Use authenticated user email for validation if not provided in form
        email = data.get('email') or (request.user.email if request and request.user.is_authenticated else None)
        if email:
            existing_apps = ReviewerApplication.objects.filter(email__iexact=email)
            if self.instance is None:
                if request and request.user.is_authenticated:
                    existing_apps = existing_apps.exclude(applicant=request.user)
                existing_apps = existing_apps.exclude(status='rejected')
                if existing_apps.exists():
                    raise serializers.ValidationError({
                        'email': 'A reviewer application already exists with this email address.'
                    })
            else:
                existing_apps = existing_apps.exclude(pk=self.instance.pk).exclude(status='rejected')
                if existing_apps.exists():
                    raise serializers.ValidationError({
                        'email': 'This email address is already associated with another reviewer application.'
                    })

        if self.instance is None and request and request.user.is_authenticated:
            if ReviewerApplication.objects.filter(applicant=request.user).exclude(status='rejected').exists():
                raise serializers.ValidationError({
                    'non_field_errors': 'You have already submitted a reviewer application.'
                })

        return data

    def create(self, validated_data):
        request = self.context.get('request')

        if request and request.user.is_authenticated:
            validated_data['applicant'] = request.user
            # Optional: fill from user profile if blank
            validated_data.setdefault('full_name', request.user.full_name)
            validated_data.setdefault('email', request.user.email)
        # else: guest → full_name and email come directly from form data and WILL BE SAVED

        return super().create(validated_data)
    





class PlagiarismScanSerializer(serializers.ModelSerializer):
    paper_title = serializers.SerializerMethodField()
    paper_id = serializers.IntegerField(source='paper.id', read_only=True, allow_null=True)

    class Meta:
        model = PlagiarismScan
        fields = [
            'scan_id',
            'paper_title',
            'paper_id',
            'status',
            'similarity_score',
            'ai_score',
            'report_url',
            'created_at',
            'completed_at',
        ]

    def get_paper_title(self, obj):
        """Completely safe method - never crashes even if paper is None"""
        try:
            if obj.paper and hasattr(obj.paper, 'title'):
                return obj.paper.title
        except:
            pass
        return "Uploaded Manuscript"


class SubmissionPeriodSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    submissions_count = serializers.SerializerMethodField()
    accepted_count = serializers.SerializerMethodField()
    rejected_count = serializers.SerializerMethodField()
    under_review_count = serializers.SerializerMethodField()
    is_open = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionPeriod
        fields = [
            'id', 'volume', 'issue',
            'title', 'description', 'start_date', 'end_date',
            'is_active', 'is_current', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'submissions_count', 'accepted_count',
            'rejected_count', 'under_review_count', 'is_open'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'submissions_count', 'accepted_count', 'rejected_count', 'under_review_count', 'is_open']

    def get_submissions_count(self, obj):
        return obj.submissions_count

    def get_accepted_count(self, obj):
        return obj.accepted_count

    def get_rejected_count(self, obj):
        return obj.rejected_count

    def get_under_review_count(self, obj):
        return obj.under_review_count

    def get_is_open(self, obj):
        return obj.is_open

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError("End date must be after start date.")

        return attrs