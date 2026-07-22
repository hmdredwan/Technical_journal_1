# backend/core/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'
        ordering = ['name']


class Announcement(models.Model):
    message = models.TextField(help_text="Announcement text shown in the top marquee bar.")
    link_url = models.URLField(blank=True, null=True, help_text="Optional URL to open when clicking the announcement.")
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first in the marquee.")
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        msg = (self.message or '').strip().replace('\n', ' ')
        return msg[:70] + ('...' if len(msg) > 70 else '')


class NewsArticle(models.Model):
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True, default='')
    content = models.TextField()
    attachment = models.FileField(upload_to='news_attachments/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first.")
    published_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='news_articles_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-published_at', '-created_at']

    def __str__(self):
        return self.title


class ImportantDate(models.Model):
    title = models.CharField(max_length=255)
    date = models.DateField()
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first.")
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='important_dates_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.date})"


class HeroImage(models.Model):
    image = models.ImageField(upload_to='hero_images/', help_text="Hero slide image.")
    alt_text = models.CharField(max_length=255, blank=True, help_text="Accessibility alt text.")
    link_url = models.URLField(blank=True, null=True, help_text="Optional URL to open when clicking the slide.")
    is_active = models.BooleanField(default=True, help_text="If inactive, it will not appear in the homepage carousel.")
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first.")
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hero_images_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return f"HeroImage({self.id}) sort={self.sort_order} active={self.is_active}"


class GuidelineDocument(models.Model):
    """
    Admin/Editor uploaded guideline file (PDF/DOCX) plus extracted text for
    readable rendering on the public guidelines page.
    """
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='guidelines/', blank=True, null=True)
    rendered_pdf = models.FileField(
        upload_to='guidelines/rendered/',
        blank=True,
        null=True,
        help_text="Converted PDF used for faithful rendering of DOCX uploads.",
    )
    file_extension = models.CharField(max_length=20, blank=True, default='')

    extracted_text = models.TextField(blank=True, default='')
    extraction_error = models.TextField(blank=True, default='')

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first.")

    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guidelines_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return f"GuidelineDocument({self.id}) {self.title}"


class ManuscriptFormatDocument(models.Model):
    """
    Admin/Editor uploaded manuscript format templates (PDF/DOC/DOCX) that
    authors can view and download.
    """
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='manuscript_formats/', blank=True, null=True)
    rendered_pdf = models.FileField(
        upload_to='manuscript_formats/rendered/',
        blank=True,
        null=True,
        help_text="Converted PDF used for faithful rendering of DOCX uploads.",
    )
    file_extension = models.CharField(max_length=20, blank=True, default='')

    extracted_text = models.TextField(blank=True, default='')
    extraction_error = models.TextField(blank=True, default='')

    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0, help_text="Lower numbers appear first.")

    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='manuscript_formats_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return f"ManuscriptFormatDocument({self.id}) {self.title}"


class AboutPageContent(models.Model):
    """
    Dynamic content for the About page - Mission, Vision, History, Scope & Topics.
    Each section can be enabled/disabled individually.
    """
    SECTION_CHOICES = [
        ('mission', 'Mission'),
        ('vision', 'Vision'),
        ('history', 'History'),
        ('scope_topics', 'Scope & Topics'),
        ('key_facts', 'Key Facts'),
        ('editorial_team', 'Editorial Team'),
    ]

    section = models.CharField(max_length=50, choices=SECTION_CHOICES, unique=True)
    title = models.CharField(max_length=255)
    content = models.TextField(help_text="Main content text for the section")
    topics = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of topics (used for Scope & Topics section)"
    )
    is_active = models.BooleanField(default=True, help_text="If inactive, section won't appear on the page")
    sort_order = models.IntegerField(default=0, help_text="Order of sections on the page")
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='about_page_contents_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'section']

    def __str__(self):
        return f"{self.get_section_display()} - {self.title}"


