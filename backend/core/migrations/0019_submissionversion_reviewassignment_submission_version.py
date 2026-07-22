from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_reviewassignment_comment_to_author_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SubmissionVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version_number', models.PositiveIntegerField()),
                ('version_type', models.CharField(choices=[('initial', 'Initial Submission'), ('minor_revision', 'Minor Revision'), ('major_revision', 'Major Revision'), ('editor_update', 'Editorial Update')], default='initial', max_length=30)),
                ('file', models.FileField(upload_to='submission_versions/')),
                ('revision_note', models.TextField(blank=True, null=True)),
                ('based_on_decision', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='submission_versions_created', to=settings.AUTH_USER_MODEL)),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='core.submission')),
            ],
            options={
                'ordering': ['submission_id', '-version_number'],
                'constraints': [models.UniqueConstraint(fields=('submission', 'version_number'), name='unique_submission_version_number')],
            },
        ),
        migrations.AddField(
            model_name='reviewassignment',
            name='submission_version',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='review_assignments', to='core.submissionversion'),
        ),
        migrations.AlterUniqueTogether(
            name='reviewassignment',
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name='reviewassignment',
            constraint=models.UniqueConstraint(condition=models.Q(('submission_version__isnull', True)), fields=('submission', 'assigned_to'), name='unique_assignment_per_submission_without_version'),
        ),
        migrations.AddConstraint(
            model_name='reviewassignment',
            constraint=models.UniqueConstraint(condition=models.Q(('submission_version__isnull', False)), fields=('submission_version', 'assigned_to'), name='unique_assignment_per_submission_version'),
        ),
    ]
