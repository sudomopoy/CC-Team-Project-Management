from django.contrib import admin
from .models import Task, TimeEntry, TimeEntryEdit, Assignment


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'is_deleted', 'created_by', 'created_at')
    list_filter = ('is_deleted',)
    search_fields = ('title',)


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'task', 'task_title_snapshot', 'date', 'start_time', 'end_time', 'duration_minutes', 'is_deleted')
    list_filter = ('employee', 'date', 'is_deleted')
    search_fields = ('task_title_snapshot', 'short_description')


@admin.register(TimeEntryEdit)
class TimeEntryEditAdmin(admin.ModelAdmin):
    list_display = ('id', 'time_entry', 'editor', 'timestamp')
    list_filter = ('editor', 'timestamp')


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'task', 'employee', 'assigned_by', 'created_at')
    list_filter = ('task', 'employee')



