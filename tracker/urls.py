from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TimeEntryViewSet, ReportsViewSet, EmployeeViewSet, healthcheck

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('time-entries', TimeEntryViewSet, basename='timeentry')
router.register('reports', ReportsViewSet, basename='reports')
router.register('employees', EmployeeViewSet, basename='employee')

urlpatterns = [
    path('health/', healthcheck, name='healthcheck'),
    path('', include(router.urls)),
]


