from datetime import timedelta
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone as django_timezone
from rest_framework.test import APIClient

from .models import Issue, Paper, ReviewerApplication, ReviewAssignment, Role, Submission, SubmissionPeriod, SubmissionVersion, User, Volume
from .serializers import PaperSerializer, ReviewAssignmentCreateSerializer, ReviewerApplicationSerializer, SubmissionSerializer
from .views import send_revision_submission_acknowledgement, send_submission_acknowledgement


class SendSubmissionAcknowledgementEmailTests(TestCase):
    def test_acknowledgement_email_includes_submission_date(self):
        author = User.objects.create_user(
            email='author@example.com',
            password='password123',
            full_name='Author Name',
        )
        submission = Submission.objects.create(
            title='Test Manuscript',
            abstract='Sample abstract',
            keywords='test',
            manuscript_type='article',
            submitted_by=author,
            corresponding_author=author,
            files=SimpleUploadedFile('test.pdf', b'%PDF-1.4', content_type='application/pdf'),
        )

        with patch('core.views.send_mail') as mock_send_mail:
            sent = send_submission_acknowledgement(submission)

        self.assertTrue(sent)
        self.assertEqual(mock_send_mail.call_count, 1)

        _, text_message, _, recipient_emails, *_ = mock_send_mail.call_args.args
        self.assertEqual(recipient_emails, [author.email])
        self.assertIn('Submission date:', text_message)
        self.assertIn('(GMT+6)', text_message)
        self.assertIn(django_timezone.localtime(submission.created_at).strftime('%d %B %Y'), text_message)


class ReviewerApplicationValidationTests(TestCase):
    def test_duplicate_reviewer_application_email_fails_validation(self):
        ReviewerApplication.objects.create(
            full_name='Existing Reviewer',
            email='duplicate@example.com',
            expertise='Hydrology',
            affiliation='Test University',
            publications='Paper A',
            cv=SimpleUploadedFile('existing_cv.pdf', b'PDF', content_type='application/pdf'),
            availability='2-4',
            motivation='I want to support the journal.',
        )

        serializer = ReviewerApplicationSerializer(data={
            'full_name': 'Duplicate Reviewer',
            'email': 'duplicate@example.com',
            'expertise': 'Water Resource Management',
            'affiliation': 'Another University',
            'publications': 'Paper B',
            'cv': SimpleUploadedFile('cv.pdf', b'PDF', content_type='application/pdf'),
            'availability': '2-4',
            'motivation': 'Experienced reviewer.',
        }, context={})

        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        self.assertEqual(
            serializer.errors['email'][0],
            'A reviewer application already exists with this email address.'
        )

    def test_rejected_reviewer_application_allows_reapply_with_same_email(self):
        ReviewerApplication.objects.create(
            full_name='Rejected Reviewer',
            email='reapply@example.com',
            expertise='Hydrology',
            affiliation='Test University',
            publications='Paper A',
            cv=SimpleUploadedFile('existing_cv.pdf', b'PDF', content_type='application/pdf'),
            availability='2-4',
            motivation='I want to support the journal.',
            status='rejected',
        )

        serializer = ReviewerApplicationSerializer(data={
            'full_name': 'Reapply Reviewer',
            'email': 'reapply@example.com',
            'expertise': 'Water Resource Management',
            'affiliation': 'Another University',
            'publications': 'Paper B',
            'cv': SimpleUploadedFile('cv.pdf', b'PDF', content_type='application/pdf'),
            'availability': '2-4',
            'motivation': 'Experienced reviewer.',
        }, context={})

        self.assertTrue(serializer.is_valid(), serializer.errors)


class ReviewerApplicationReviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = Role.objects.create(name='admin')
        self.admin_user = User.objects.create_user(
            email='admin@example.com',
            password='password123',
            full_name='Admin User',
            role=self.admin_role,
        )
        self.application = ReviewerApplication.objects.create(
            full_name='Jane Reviewer',
            email='jane@example.com',
            expertise='Ecology',
            affiliation='Test University',
            publications='Paper A',
            availability='2-4',
            motivation='I would like to support the journal.',
        )

    def test_rejecting_application_removes_record_and_sends_email(self):
        self.client.force_authenticate(self.admin_user)

        with patch('core.views.send_mail') as mock_send_mail:
            response = self.client.patch(
                f'/api/reviewer-applications/{self.application.id}/',
                {
                    'status': 'rejected',
                    'review_remarks': 'Not a fit for our current needs.',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ReviewerApplication.objects.filter(pk=self.application.pk).exists())
        mock_send_mail.assert_called_once()


class SubmissionValidationTests(TestCase):
    def test_duplicate_manuscript_title_for_same_author_fails_validation(self):
        user = User.objects.create_user(
            email='author@example.com',
            password='password123',
            full_name='Author Name',
        )
        period = SubmissionPeriod.objects.create(
            title='Spring 2026',
            description='Test period',
            start_date=django_timezone.now(),
            end_date=django_timezone.now() + timedelta(days=30),
            is_active=True,
        )
        Submission.objects.create(
            submission_period=period,
            title='Duplicate Title',
            abstract='First abstract',
            keywords='test',
            manuscript_type='original-research',
            submitted_by=user,
            corresponding_author=user,
            files=SimpleUploadedFile('first.pdf', b'%PDF-1.4', content_type='application/pdf'),
            originality_declaration=True,
        )

        request = type('Request', (), {'user': user})()
        serializer = SubmissionSerializer(data={
            'submission_period': period.id,
            'title': 'Duplicate Title',
            'abstract': 'Second abstract',
            'keywords': 'test',
            'manuscript_type': 'original-research',
            'originality_declaration': True,
            'files': SimpleUploadedFile('second.pdf', b'%PDF-1.4', content_type='application/pdf'),
        }, context={'request': request})

        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)
        self.assertIn('already submitted a manuscript with this title', serializer.errors['title'][0])


