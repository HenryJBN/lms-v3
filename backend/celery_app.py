"""
Celery application configuration for background tasks
"""
from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Get Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "dca_lms",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks.email_tasks']  # Import task modules
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,

    # Task execution settings
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit

    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        'master_name': 'mymaster'
    },

    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Retry settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Task autodiscovery
    imports=['tasks.email_tasks'],  # Explicitly import task modules

    # Beat schedule (for periodic tasks)
    beat_schedule={
        # Example: Send weekly reports every Monday at 9 AM
        # 'send-weekly-reports': {
        #     'task': 'tasks.email_tasks.send_weekly_reports',
        #     'schedule': crontab(hour=9, minute=0, day_of_week=1),
        # },
    },
)

if __name__ == '__main__':
    celery_app.start()

