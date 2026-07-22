# backend/core/urls.py
from django.urls import path
from .views import (
    AuthorSubmissionDetailView, AuthorSubmissionsListView, CurrentDeadlineView, CustomPaperDownloadView, DeadlineDetailView, DeadlineListCreateView, EditorAssignReviewersView, EditorFinalDecisionView, EditorPublishSubmissionView, AuthorRevisionExtensionRequestView, EditorRevisionExtensionUpdateView, PublicPaperDetailView, PublicRoleListView, RegisterView, LoginView, VerifyEmailView, ForgotPasswordView, ResetPasswordConfirmView,
    ContactMessageView,
    AnnouncementListCreateView, AnnouncementDetailView, PublicAnnouncementListView,
    NewsArticleListCreateView, NewsArticleDetailView, PublicNewsArticleListView, PublicNewsArticleDetailView,
    ImportantDateListCreateView, ImportantDateDetailView, PublicImportantDateListView,
    HeroImageListCreateView, HeroImageDetailView, PublicHeroImageListView,
    CallForPaperAdvertizeListCreateView, CallForPaperAdvertizeDetailView, PublicCallForPaperAdvertizeView,
    GuidelineDocumentListCreateView, GuidelineDocumentDetailView, PublicGuidelineDocumentListView,
    ManuscriptFormatDocumentListCreateView, ManuscriptFormatDocumentDetailView, PublicManuscriptFormatDocumentListView,
    AboutPageContentListCreateView, AboutPageContentDetailView, PublicAboutPageContentView,
    AdminSubmissionFeeUpsertView, AdminPaymentTransactionListView, AuthorPaymentOverviewView, AuthorInitiatePaymentView,
    AuthorPaymentTransactionStatusView, ReviewerPayoutListCreateView, ReviewerPayoutHistoryView, ReviewerPlagiarismScansView,
    SSLCommerzSuccessView, SSLCommerzFailView, SSLCommerzCancelView, SSLCommerzIPNView,
    ManuscriptCommentListCreateView, ManuscriptCommentDetailView,
    ReviewAssignmentListCreateView, ReviewAssignmentDetailView, ReviewerApplicationDetailView, ReviewerApplicationListCreateView, ReviewerListView, SubmissionUpdateView, CallForPapersAPIView,
    UserListView, UserListCreateView, UserDetailView, PublicAuthorListView,
    RoleListCreateView, RoleDetailView,
    ProfileView, ChangePasswordView,
    EditorialBoardListCreateView, EditorialBoardDetailView, PublicEditorialBoardListView, SubmissionListCreateView,
    SubmissionFileDownloadView, VolumeListCreateView, VolumeDetailView, IssueListCreateView, IssueDetailView, PaperListCreateView, PaperDetailView,BulkIssueDownloadView, CurrentIssueView, PublicVolumeListView, PublicIssueListView, PublicPaperListView, IncrementPaperViewAPIView, IncrementPaperDownloadAPIView,PublicPaperDetailView, EditorSubmissionsListView, EditorDeskReviewView, DecisionLogListView
    , ReviewInvitationPreviewView, ReviewInvitationAcceptView, ReviewInvitationRejectView, ReviewAssignmentResendInviteView, ReviewerPerformanceView, SubmissionVersionListCreateView, SubmissionVersionBySubmissionListView,
    GoogleAnalyticsView, PlagiarismCheckView, CopyleaksScanStatusView, copyleaks_result_webhook, copyleaks_status_webhook,
    SubmissionPeriodListCreateView, SubmissionPeriodDetailView, PublicSubmissionPeriodListView, SendFeedbackToAuthorView, CreatePaperFromReadySubmissionView,ReviewAssignmentReassignView
)

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password-confirm/', ResetPasswordConfirmView.as_view(), name='reset-password-confirm'),
    path('contact/', ContactMessageView.as_view(), name='contact-message'),
    
    # Announcements (public + admin management)
    path('announcements/public/', PublicAnnouncementListView.as_view(), name='announcements-public'),
    path('admin/announcements/', AnnouncementListCreateView.as_view(), name='announcements-admin-create'),
    path('admin/announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcements-admin-detail'),

    # News (public + admin management)
    path('news/public/', PublicNewsArticleListView.as_view(), name='news-public'),
    path('news/public/<int:pk>/', PublicNewsArticleDetailView.as_view(), name='news-public-detail'),
    path('admin/news/', NewsArticleListCreateView.as_view(), name='news-admin-create'),
    path('admin/news/<int:pk>/', NewsArticleDetailView.as_view(), name='news-admin-detail'),

    # Important dates (public + admin management)
    path('important-dates/public/', PublicImportantDateListView.as_view(), name='important-dates-public'),
    path('admin/important-dates/', ImportantDateListCreateView.as_view(), name='important-dates-admin-create'),
    path('admin/important-dates/<int:pk>/', ImportantDateDetailView.as_view(), name='important-dates-admin-detail'),
    
    # Hero images (public + admin management)
    path('hero-images/public/', PublicHeroImageListView.as_view(), name='hero-images-public'),
    path('admin/hero-images/', HeroImageListCreateView.as_view(), name='hero-images-admin-create'),
    path('admin/hero-images/<int:pk>/', HeroImageDetailView.as_view(), name='hero-images-admin-detail'),

    # Call for Paper Advertisements (public + admin management)
    path('call-for-paper-advertize/public/', PublicCallForPaperAdvertizeView.as_view(), name='call-for-paper-advertize-public'),
    path('admin/call-for-paper-advertize/', CallForPaperAdvertizeListCreateView.as_view(), name='call-for-paper-advertize-admin-create'),
    path('admin/call-for-paper-advertize/<int:pk>/', CallForPaperAdvertizeDetailView.as_view(), name='call-for-paper-advertize-admin-detail'),

    # Guidelines (public + admin/editor management)
    path('guidelines/public/', PublicGuidelineDocumentListView.as_view(), name='guidelines-public'),
    path('admin/guidelines/', GuidelineDocumentListCreateView.as_view(), name='guidelines-admin-create'),
    path('admin/guidelines/<int:pk>/', GuidelineDocumentDetailView.as_view(), name='guidelines-admin-detail'),

    # Manuscript Format Templates (public + admin/editor management)
    path('manuscript-formats/public/', PublicManuscriptFormatDocumentListView.as_view(), name='manuscript-formats-public'),
    path('admin/manuscript-formats/', ManuscriptFormatDocumentListCreateView.as_view(), name='manuscript-formats-admin-create'),
    path('admin/manuscript-formats/<int:pk>/', ManuscriptFormatDocumentDetailView.as_view(), name='manuscript-formats-admin-detail'),

    # About Page Content (public + admin/editor management)
    path('about-page/public/', PublicAboutPageContentView.as_view(), name='about-page-public'),
    path('admin/about-page/', AboutPageContentListCreateView.as_view(), name='about-page-admin-create'),
    path('admin/about-page/<int:pk>/', AboutPageContentDetailView.as_view(), name='about-page-admin-detail'),

    # Payments (SSLCommerz)
    path('admin/submissions/<int:submission_id>/fee/', AdminSubmissionFeeUpsertView.as_view(), name='admin-submission-fee-upsert'),
    path('admin/payments/transactions/', AdminPaymentTransactionListView.as_view(), name='admin-payment-transactions'),
    path('author/payments/overview/', AuthorPaymentOverviewView.as_view(), name='author-payments-overview'),
    path('author/payments/transaction-status/', AuthorPaymentTransactionStatusView.as_view(), name='author-payment-transaction-status'),
    path('admin/reviewer-payouts/', ReviewerPayoutListCreateView.as_view(), name='reviewer-payouts'),
    path('reviewer/payments/history/', ReviewerPayoutHistoryView.as_view(), name='reviewer-payout-history'),
    path('author/submissions/<int:submission_id>/pay/', AuthorInitiatePaymentView.as_view(), name='author-initiate-payment'),
    path('sslcommerz/success/', SSLCommerzSuccessView.as_view(), name='sslcommerz-success'),
    path('sslcommerz/fail/', SSLCommerzFailView.as_view(), name='sslcommerz-fail'),
    path('sslcommerz/cancel/', SSLCommerzCancelView.as_view(), name='sslcommerz-cancel'),
    path('sslcommerz/ipn/', SSLCommerzIPNView.as_view(), name='sslcommerz-ipn'),
    
    # Reviewer-author manuscript discussion
    path('manuscript-comments/', ManuscriptCommentListCreateView.as_view(), name='manuscript-comments-list-create'),
    path('manuscript-comments/<int:pk>/', ManuscriptCommentDetailView.as_view(), name='manuscript-comments-detail'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Users - TWO ENDPOINTS
    path('users/', UserListView.as_view(), name='user-list'),                    # List all users (admin only)
    path('users/create/', UserListCreateView.as_view(), name='user-create'),     # Create new user (registration flow)
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),       # Get / Update / Delete single user
    path('authors/', PublicAuthorListView.as_view(), name='public-author-list'),  # List all authors (public, for submission form)
    
    path('users/reviewers/', ReviewerListView.as_view(), name='reviewer-list'),
    path('editor-submissions/', EditorSubmissionsListView.as_view(), name='editor-submissions'),

    # Roles
    path('roles/', RoleListCreateView.as_view(), name='role-list-create'),
    path('roles/<int:pk>/', RoleDetailView.as_view(), name='role-detail'),
    path('roles/public/', PublicRoleListView.as_view(), name='public-roles'),

    # Editorial Board
    path('editorial-board/', EditorialBoardListCreateView.as_view(), name='editorial-board-list-create'),
    path('editorial-board/<int:pk>/', EditorialBoardDetailView.as_view(), name='editorial-board-detail'),
    path('editorial-board/public/', PublicEditorialBoardListView.as_view(), name='public-editorial-board'),
    
    # Submissions
    path('submissions/', SubmissionListCreateView.as_view(), name='submission-list-create'),
    path('submissions/<int:submission_id>/download/', SubmissionFileDownloadView.as_view(), name='submission-download'),

    # Admin: Call for Papers email endpoint
    path('admin/call-for-papers/', CallForPapersAPIView.as_view(), name='call-for-papers'),
    # Volumes
    path('volumes/', VolumeListCreateView.as_view(), name='volume-list-create'),
    path('volumes/<int:pk>/', VolumeDetailView.as_view(), name='volume-detail'),

    # Issues
    path('issues/', IssueListCreateView.as_view(), name='issue-list-create'),
    path('issues/<int:pk>/', IssueDetailView.as_view(), name='issue-detail'),

    # Papers
    path('papers/', PaperListCreateView.as_view(), name='paper-list-create'),
    path('papers/create-from-submission/', CreatePaperFromReadySubmissionView.as_view(), name='paper-create-from-submission'),
    path('papers/<int:pk>/', PaperDetailView.as_view(), name='paper-detail'),
    
    path('issues/<int:pk>/bulk-download/', BulkIssueDownloadView.as_view(), name='issue-bulk-download'),
    path('issues/current/', CurrentIssueView.as_view(), name='current-issue'),
    
    # Public read-only endpoints for frontend archives
    path('public/volumes/', PublicVolumeListView.as_view(), name='public-volumes'),
    path('public/issues/', PublicIssueListView.as_view(), name='public-issues'),
    path('public/papers/', PublicPaperListView.as_view(), name='public-papers'),
    
    path('papers/<int:pk>/increment-view/', IncrementPaperViewAPIView.as_view(), name='increment-view'),
    path('papers/<int:pk>/increment-download/', IncrementPaperDownloadAPIView.as_view(), name='increment-download'),
    
    # Public detail (for frontend)
    # Change this line:
    path('public/papers/<int:pk>/', PublicPaperDetailView.as_view(), name='public-paper-detail'),
    # path('public/papers/<int:id>/', PublicPaperDetailView.as_view(), name='public-paper-detail'),
    
    path('papers/<int:pk>/custom-download/', CustomPaperDownloadView.as_view(), name='custom-paper-download'),
    
    
# path('reviewer-assignments/', ReviewerAssignmentListCreateView.as_view(), name='reviewer-assignment-list-create'),
# path('reviewer-assignments/<int:pk>/', ReviewerAssignmentDetailView.as_view(), name='reviewer-assignment-detail'),
    path('review-assignments/', ReviewAssignmentListCreateView.as_view(), name='review-assignment-list-create'),
    path('review-assignments/<int:pk>/', ReviewAssignmentDetailView.as_view(), name='review-assignment-detail'),
    path('review-assignments/<int:pk>/resend-invite/', ReviewAssignmentResendInviteView.as_view(), name='review-assignment-resend-invite'),
    path('review-assignments/<int:pk>/reassign/', ReviewAssignmentReassignView.as_view(), name='review-assignment-reassign'),
    path('review-assignments/<int:pk>/send-to-author/', SendFeedbackToAuthorView.as_view(), name='send-feedback-to-author'),

    # Public/Reviewer invitation endpoints (token-based)
    path('review-invitations/preview/', ReviewInvitationPreviewView.as_view(), name='review-invitation-preview'),
    path('review-invitations/accept/', ReviewInvitationAcceptView.as_view(), name='review-invitation-accept'),
    path('review-invitations/reject/', ReviewInvitationRejectView.as_view(), name='review-invitation-reject'),
    
    path('editor-submissions/', EditorSubmissionsListView.as_view(), name='editor-submissions'),
    path('submissions/<int:pk>/desk-review/', EditorDeskReviewView.as_view(), name='desk-review'),
    path('submissions/<int:pk>/assign-reviewers/', EditorAssignReviewersView.as_view(), name='assign-reviewers'),
    path('submissions/<int:pk>/final-decision/', EditorFinalDecisionView.as_view(), name='final-decision'),
    path('submissions/<int:pk>/revision-extension-request/', AuthorRevisionExtensionRequestView.as_view(), name='revision-extension-request'),
    path('submissions/<int:pk>/revision-extension/', EditorRevisionExtensionUpdateView.as_view(), name='revision-extension-update'),
    path('submissions/<int:pk>/publish/', EditorPublishSubmissionView.as_view(), name='publish-submission'),
    path('decision-logs/', DecisionLogListView.as_view(), name='decision-logs'),
    
    path('author-submissions/', AuthorSubmissionsListView.as_view(), name='author-submissions'),
    path('submission-versions/', SubmissionVersionListCreateView.as_view(), name='submission-version-list-create'),
    path('submissions/<int:pk>/versions/', SubmissionVersionBySubmissionListView.as_view(), name='submission-versions-by-submission'),
    path('submissions/<int:pk>/', SubmissionUpdateView.as_view(), name='submission-update'),
    path('submissions/<int:pk>/detail/', AuthorSubmissionDetailView.as_view(), name='author-submission-detail'),
    
    path('submission-deadline/', CurrentDeadlineView.as_view(), name='current-deadline'),
    path('admin/deadlines/', DeadlineListCreateView.as_view(), name='deadline-list-create'),
    path('admin/deadlines/<int:pk>/', DeadlineDetailView.as_view(), name='deadline-detail'),
    # Reviewer Applications
    path('reviewer-applications/', ReviewerApplicationListCreateView.as_view(), name='reviewer-application-list-create'),
    path('reviewer-applications/<int:pk>/', ReviewerApplicationDetailView.as_view(), name='reviewer-application-detail'),
    path('reviewer-performance/', ReviewerPerformanceView.as_view(), name='reviewer-performance'),
    path('admin/analytics/', GoogleAnalyticsView.as_view(), name='admin-analytics'),
    
    path('plagiarism-check/', PlagiarismCheckView.as_view(), name='plagiarism-check'),
    # path('copyleaks/webhook/<str:scan_id>/status/', your_status_webhook),
    # path('copyleaks/webhook/<str:scan_id>/result/', your_result_webhook),
    # Copyleaks Webhooks
    path('copyleaks/webhook/<str:scan_id>/status/', copyleaks_status_webhook, name='copyleaks-status-webhook'),
    path('copyleaks/webhook/<str:scan_id>/result/', copyleaks_result_webhook, name='copyleaks-result-webhook'),
    path('copyleaks/scan-status/<str:scan_id>/', CopyleaksScanStatusView.as_view(), name='copyleaks-scan-status'),
    path('plagiarism-scans/', ReviewerPlagiarismScansView.as_view(), name='reviewer-plagiarism-scans'),
    path('public/submission-periods/', PublicSubmissionPeriodListView.as_view(), name='public-submission-period-list'),
    path('admin/submission-periods/', SubmissionPeriodListCreateView.as_view(), name='submission-period-list-create'),
    path('admin/submission-periods/<int:pk>/', SubmissionPeriodDetailView.as_view(), name='submission-period-detail'),
]