#!/bin/bash

# Start Celery worker for DCA LMS
# Usage: ./start_celery.sh

echo "========================================="
echo "Starting Celery Worker for DCA LMS"
echo "========================================="

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ ERROR: Redis is not running!"
    echo ""
    echo "Please start Redis first:"
    echo "  macOS: brew services start redis"
    echo "  Linux: sudo systemctl start redis"
    echo ""
    exit 1
fi

echo "✅ Redis is running"
echo ""

# Check if we're in the backend directory
if [ ! -f "celery_app.py" ]; then
    echo "❌ ERROR: celery_app.py not found!"
    echo "Please run this script from the backend directory"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
elif [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -d "../.venv" ]; then
    echo "Activating virtual environment..."
    source ../.venv/bin/activate
else
    echo "⚠️  Warning: No virtual environment found. Using system Python."
fi

echo "Starting Celery worker..."
echo "Press Ctrl+C to stop"
echo ""

# Start Celery worker with auto-reload for development
celery -A celery_app worker --loglevel=info --pool=solo

# Note: --pool=solo is used for macOS compatibility
# For production on Linux, remove --pool=solo for better performance

