from django.db import models

class CloudConfiguration(models.Model):
    """Model to store cloud animation configurations"""
    name = models.CharField(max_length=100)
    cloud_count = models.IntegerField(default=20)
    dawn_color = models.CharField(max_length=7, default='#ffffff')
    sunrise_color = models.CharField(max_length=7, default='#ffa500')
    sunset_color = models.CharField(max_length=7, default='#ffc0cb')
    animation_speed = models.FloatField(default=0.5)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name