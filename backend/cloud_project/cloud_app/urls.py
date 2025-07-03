from django.urls import path, include
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('api/cloud-data', views.cloud_data, name='cloud_data'),
    
]