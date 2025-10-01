from datetime import datetime

from django.utils import timezone
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Task, TimeEntry, TimeEntryEdit, Project, ProjectMembership, EmployeeProfile, ProjectMonthlyBudget, Settlement
from django.contrib.auth import get_user_model
from .serializers import TaskSerializer, TimeEntrySerializer, EmployeeSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .reporting import daily_totals, weekly_totals, monthly_totals, monthly_task_pie, task_breakdown


@api_view(['GET'])
@permission_classes([AllowAny])
def healthcheck(request):
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_income(request):
    from datetime import date
    today = date.today()
    year, month = today.year, today.month
    user = request.user
    rate = getattr(getattr(user, 'profile', None), 'hourly_rate_toman', 0)
    qs = TimeEntry.objects.filter(employee=user, date__year=year, date__month=month, is_deleted=False)
    minutes = qs.aggregate(total=Sum('duration_minutes'))['total'] or 0
    income = int(round((minutes / 60) * (rate or 0)))
    paid = Settlement.objects.filter(employee=user, year=year, month=month).aggregate(total=Sum('amount_toman'))['total'] or 0
    outstanding = max(income - paid, 0)
    return Response({
        'year': year,
        'month': month,
        'minutes': minutes,
        'hourly_rate_toman': rate,
        'income_toman': income,
        'paid_toman': paid,
        'outstanding_toman': outstanding,
    })


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_destroy(self, instance: Task) -> None:
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])


class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = TimeEntry.objects.filter(is_deleted=False).select_related('task', 'employee').order_by('-date', '-start_time')
        user = self.request.user
        if not (user.is_staff or user.is_superuser):
            qs = qs.filter(employee=user)
            # Hide entries created before the latest settlement timestamp
            last_settlement = Settlement.objects.filter(employee=user).order_by('-settled_at').first()
            if last_settlement:
                qs = qs.filter(created_at__gte=last_settlement.settled_at)
        # Optional project filter
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(task__project_id=project_id)
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

    @action(detail=False, methods=['GET'], url_path='employee/(?P<employee_id>[^/.]+)/income')
    def income(self, request, employee_id=None):
        from datetime import date
        today = date.today()
        year, month = today.year, today.month
        rate = 0
        try:
            rate = EmployeeProfile.objects.get(user_id=employee_id).hourly_rate_toman
        except EmployeeProfile.DoesNotExist:
            rate = 0
        minutes = TimeEntry.objects.filter(employee_id=employee_id, date__year=year, date__month=month, is_deleted=False).aggregate(total=Sum('duration_minutes'))['total'] or 0
        income = int((minutes / 60) * rate)
        paid = Settlement.objects.filter(employee_id=employee_id, year=year, month=month).aggregate(total=Sum('amount_toman'))['total'] or 0
        outstanding = max(income - paid, 0)
        return Response({'year': year, 'month': month, 'minutes': minutes, 'hourly_rate_toman': rate, 'income_toman': income, 'paid_toman': paid, 'outstanding_toman': outstanding})

    @action(detail=False, methods=['GET'], url_path='project/(?P<project_id>[^/.]+)/budget')
    def project_budget(self, request, project_id=None):
        from datetime import date
        today = date.today()
        year, month = today.year, today.month
        budget = ProjectMonthlyBudget.objects.filter(project_id=project_id, year=year, month=month).first()
        budget_toman = budget.budget_toman if budget else 0
        minutes = TimeEntry.objects.filter(task__project_id=project_id, date__year=year, date__month=month, is_deleted=False).aggregate(total=Sum('duration_minutes'))['total'] or 0
        # Sum cost = sum over entries employee_rate * hours; approximate using current rate
        # For simplicity multiply by employee current rate
        spent = 0
        for te in TimeEntry.objects.filter(task__project_id=project_id, date__year=year, date__month=month, is_deleted=False).select_related('employee'):
            rate = getattr(getattr(te.employee, 'profile', None), 'hourly_rate_toman', 0)
            spent += int((te.duration_minutes/60) * (rate or 0))
        return Response({'year': year, 'month': month, 'budget_toman': budget_toman, 'spent_toman': spent})


User = get_user_model()


class EmployeeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.filter(is_active=True).order_by('username')
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]

    @action(detail=True, methods=['PATCH'], permission_classes=[IsAdmin])
    def rate(self, request, pk=None):
        user = self.get_object()
        rate = int(request.data.get('hourly_rate_toman', 0))
        profile, _ = EmployeeProfile.objects.get_or_create(user=user)
        profile.hourly_rate_toman = max(rate, 0)
        profile.save(update_fields=['hourly_rate_toman'])
        return Response({'user_id': user.id, 'hourly_rate_toman': profile.hourly_rate_toman})

    @action(detail=True, methods=['POST'], permission_classes=[IsAdmin])
    def settle(self, request, pk=None):
        from datetime import date
        user = self.get_object()
        today = date.today()
        year, month = today.year, today.month
        # compute income
        rate = getattr(getattr(user, 'profile', None), 'hourly_rate_toman', 0)
        minutes = TimeEntry.objects.filter(employee=user, date__year=year, date__month=month, is_deleted=False).aggregate(total=Sum('duration_minutes'))['total'] or 0
        income = int(round((minutes / 60) * (rate or 0)))
        paid = Settlement.objects.filter(employee=user, year=year, month=month).aggregate(total=Sum('amount_toman'))['total'] or 0
        outstanding = max(income - paid, 0)
        if outstanding > 0:
            Settlement.objects.create(employee=user, year=year, month=month, amount_toman=outstanding)
        return Response({'user_id': user.id, 'year': year, 'month': month, 'settled_amount_toman': outstanding})

    @action(detail=False, methods=['POST'], permission_classes=[IsAdmin])
    def create_user(self, request):
        username = request.data.get('username')
        email = request.data.get('email', '')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        phone = request.data.get('phone', '')
        role = request.data.get('role', 'developer')
        employee_code = request.data.get('employee_code')
        hourly_rate_toman = int(request.data.get('hourly_rate_toman') or 0)
        password = request.data.get('password')

        if not username:
            return Response({'username': 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'username': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User(username=username, email=email, first_name=first_name, last_name=last_name, is_active=True)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        profile, _ = EmployeeProfile.objects.get_or_create(user=user)
        profile.phone = phone
        profile.role = role if role in dict(EmployeeProfile.ROLE_CHOICES) else 'developer'
        profile.employee_code = employee_code
        profile.hourly_rate_toman = max(hourly_rate_toman, 0)
        profile.save()
        data = EmployeeSerializer(user).data
        return Response(data, status=status.HTTP_201_CREATED)


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()

    def get_serializer(self, *args, **kwargs):
        from .serializers import serializers
        class _ProjectSerializer(serializers.ModelSerializer):
            class Meta:
                model = Project
                fields = ['id', 'name', 'created_by', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']
                read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'deleted_at']

            def create(self, validated_data):
                validated_data['created_by'] = self.context['request'].user
                return super().create(validated_data)

        kwargs.setdefault('context', self.get_serializer_context())
        return _ProjectSerializer(*args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-admins: only projects where they are members
        user = self.request.user
        if not (user.is_staff or user.is_superuser):
            qs = qs.filter(memberships__user=user).distinct()
        return qs

    def perform_destroy(self, instance: Project) -> None:
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])


class ProjectMembershipViewSet(viewsets.ModelViewSet):
    queryset = ProjectMembership.objects.all().select_related('project', 'user').order_by('-created_at')
    permission_classes = [IsAdmin]

    def get_serializer(self, *args, **kwargs):
        from .serializers import serializers
        class _MembershipSerializer(serializers.ModelSerializer):
            class Meta:
                model = ProjectMembership
                fields = ['id', 'project', 'user', 'added_by', 'created_at']
                read_only_fields = ['id', 'added_by', 'created_at']

            def create(self, validated_data):
                validated_data['added_by'] = self.context['request'].user
                return super().create(validated_data)

        kwargs.setdefault('context', self.get_serializer_context())
        return _MembershipSerializer(*args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class SettlementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Settlement.objects.all().select_related('employee').order_by('-settled_at')
    permission_classes = [IsAdmin]

    def get_serializer(self, *args, **kwargs):
        from .serializers import serializers
        class _SettlementSerializer(serializers.ModelSerializer):
            employee_username = serializers.CharField(source='employee.username', read_only=True)
            class Meta:
                model = Settlement
                fields = ['id', 'employee', 'employee_username', 'year', 'month', 'amount_toman', 'settled_at']
        kwargs.setdefault('context', self.get_serializer_context())
        return _SettlementSerializer(*args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs


