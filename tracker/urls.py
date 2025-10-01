from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TimeEntryViewSet, ReportsViewSet, EmployeeViewSet, ProjectViewSet, ProjectMembershipViewSet, SettlementViewSet, healthcheck, my_income

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('time-entries', TimeEntryViewSet, basename='timeentry')
router.register('reports', ReportsViewSet, basename='reports')
router.register('employees', EmployeeViewSet, basename='employee')
router.register('projects', ProjectViewSet, basename='project')
router.register('project-memberships', ProjectMembershipViewSet, basename='projectmembership')
router.register('settlements', SettlementViewSet, basename='settlement')

urlpatterns = [
    path('health/', healthcheck, name='healthcheck'),
    path('me/income/', my_income, name='my_income'),
    path('', include(router.urls)),
]


