from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tracker', '0005_merge_20251001_2057'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeentry',
            name='source',
            field=models.CharField(choices=[('manual', 'Manual'), ('timer', 'Timer')], default='manual', max_length=16),
            preserve_default=False,
        ),
    ]