class PaperSerializerValidationTests(TestCase):
    def test_duplicate_doi_returns_specific_validation_message(self):
        volume = Volume.objects.create(number=99, year=2026, title='Test Volume')
        issue = Issue.objects.create(volume=volume, number=1, period='Test Period')
        Paper.objects.create(
            issue=issue,
            title='Existing Paper',
            authors='Author One',
            abstract='Abstract',
            keywords='test',
            pages='1-2',
            doi='existing-doi',
            file=SimpleUploadedFile('existing.pdf', b'%PDF-1.4', content_type='application/pdf'),
        )

        serializer = PaperSerializer(data={
            'issue_id': issue.id,
            'title': 'New Paper',
            'authors': 'Author Two',
            'abstract': 'Another abstract',
            'keywords': 'test',
            'pages': '3-4',
            'doi': 'existing-doi',
            'file': SimpleUploadedFile('new.pdf', b'%PDF-1.4', content_type='application/pdf'),
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('doi', serializer.errors)
        self.assertEqual(
            serializer.errors['doi'][0],
            'This DOI already exists. Please use a different DOI.'
        )


class ReviewAssignmentReassignmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = Role.objects.create(name='admin')
        self.reviewer_role = Role.objects.create(name='reviewer')
        self.editor = User.objects.create_user(
            email='editor@example.com',
            password='password123',
            full_name='Editor User',
            role=self.admin_role,
        )
        self.reviewer_one = User.objects.create_user(
            email='reviewer1@example.com',
            password='password123',
            full_name='Reviewer One',
            role=self.reviewer_role,
        )
        self.reviewer_two = User.objects.create_user(
            email='reviewer2@example.com',
            password='password123',
            full_name='Reviewer Two',
            role=self.reviewer_role,
        )
        self.submission = Submission.objects.create(
            title='Reassignment Test Manuscript',
            abstract='Test abstract',
            keywords='review, assignment',
            manuscript_type='article',
            submitted_by=self.editor,
            corresponding_author=self.editor,
            files=SimpleUploadedFile('test.pdf', b'%PDF-1.4', content_type='application/pdf'),
        )
        self.assignment = ReviewAssignment.objects.create(
            submission=self.submission,
            assigned_to=self.reviewer_one,
            due_date=django_timezone.now().date() + timedelta(days=7),
            status='in_progress',
            invite_response='accepted',
        )

    def test_add_mode_creates_a_new_assignment_without_withdrawing_the_existing_one(self):
        self.client.force_authenticate(self.editor)

        with patch('core.views.send_mail'):
            response = self.client.post(
                f'/api/review-assignments/{self.assignment.id}/reassign/',
                {
                    'assigned_to': self.reviewer_two.id,
                    'mode': 'add',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ReviewAssignment.objects.filter(submission=self.submission).count(), 2)
        self.assertEqual(ReviewAssignment.objects.get(pk=self.assignment.id).status, 'in_progress')
        self.assertEqual(ReviewAssignment.objects.get(pk=self.assignment.id).invite_response, 'accepted')
        new_assignment = ReviewAssignment.objects.exclude(pk=self.assignment.id).get()
        self.assertEqual(new_assignment.assigned_to, self.reviewer_two)
        self.assertEqual(new_assignment.invite_response, 'pending')

    def test_replace_mode_withdraws_the_current_assignment_and_creates_a_new_one(self):
        self.client.force_authenticate(self.editor)

        with patch('core.views.send_mail'):
            response = self.client.post(
                f'/api/review-assignments/{self.assignment.id}/reassign/',
                {
                    'assigned_to': self.reviewer_two.id,
                    'mode': 'replace',
                    'confirm_replace': True,
                },
                format='json',
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ReviewAssignment.objects.filter(submission=self.submission).count(), 2)
        original_assignment = ReviewAssignment.objects.get(pk=self.assignment.id)
        self.assertEqual(original_assignment.status, 'cancelled')
        self.assertEqual(original_assignment.invite_response, 'withdrawn')
        new_assignment = ReviewAssignment.objects.exclude(pk=self.assignment.id).get()
        self.assertEqual(new_assignment.assigned_to, self.reviewer_two)
        self.assertEqual(new_assignment.invite_response, 'pending')

    def test_create_serializer_rejects_duplicate_assignment_for_same_reviewer_and_version(self):
        serializer = ReviewAssignmentCreateSerializer(data={
            'submission': self.submission.id,
            'submission_version': None,
            'assigned_to': self.reviewer_one.id,
            'due_date': django_timezone.now().date() + timedelta(days=7),
            'admin_remarks': 'Duplicate assignment attempt',
        }, context={})

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertIn('already assigned to this reviewer', serializer.errors['non_field_errors'][0])

    def test_reassign_allows_a_new_assignment_when_previous_assignment_for_reviewer_was_withdrawn(self):
        self.assignment.status = 'cancelled'
        self.assignment.invite_response = 'withdrawn'
        self.assignment.save(update_fields=['status', 'invite_response'])

        current_assignment = ReviewAssignment.objects.create(
            submission=self.submission,
            assigned_to=self.reviewer_two,
            due_date=django_timezone.now().date() + timedelta(days=7),
            status='in_progress',
            invite_response='accepted',
        )

        self.client.force_authenticate(self.editor)

        with patch('core.views.send_mail'):
            response = self.client.post(
                f'/api/review-assignments/{current_assignment.id}/reassign/',
                {
                    'assigned_to': self.reviewer_one.id,
                    'mode': 'replace',
                    'confirm_replace': True,
                },
                format='json',
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            ReviewAssignment.objects.filter(submission=self.submission, assigned_to=self.reviewer_one).count(),
            2,
        )
        recreated_assignment = ReviewAssignment.objects.filter(
            submission=self.submission,
            assigned_to=self.reviewer_one,
        ).exclude(pk=self.assignment.id).get()
        self.assertEqual(recreated_assignment.invite_response, 'pending')
        self.assertEqual(recreated_assignment.status, 'assigned')


class SendRevisionSubmissionAcknowledgementEmailTests(TestCase):
    def test_revision_submission_acknowledgement_email_includes_version_and_submission_details(self):
        author = User.objects.create_user(
            email='author@example.com',
            password='password123',
            full_name='Author Name',
        )
        submission = Submission.objects.create(
            title='Test Manuscript Revision',
            abstract='Sample abstract',
            keywords='test',
            manuscript_type='article',
            submitted_by=author,
            corresponding_author=author,
            files=SimpleUploadedFile('test.pdf', b'%PDF-1.4', content_type='application/pdf'),
        )
        version = SubmissionVersion.objects.create(
            submission=submission,
            version_number=2,
            version_type='minor_revision',
            file=SimpleUploadedFile('revision.pdf', b'%PDF-1.4', content_type='application/pdf'),
            created_by=author,
            based_on_decision='minor_revision',
        )

        with patch('core.views.send_mail') as mock_send_mail:
            sent = send_revision_submission_acknowledgement(version)

        self.assertTrue(sent)
        self.assertEqual(mock_send_mail.call_count, 1)

        _, text_message, _, recipient_emails, *_ = mock_send_mail.call_args.args
        self.assertEqual(recipient_emails, [author.email])
        self.assertIn('Revision submitted: Test Manuscript Revision', mock_send_mail.call_args.args[0])
        self.assertIn('Revision version: 2', text_message)
        self.assertIn('Technical Journal', text_message)
