# backend/core/management/commands/createsuperuser.py
from django.contrib.auth.management.commands import createsuperuser
from django.core.management import CommandError

class Command(createsuperuser.Command):
    def handle(self, *args, **options):
        super().handle(*args, **options)
        username = options.get('username')
        if username:
            user = self.UserModel.objects.get(username=username)
            user.role = 'admin'
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully set role="admin" for {username}'))