class ManuscriptComment(models.Model):
    SENDER_ROLE_CHOICES = [
        ('reviewer', 'Reviewer'),
        ('author', 'Author'),
    ]

    submission = models.ForeignKey('Submission', on_delete=models.CASCADE, related_name='discussion_comments')
    sender = models.ForeignKey('User', on_delete=models.CASCADE, related_name='manuscript_comments')
    sender_role = models.CharField(max_length=20, choices=SENDER_ROLE_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment({self.id}) {self.sender_role} on submission {self.submission_id}"


class CustomUserManager(BaseUserManager):
    """
    Custom manager for User model where email is the unique identifier.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email field must be set"))
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a SuperUser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    # Personal info
    title = models.CharField(max_length=20, blank=True, help_text="e.g. Dr., Prof., Mr.")
    full_name = models.CharField(max_length=255, blank=False)  # required

    # Contact
    email = models.EmailField(unique=True)  # already unique from AbstractUser
    mobile_number = models.CharField(
        max_length=15,
        blank=True,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$', "Enter a valid phone number.")]
    )

    # Address
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Professional
    designation = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=150, blank=True)
    orcid_id = models.CharField(max_length=50, blank=True, null=True, unique=True)
    google_scholar_url = models.URLField(blank=True, null=True)

    # Role
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=False,  # required at registration
        related_name='users'
    )

    # Files
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    cv = models.FileField(upload_to='cvs/', blank=True, null=True)

    # Reviewer payout account details
    payment_bank_name = models.CharField(max_length=100, blank=True, default='')
    payment_account_holder = models.CharField(max_length=150, blank=True, default='')
    payment_account_number = models.CharField(max_length=50, blank=True, default='')
    payment_bkash_number = models.CharField(max_length=25, blank=True, default='')
    payment_nagad_number = models.CharField(max_length=25, blank=True, default='')
    payment_paypal_email = models.EmailField(blank=True, default='')
    payment_notes = models.TextField(blank=True, default='')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = CustomUserManager()

    # Use email for login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # no additional required fields

    def __str__(self):
        return self.email or self.username

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

class EditorialBoardMember(models.Model):
    ROLE_CHOICES = [
        ('editor_in_chief', 'Editor-in-Chief'),
        ('executive_editor', 'Executive Editor'),          
        ('managing_editor', 'Managing Editor'),
        ('associate_editor', 'Associate Editor'),
        ('member', 'Member'),                               
        ('reviewers_panel', 'Reviewers Panel'),             
        ('advisory_board', 'Advisory Board Member'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    title = models.CharField(max_length=100)
    affiliation = models.CharField(max_length=255)
    expertise = models.TextField(blank=True)
    country = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    photo = models.ImageField(upload_to='editorial_photos/', blank=True, null=True)
    role_type = models.CharField(max_length=50, choices=ROLE_CHOICES, default='other')
    order = models.PositiveIntegerField(default=0, help_text="Order for display (lower = first)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Editorial Board Member'
        verbose_name_plural = 'Editorial Board Members'

    def __str__(self):
        return f"{self.name} - {self.title}"

class Submission(models.Model):
    submission_period = models.ForeignKey(
        'SubmissionPeriod',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submissions',
        help_text='Submission period that this manuscript belongs to'
    )
    submission_code = models.CharField(max_length=60, blank=True, null=True, unique=True, help_text='Unique manuscript code like RRIJ_2026_18(1)_01')
    title = models.CharField(max_length=500)
    abstract = models.TextField()
    keywords = models.CharField(max_length=500)
    manuscript_type = models.CharField(max_length=50)
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submissions')
    corresponding_author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='corresponding_submissions')
    authors = models.ManyToManyField(User, related_name='authored_submissions')
    manual_authors = models.TextField(
        blank=True,
        null=True,
        help_text="Comma-separated names of additional/manual authors (if not registered users)"
    )
    conflict_of_interest = models.TextField(
        blank=True,
        null=True,
        help_text="Declare any conflicts of interest"
    )
    acknowledgement = models.TextField(
        blank=True,
        null=True,
        help_text="Acknowledgements, funding sources, etc."
    )
    originality_declaration = models.BooleanField(
        default=False,
        help_text="I confirm that this manuscript is original, has not been previously published, is not currently under consideration elsewhere, and that all authors have approved this submission."
    )
    files = models.FileField(upload_to='submissions/')
    status = models.CharField(max_length=50, default='submitted')
    created_at = models.DateTimeField(auto_now_add=True)
    
    editor_assigned = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_submissions',
        limit_choices_to={'role__name': 'editor'}
    )
    editor_assigned_at = models.DateTimeField(null=True, blank=True)
    desk_review_status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('passed', 'Passed Initial Screening'),
            ('desk_rejected', 'Desk Rejected'),
        ],
        default='pending'
    )
    desk_review_remarks = models.TextField(blank=True, null=True)
    desk_review_date = models.DateTimeField(null=True, blank=True)

    final_decision = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('accept', 'Accept'),
            ('minor_revision', 'Minor Revision'),
            ('major_revision', 'Major Revision'),
            ('reject', 'Reject'),
        ],
        default='pending'
    )
    decision_remarks = models.TextField(blank=True, null=True)
    decision_date = models.DateTimeField(null=True, blank=True)

    # For tracking
    current_status = models.CharField(
        max_length=50,
        choices=[
            ('submitted', 'Submitted'),
            ('desk_review', 'Desk Review'),
            ('under_review', 'Under Review'),
            ('revision_requested', 'Revision Requested'),
            ('ready_for_publication', 'Ready for Publication'),
            ('completed', 'Completed'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
        ],
        default='submitted'
    )

    # Store reviewer feedback sent to author
    reviewer_feedback = models.JSONField(
        default=list,
        blank=True,
        help_text="List of reviewer feedback sent to author, each containing reviewer name, feedback, and checklist"
    )

    # Revision deadline and extension workflow for minor/major revision manuscripts
    revision_due_date = models.DateTimeField(null=True, blank=True)
    revision_extension_reason = models.TextField(blank=True, null=True)
    revision_extension_status = models.CharField(
        max_length=30,
        choices=[('none', 'None'), ('requested', 'Requested'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='none',
        blank=True,
    )
    revision_extension_requested_at = models.DateTimeField(null=True, blank=True)
    revision_extension_approved_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_revision_extensions',
    )


class SubmissionFee(models.Model):
    """
    Admin sets a processing fee per submission (BDT).
    """
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name='processing_fee')
    amount_bdt = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_enabled = models.BooleanField(default=False)
    note = models.TextField(blank=True, default='')

    set_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='fees_set')
    set_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-set_at']

    def __str__(self):
        return f"SubmissionFee(sub={self.submission_id}, enabled={self.is_enabled}, amount={self.amount_bdt})"


class PaymentTransaction(models.Model):
    """
    Stores SSLCommerz payment transactions for a submission processing fee.
    """
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('invalid', 'Invalid'),
    ]

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='payment_transactions')
    payer = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments_made')

    amount_bdt = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='BDT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')

    tran_id = models.CharField(max_length=100, unique=True)
    sessionkey = models.CharField(max_length=255, blank=True, default='')
    val_id = models.CharField(max_length=255, blank=True, default='')

    gateway_page_url = models.URLField(blank=True, default='')

    # Validation result fields (best-effort)
    bank_tran_id = models.CharField(max_length=255, blank=True, default='')
    card_type = models.CharField(max_length=100, blank=True, default='')
    card_brand = models.CharField(max_length=100, blank=True, default='')
    card_issuer = models.CharField(max_length=255, blank=True, default='')
    risk_level = models.CharField(max_length=50, blank=True, default='')
    risk_title = models.CharField(max_length=255, blank=True, default='')

    raw_init_payload = models.JSONField(null=True, blank=True)
    raw_callback_payload = models.JSONField(null=True, blank=True)
    raw_validation_payload = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['submission', 'status']),
            models.Index(fields=['payer', 'status']),
        ]

    def __str__(self):
        return f"PaymentTransaction({self.tran_id}) sub={self.submission_id} status={self.status} amount={self.amount_bdt}"

class ReviewerPayout(models.Model):
    """
    Records reviewer payments for manuscript review work.
    This keeps a simple, auditable payout trail with invoice numbers for admin/editor and reviewer visibility.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('bkash', 'bKash'),
        ('nagad', 'Nagad'),
        ('rocket', 'Rocket'),
        ('paypal', 'PayPal'),
        ('other', 'Other'),
    ]

    reviewer = models.ForeignKey('User', on_delete=models.CASCADE, related_name='reviewer_payouts')
    submission = models.ForeignKey('Submission', on_delete=models.CASCADE, related_name='reviewer_payouts')
    assignment = models.ForeignKey('ReviewAssignment', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewer_payouts')
    amount_bdt = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='bank_transfer')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    invoice_number = models.CharField(max_length=40, unique=True)
    payment_reference = models.CharField(max_length=100, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    generated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_reviewer_payouts')
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ReviewerPayout #{self.invoice_number} - {self.reviewer.full_name or self.reviewer.email}"


class SubmissionVersion(models.Model):
    VERSION_TYPE_CHOICES = [
        ('initial', 'Initial Submission'),
        ('minor_revision', 'Minor Revision'),
        ('major_revision', 'Major Revision'),
        ('editor_update', 'Editorial Update'),
    ]

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    version_type = models.CharField(max_length=30, choices=VERSION_TYPE_CHOICES, default='initial')
    file = models.FileField(upload_to='submission_versions/')
    revision_note = models.TextField(blank=True, null=True)
    based_on_decision = models.CharField(max_length=50, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='submission_versions_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['submission_id', '-version_number']
        constraints = [
            models.UniqueConstraint(fields=['submission', 'version_number'], name='unique_submission_version_number'),
        ]

    def __str__(self):
        return f"{self.submission.title} - V{self.version_number}"

class DecisionLog(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='decision_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)  # e.g., "desk_rejected", "assigned_reviewers", "final_decision: accept"
    remarks = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

class Volume(models.Model):
    number = models.PositiveIntegerField(unique=True)
    year = models.PositiveIntegerField()
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-number']

    def __str__(self):
        return f"Volume {self.number} ({self.year})"


class Issue(models.Model):
    volume = models.ForeignKey(Volume, on_delete=models.CASCADE, related_name='issues')
    number = models.PositiveIntegerField()
    period = models.CharField(max_length=100, blank=True)  
    publication_date = models.DateField(null=True, blank=True)
    cover_image = models.ImageField(upload_to='issues/covers/', blank=True, null=True)
    introductory_file = models.FileField(upload_to='issues/intro/', blank=True, null=True)  # optional intro PDF/DOC
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('volume', 'number')
        ordering = ['-volume__year', '-volume__number', '-number']

    def __str__(self):
        return f"Vol {self.volume.number}, Issue {self.number}"


class SubmissionPeriod(models.Model):
    """
    Manages submission periods for specific journal volumes and issues.
    Tracks when submissions are open for a particular volume/issue combination.
    Volume and Issue are stored as text fields, allowing flexible naming.
    """
    volume = models.CharField(max_length=255, help_text="Volume name or number (e.g., 'Volume 1', 'Vol 2024')", blank=True, null=True)
    issue = models.CharField(max_length=255, help_text="Issue name or number (e.g., 'Issue 1', 'Special Issue')", blank=True, null=True)
    title = models.CharField(max_length=255, help_text="Descriptive title for this submission period")
    description = models.TextField(blank=True, help_text="Optional description of the call for papers")

    # Period dates
    start_date = models.DateTimeField(help_text="When submissions open for this period")
    end_date = models.DateTimeField(help_text="When submissions close for this period")

    # Status
    is_active = models.BooleanField(default=True, help_text="Whether this submission period is currently active")
    is_current = models.BooleanField(default=False, help_text="Whether this is the current active period (only one can be current)")

    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submission_periods_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'Submission Period'
        verbose_name_plural = 'Submission Periods'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gt=models.F('start_date')),
                name='end_date_after_start_date'
            )
        ]

    def __str__(self):
        return f"{self.title} - Vol {self.volume}, Issue {self.issue}"

    @property
    def is_open(self):
        """Check if the submission period is currently open"""
        from django.utils import timezone
        now = timezone.now()
        return self.is_active and self.start_date <= now <= self.end_date

    @property
    def submissions_count(self):
        """Count submissions made during this period"""
        return Submission.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date
        ).count()

    @property
    def accepted_count(self):
        """Count accepted submissions during this period"""
        return Submission.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
            current_status='accepted'
        ).count()

    @property
    def rejected_count(self):
        """Count rejected submissions during this period"""
        return Submission.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
            current_status='rejected'
        ).count()

    @property
    def under_review_count(self):
        """Count submissions under review during this period"""
        return Submission.objects.filter(
            created_at__gte=self.start_date,
            created_at__lte=self.end_date,
            current_status='under_review'
        ).count()

    def save(self, *args, **kwargs):
        # Ensure only one period is marked as current
        if self.is_current:
            SubmissionPeriod.objects.filter(is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Paper(models.Model):
    issue = models.ForeignKey(Issue, on_delete=models.CASCADE, related_name='papers')
    title = models.CharField(max_length=500)
    authors = models.TextField()  # comma-separated or JSON later
    abstract = models.TextField(blank=True)
    keywords = models.CharField(max_length=500, blank=True)
    pages = models.CharField(max_length=50, blank=True)
    doi = models.CharField(max_length=100, blank=True, unique=True)
    file = models.FileField(upload_to='papers/')
    views = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title
    


class ReviewAssignment(models.Model):  # renamed for clarity
    submission = models.ForeignKey(
        Submission, 
        on_delete=models.CASCADE, 
        related_name='review_assignments'
    )
    submission_version = models.ForeignKey(
        SubmissionVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='review_assignments'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='review_assignments',
        limit_choices_to={'role__name__in': ['reviewer', 'editorial_board']}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    admin_remarks = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=50,
        choices=[
            ('assigned', 'Assigned'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('rejected', 'Rejected'),
            ('overdue', 'Overdue'),
            ('cancelled', 'Cancelled'),
        ],
        default='assigned'
    )

    INVITE_RESPONSE_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    invite_response = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('rejected', 'Rejected'),
            ('withdrawn', 'Withdrawn'),
        ],
        default='pending',
        help_text="Reviewer response to the invitation email (accept/reject/withdraw)."
    )
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invite_responded_at = models.DateTimeField(null=True, blank=True)
    invite_rejection_reasons = models.JSONField(blank=True, null=True, default=list)
    invite_rejection_note = models.TextField(blank=True, null=True)

    review_report = models.FileField(upload_to='review_reports/', blank=True, null=True)
    plagiarism_report = models.FileField(upload_to='review_reports/', blank=True, null=True)
    reviewer_remarks = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    # New fields for enhanced review feedback
    comment_to_author = models.TextField(blank=True, null=True, help_text="Comments visible to the author")
    comment_to_editor = models.TextField(blank=True, null=True, help_text="Comments visible to the editor/admin")
    recommendation = models.CharField(
        max_length=50,
        choices=[
            ('accept', 'Accept'),
            ('minor_revision', 'Minor Revision'),
            ('major_revision', 'Major Revision'),
            ('reject', 'Reject'),
            ('pending', 'Pending'),
        ],
        default='pending',
        help_text="Reviewer's recommendation for the manuscript"
    )

    # Manuscript quality checklist fields
    is_important_for_scientific_community = models.BooleanField(
        null=True,
        blank=True,
        help_text="Is the manuscript important for scientific community?"
    )
    is_title_suitable = models.BooleanField(
        null=True,
        blank=True,
        help_text="Is the title of the article suitable?"
    )
    alternative_title = models.TextField(
        blank=True,
        null=True,
        help_text="Alternative title suggestion if current title is not suitable"
    )
    is_abstract_comprehensive = models.BooleanField(
        null=True,
        blank=True,
        help_text="Is the abstract of the article comprehensive?"
    )
    is_intro_conclusion_sufficient = models.BooleanField(
        null=True,
        blank=True,
        help_text="Do the author(s) provide a sufficient overview in the introduction and conclusion?"
    )
    is_structure_appropriate = models.BooleanField(
        null=True,
        blank=True,
        help_text="Are subsections and structure of the manuscript appropriate?"
    )
    are_references_sufficient = models.BooleanField(
        null=True,
        blank=True,
        help_text="Are the references sufficient and recent?"
    )
    additional_references = models.TextField(
        blank=True,
        null=True,
        help_text="Additional reference suggestions"
    )
    is_language_quality_suitable = models.BooleanField(
        null=True,
        blank=True,
        help_text="Is language/English quality of the article suitable for scholarly communications?"
    )

    # Feedback sent to author tracking
    feedback_sent_to_author = models.BooleanField(
        default=False,
        help_text="Whether the review feedback has been sent to the author"
    )
    feedback_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the feedback was sent to the author"
    )
    feedback_sent_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback_sent_reviews',
        help_text="Admin/editor who sent the feedback to author"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['submission', 'assigned_to'],
                condition=models.Q(submission_version__isnull=True),
                name='unique_assignment_per_submission_without_version',
            ),
            models.UniqueConstraint(
                fields=['submission_version', 'assigned_to'],
                condition=models.Q(submission_version__isnull=False),
                name='unique_assignment_per_submission_version',
            ),
        ]
        ordering = ['-assigned_at']

    def __str__(self):
        version_label = f" V{self.submission_version.version_number}" if self.submission_version else ""
        return f"{self.submission.title}{version_label} → {self.assigned_to.full_name}"

    def is_overdue(self):
        from django.utils import timezone
        return self.due_date and self.due_date < timezone.now().date() and self.status not in ['completed', 'rejected']

