from datetime import datetime, timedelta
from typing import Any, Dict

from django.conf import settings
from django.utils import timezone
from django.utils.timezone import make_aware
from django.db.models import Q
from rest_framework import serializers

from .models import Task, TimeEntry, TimeEntryEdit, Assignment


def get_local_today_yesterday():
    now = timezone.localtime(timezone.now())
    today = now.date()
    yesterday = today - timedelta(days=1)
    return today, yesterday


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'created_by', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'deleted_at']

    def create(self, validated_data: Dict[str, Any]) -> Task:
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)


class EmployeeSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField()
    first_name = serializers.CharField(allow_blank=True, required=False)
    last_name = serializers.CharField(allow_blank=True, required=False)
    is_active = serializers.BooleanField()


class TimeEntrySerializer(serializers.ModelSerializer):
    task_title_snapshot = serializers.CharField(read_only=True)
    employee = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee', 'task', 'task_title_snapshot', 'date',
            'start_time', 'end_time', 'duration_minutes', 'short_description',
            'created_at', 'updated_at', 'edited_by', 'is_deleted'
        ]
        read_only_fields = ['id', 'task_title_snapshot', 'duration_minutes', 'created_at', 'updated_at', 'edited_by', 'is_deleted']

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        request = self.context['request']
        user = request.user

        date = attrs.get('date') or getattr(self.instance, 'date', None)
        start_time = attrs.get('start_time') or getattr(self.instance, 'start_time', None)
        end_time = attrs.get('end_time') or getattr(self.instance, 'end_time', None)
        task = attrs.get('task') or getattr(self.instance, 'task', None)

        if date is None or start_time is None or end_time is None:
            return attrs

        if end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'end_time must be after start_time'})

        today, yesterday = get_local_today_yesterday()

        is_admin = user.is_staff or user.is_superuser
        method = request.method
        if not is_admin:
            if method in ['POST', 'PUT', 'PATCH']:
                if date not in (today, yesterday):
                    raise serializers.ValidationError({'date': 'You can only log hours for today or yesterday.'})

        # Overlap prevention on same employee/date
        employee = user if self.instance is None else self.instance.employee
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute

        qs = TimeEntry.objects.filter(employee=employee, date=date, is_deleted=False)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        # Overlap if not (end<=s or start>=e)
        for other in qs.only('start_time', 'end_time'):
            s = other.start_time.hour * 60 + other.start_time.minute
            e = other.end_time.hour * 60 + other.end_time.minute
            if not (end_minutes <= s or start_minutes >= e):
                raise serializers.ValidationError('Time overlaps with an existing entry.')

        return attrs

    def _compute_duration_minutes(self, date, start_time, end_time) -> int:
        # Use timezone-aware datetimes with project TZ for DST-safe differences
        local_tz = timezone.get_current_timezone()
        start_dt = make_aware(datetime.combine(date, start_time), local_tz)
        end_dt = make_aware(datetime.combine(date, end_time), local_tz)
        delta = end_dt - start_dt
        return int(delta.total_seconds() // 60)

    def create(self, validated_data: Dict[str, Any]) -> TimeEntry:
        request = self.context['request']
        user = request.user
        validated_data['employee'] = user
        task = validated_data.get('task')
        validated_data['task_title_snapshot'] = task.title if task else ''
        validated_data['duration_minutes'] = self._compute_duration_minutes(
            validated_data['date'], validated_data['start_time'], validated_data['end_time']
        )
        instance = super().create(validated_data)
        instance.edited_by = user
        instance.save(update_fields=['edited_by'])
        return instance

    def update(self, instance: TimeEntry, validated_data: Dict[str, Any]) -> TimeEntry:
        request = self.context['request']
        user = request.user

        old_values = {
            'task_id': instance.task_id,
            'task_title_snapshot': instance.task_title_snapshot,
            'date': instance.date.isoformat(),
            'start_time': instance.start_time.isoformat(),
            'end_time': instance.end_time.isoformat(),
            'duration_minutes': instance.duration_minutes,
            'short_description': instance.short_description,
        }

        instance = super().update(instance, validated_data)

        if 'task' in validated_data and instance.task:
            instance.task_title_snapshot = instance.task.title

        instance.duration_minutes = self._compute_duration_minutes(instance.date, instance.start_time, instance.end_time)
        instance.edited_by = user
        instance.save()

        new_values = {
            'task_id': instance.task_id,
            'task_title_snapshot': instance.task_title_snapshot,
            'date': instance.date.isoformat(),
            'start_time': instance.start_time.isoformat(),
            'end_time': instance.end_time.isoformat(),
            'duration_minutes': instance.duration_minutes,
            'short_description': instance.short_description,
        }
        TimeEntryEdit.objects.create(time_entry=instance, editor=user, old_values=old_values, new_values=new_values)
        return instance


