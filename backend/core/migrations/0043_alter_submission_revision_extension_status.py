from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0042_submission_revision_due_date_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='submission',
            name='revision_extension_status',
            field=models.CharField(blank=True, choices=[('none', 'None'), ('requested', 'Requested'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='none', max_length=30),
        ),
    ]
