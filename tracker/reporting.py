from collections import defaultdict
from datetime import date
from typing import Dict, List, Tuple

from django.db.models import Sum

from .models import TimeEntry


def daily_totals(employee_id: int, start: date, end: date):
    qs = (
        TimeEntry.objects.filter(employee_id=employee_id, date__range=(start, end), is_deleted=False)
        .values('date')
        .annotate(total_minutes=Sum('duration_minutes'))
        .order_by('date')
    )
    return [{'date': row['date'].isoformat(), 'minutes': row['total_minutes'] or 0} for row in qs]


def weekly_totals(employee_id: int, start: date, end: date):
    # Group by ISO year-week
    qs = (
        TimeEntry.objects.filter(employee_id=employee_id, date__range=(start, end), is_deleted=False)
        .values('date__iso_year', 'date__week')
        .annotate(total_minutes=Sum('duration_minutes'))
        .order_by('date__iso_year', 'date__week')
    )
    return [
        {'iso_year': row['date__iso_year'], 'iso_week': row['date__week'], 'minutes': row['total_minutes'] or 0}
        for row in qs
    ]


def monthly_totals(employee_id: int, start: date, end: date):
    qs = (
        TimeEntry.objects.filter(employee_id=employee_id, date__range=(start, end), is_deleted=False)
        .values('date__year', 'date__month')
        .annotate(total_minutes=Sum('duration_minutes'))
        .order_by('date__year', 'date__month')
    )
    return [
        {'year': row['date__year'], 'month': row['date__month'], 'minutes': row['total_minutes'] or 0}
        for row in qs
    ]


def monthly_task_pie(employee_id: int, year: int, month: int):
    qs = (
        TimeEntry.objects.filter(employee_id=employee_id, date__year=year, date__month=month, is_deleted=False)
        .values('task_id', 'task_title_snapshot')
        .annotate(total_minutes=Sum('duration_minutes'))
        .order_by('-total_minutes')
    )
    total = sum((row['total_minutes'] or 0) for row in qs) or 1
    data = []
    for row in qs:
        minutes = row['total_minutes'] or 0
        percent = round((minutes / total) * 100, 2)
        data.append({
            'task_id': row['task_id'],
            'label': row['task_title_snapshot'],
            'minutes': minutes,
            'percent': percent,
        })
    return data


def task_breakdown(employee_id: int, start: date, end: date):
    entries = (
        TimeEntry.objects.filter(employee_id=employee_id, date__range=(start, end), is_deleted=False)
        .select_related('task')
        .order_by('task_title_snapshot', 'date', 'start_time')
    )
    tasks: Dict[str, Dict] = {}
    for e in entries:
        key = e.task_title_snapshot
        if key not in tasks:
            tasks[key] = {'task_id': e.task_id, 'title': key, 'total_minutes': 0, 'entries': []}
        tasks[key]['total_minutes'] += e.duration_minutes
        tasks[key]['entries'].append({
            'id': e.id,
            'date': e.date.isoformat(),
            'start_time': e.start_time.isoformat(),
            'end_time': e.end_time.isoformat(),
            'minutes': e.duration_minutes,
            'short_description': e.short_description,
            'is_task_deleted': bool(e.task is None or (e.task and e.task.is_deleted)),
        })
    return list(tasks.values())