class SubmissionDeadline(models.Model):
    deadline = models.DateTimeField(
        help_text="Final date and time for new manuscript submissions"
    )
    extended_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deadline_extensions'
    )
    extended_at = models.DateTimeField(auto_now_add=False, null=True, blank=True)
    note = models.TextField(blank=True, help_text="Reason for extension (optional)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Submission Deadline"
        verbose_name_plural = "Submission Deadlines"
        ordering = ['-deadline']

    def __str__(self):
        return f"Deadline: {self.deadline.strftime('%Y-%m-%d %H:%M')}"

    @classmethod
    def get_current_deadline(cls):
        """Returns the most recent (latest) deadline object"""
        return cls.objects.order_by('-deadline').first()

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.deadline

    @property
    def time_remaining(self):
        from django.utils import timezone
        if self.is_expired:
            return None
        delta = self.deadline - timezone.now()
        return {
            'days': delta.days,
            'hours': delta.seconds // 3600,
            'minutes': (delta.seconds // 60) % 60,
            'seconds': delta.seconds % 60,
        }




class ReviewerApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    applicant = models.ForeignKey(
            User,
            on_delete=models.SET_NULL,          # ← important: SET_NULL instead of CASCADE
            null=True,                          # ← allow null
            blank=True,                         # ← allow blank in forms/serializers
            related_name='reviewer_applications'
        )
    full_name = models.CharField(max_length=255, blank=True, help_text="Full name for guest applicants")
    email = models.EmailField(blank=True, help_text="Email for guest applicants")
    expertise = models.TextField(help_text="Your main fields of expertise")
    affiliation = models.CharField(max_length=255, help_text="Current institution/organization")
    publications = models.TextField(blank=True, help_text="Key publications (last 5–10 years)")
    cv = models.FileField(upload_to='reviewer_cvs/', help_text="Upload your CV (PDF preferred)")
    availability = models.CharField(
        max_length=50,
        help_text="How many reviews can you handle per year?"
    )
    interests = models.TextField(blank=True, help_text="Research interests / keywords")
    orcid = models.CharField(max_length=50, blank=True, help_text="ORCID iD")
    google_scholar = models.URLField(blank=True, help_text="Google Scholar profile URL")
    motivation = models.TextField(help_text="Why do you want to review for Technical Journal?")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_applications'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = "Reviewer Application"
        verbose_name_plural = "Reviewer Applications"

    def __str__(self):
        return f"Application by {self.applicant.full_name} ({self.status})"
    


class PlagiarismScan(models.Model):
    paper = models.ForeignKey('Paper', on_delete=models.CASCADE, related_name='plagiarism_scans', null= True, blank=True)
    scan_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=50, default='pending')  # pending, completed, error
    similarity_score = models.FloatField(null=True, blank=True)
    ai_score = models.FloatField(null=True, blank=True)  # AI generated probability
    report_url = models.URLField(max_length=500, null=True, blank=True)
    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Scan {self.scan_id} - {self.paper.title}"


class CallForPaperAdvertize(models.Model):
    """
    Call for Paper Advertisement: Admin can upload PDF or image file that displays
    as a modal on the homepage. Can be manually deactivated or set to auto-deactivate
    after a specified time period.
    """
    file = models.FileField(
        upload_to='call_for_paper_ads/',
        help_text="Upload a PDF or image file for the advertisement."
    )
    file_type = models.CharField(
        max_length=10,
        choices=[('pdf', 'PDF'), ('image', 'Image')],
        default='pdf',
        help_text="Type of file uploaded."
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional title/name for this advertisement."
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description or notes about this advertisement."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="If inactive, the advertisement will not be displayed."
    )
    inactive_after = models.DateTimeField(
        null=True,
        blank=True,
        help_text="If set, the advertisement will automatically become inactive after this date/time."
    )
    created_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='call_for_paper_ads_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Call for Paper Advertisement'
        verbose_name_plural = 'Call for Paper Advertisements'

    def __str__(self):
        return f"CallForPaperAdvertize({self.id}) - {self.title or 'Untitled'}"
