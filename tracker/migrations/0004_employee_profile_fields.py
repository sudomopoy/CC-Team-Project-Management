from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('tracker', '0003_finance'),
    ]

    operations = [
        migrations.AddField(
            model_name='employeeprofile',
            name='employee_code',
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='employeeprofile',
            name='phone',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='employeeprofile',
            name='role',
            field=models.CharField(choices=[('page_admin', 'Page Admin'), ('content', 'Content Creator'), ('animator', 'Animator'), ('developer', 'Developer'), ('team_lead', 'Team Lead')], default='developer', max_length=32),
        ),
    ]


