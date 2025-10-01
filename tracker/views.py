from datetime import datetime

from django.utils import timezone
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Task, TimeEntry, TimeEntryEdit
from django.contrib.auth import get_user_model
from .serializers import TaskSerializer, TimeEntrySerializer, EmployeeSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .reporting import daily_totals, weekly_totals, monthly_totals, monthly_task_pie, task_breakdown


@api_view(['GET'])
@permission_classes([AllowAny])
def healthcheck(request):
    return Response({'status': 'ok'})


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    def perform_destroy(self, instance: Task) -> None:
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = TimeEntry.objects.all().select_related('task', 'employee').order_by('-date', '-start_time')
        user = self.request.user
        if not (user.is_staff or user.is_superuser):
            qs = qs.filter(employee=user)
        employee_id = self.request.query_params.get('employee')
        if employee_id and (user.is_staff or user.is_superuser):
            qs = qs.filter(employee_id=employee_id)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    def perform_destroy(self, instance: TimeEntry) -> None:
        user = self.request.user
        old_values = {
            'is_deleted': instance.is_deleted,
        }
        instance.is_deleted = True
        instance.edited_by = user
        instance.save(update_fields=['is_deleted', 'edited_by'])
        TimeEntryEdit.objects.create(time_entry=instance, editor=user, old_values=old_values, new_values={'is_deleted': True})

    @action(detail=True, methods=['GET'], permission_classes=[IsAdmin])
    def audit(self, request, pk=None):
        entry = self.get_object()
        edits = entry.edits.all().order_by('-timestamp').values('editor_id', 'old_values', 'new_values', 'timestamp')
        return Response({'edits': list(edits)})


class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/daily')
    def daily(self, request, employee_id=None):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        data = daily_totals(int(employee_id), start, end)
        return Response({'series': data})

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/weekly')
    def weekly(self, request, employee_id=None):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        data = weekly_totals(int(employee_id), start, end)
        return Response({'series': data})

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/monthly')
    def monthly(self, request, employee_id=None):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        data = monthly_totals(int(employee_id), start, end)
        return Response({'series': data})

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/pie')
    def pie(self, request, employee_id=None):
        year = int(request.query_params.get('year'))
        month = int(request.query_params.get('month'))
        data = monthly_task_pie(int(employee_id), year, month)
        return Response({'series': data})

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/tasks')
    def tasks(self, request, employee_id=None):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        data = task_breakdown(int(employee_id), start, end)
        return Response({'tasks': data})


User = get_user_model()


class EmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True).order_by('username')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]



