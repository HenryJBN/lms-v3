#!/bin/bash

# Start Flower monitoring dashboard for Celery
# Usage: ./start_flower.sh

echo "========================================="
echo "Starting Flower Monitoring Dashboard"
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

echo "Starting Flower dashboard..."
echo "Dashboard will be available at: http://localhost:5555"
echo "Press Ctrl+C to stop"
echo ""

# Start Flower
celery -A celery_app flower --port=5555

