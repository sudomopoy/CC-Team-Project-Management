from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Task(TimeStampedModel):
    title = models.CharField(max_length=150)
    # Projects group tasks; on project soft-delete we keep tasks for history
    # Using PROTECT to avoid accidental cascading deletion; we rely on is_deleted flags
    project = models.ForeignKey('Project', on_delete=models.PROTECT, related_name='tasks', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='tasks_created')
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        suffix = ' (deleted)' if self.is_deleted else ''
        return f"{self.title}{suffix}"


class TimeEntry(TimeStampedModel):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_entries')
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.SET_NULL, related_name='time_entries')
    task_title_snapshot = models.CharField(max_length=150)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField()
    short_description = models.CharField(max_length=300, null=True, blank=True)
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='time_entries_edited')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date']),
        ]


class TimeEntryEdit(models.Model):
    time_entry = models.ForeignKey(TimeEntry, on_delete=models.CASCADE, related_name='edits')
    editor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    old_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)


class Assignment(TimeStampedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignments')
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='assignments_made')

    class Meta:
        unique_together = ('task', 'employee')


class Project(TimeStampedModel):
    name = models.CharField(max_length=150)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='projects_created')
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        suffix = ' (deleted)' if self.is_deleted else ''
        return f"{self.name}{suffix}"


class ProjectMembership(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_memberships')
    added_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='memberships_added')

    class Meta:
        unique_together = ('project', 'user')


class EmployeeProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    hourly_rate_toman = models.PositiveIntegerField(default=0)
    employee_code = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    ROLE_CHOICES = (
        ('page_admin', 'Page Admin'),
        ('content', 'Content Creator'),
        ('animator', 'Animator'),
        ('developer', 'Developer'),
        ('team_lead', 'Team Lead'),
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default='developer')


class ProjectMonthlyBudget(TimeStampedModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='monthly_budgets')
    year = models.IntegerField()
    month = models.IntegerField()
    budget_toman = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('project', 'year', 'month')


class Settlement(TimeStampedModel):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settlements')
    year = models.IntegerField()
    month = models.IntegerField()
    amount_toman = models.PositiveIntegerField(default=0)
    settled_at = models.DateTimeField(auto_now_add=True)




