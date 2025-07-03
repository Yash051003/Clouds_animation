from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

def index(request):
    """Serve the main cloud animation page"""
    return render(request, 'cloud_app/index.html')

def cloud_data(request):
    """API endpoint for cloud configuration data"""
    cloud_config = {
        'cloud_count': 20,
        'colors': {
            'dawn': '#ffffff',
            'sunrise': '#ffa500',
            'sunset': '#ffc0cb'
        },
        'animation_speed': 0.5,
        'scroll_sensitivity': 1.0
    }
    return JsonResponse(cloud_config)