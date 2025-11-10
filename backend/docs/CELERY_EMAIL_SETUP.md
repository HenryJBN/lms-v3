# Celery Background Email Setup

## 🎯 Overview

The email system now supports background processing using Celery + Redis for non-blocking email delivery.

## 📋 Quick Setup

### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Verify:**
```bash
redis-cli ping  # Should return: PONG
```

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure Environment

Add to `backend/.env`:

```env
# Redis
REDIS_URL=redis://localhost:6379/0

# SMTP
SMTP_HOST=smtp.mailmug.net
SMTP_PORT=2525
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
SMTP_MAIL_FROM=contact@dcalms.com
SMTP_FROM_NAME=DCA LMS
```

### 4. Start Services

**Terminal 1 - FastAPI:**
```bash
cd backend
uvicorn main:app --reload
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
./start_celery.sh
```

**Terminal 3 - Flower (Optional Monitoring):**
```bash
cd backend
./start_flower.sh
# Open http://localhost:5555
```

## 📧 Usage

### Synchronous (Blocking - for FastAPI routes)

```python
from utils.email import send_welcome_email

# This still blocks but works with async/await
await send_welcome_email("user@example.com", "John")
```

### Asynchronous (Non-blocking - via Celery)

```python
from utils.email_async import send_welcome_email_async

# Returns immediately, email sent in background
task_id = send_welcome_email_async("user@example.com", "John")
```

## 🏗️ Architecture

### Code Organization

**`utils/email.py`** - All email logic (single source of truth)
- `EmailService` class - Handles SMTP, templates, rendering
- `send_*_sync()` functions - Synchronous email functions
- `send_*()` async functions - Async wrappers for FastAPI

**`tasks/email_tasks.py`** - Celery task wrappers
- Thin wrappers around `send_*_sync()` functions
- Only handles Celery retry logic
- No duplicated email logic

**`utils/email_async.py`** - Convenience wrappers
- Easy-to-use functions for queueing emails
- Returns task IDs for tracking

### Why This Design?

✅ **No code duplication** - All email logic in one place (`email.py`)
✅ **Reusable** - Same functions work for sync and async
✅ **Testable** - Can test email logic without Celery
✅ **Flexible** - Easy to swap Celery for another queue system

## 🔍 How It Works

### Before (Synchronous)
```
User registers → Create user → Send email (2-5s) → Return response
Total: 2-5 seconds (user waits)
```

### After (Asynchronous with Celery)
```
User registers → Create user → Queue email (5ms) → Return response
Total: 105ms (user doesn't wait)

Background: Celery worker sends email (2-5s)
```

## 🛠️ Troubleshooting

### SMTP Issues

```bash
cd backend
python3 test_smtp.py
```

### Celery Not Working

```bash
# Check Redis
redis-cli ping

# Check Celery tasks
celery -A celery_app inspect active

# View Flower
open http://localhost:5555
```

### Check Task Status

```python
from utils.email_async import get_task_status

status = get_task_status(task_id)
print(status["status"])  # SUCCESS, PENDING, FAILURE
```

## 📚 Available Functions

### In `utils/email.py` (Synchronous)

- `send_welcome_email_sync()`
- `send_password_reset_email_sync()`
- `send_email_verification_sync()`
- `send_course_enrollment_email_sync()`
- `send_certificate_email_sync()`
- `send_custom_email_sync()`
- `send_bulk_email_sync()`

### In `utils/email.py` (Async wrappers)

- `send_welcome_email()` - Async wrapper
- `send_password_reset_email()` - Async wrapper
- `send_email_verification()` - Async wrapper
- etc.

### In `utils/email_async.py` (Celery)

- `send_welcome_email_async()` - Queue via Celery
- `send_custom_email_async()` - Queue via Celery
- `send_course_enrollment_email_async()` - Queue via Celery
- `send_certificate_email_async()` - Queue via Celery
- `send_bulk_emails_async()` - Queue via Celery
- `get_task_status()` - Check task status

## 🎯 Key Concepts

### `async/await` vs Celery

**`async/await` in Python:**
- Allows efficient handling of multiple requests
- **User still waits** for email to send
- Good for I/O operations, but not true background processing

**Celery:**
- **True background processing**
- User doesn't wait
- Separate worker process handles tasks
- Automatic retries on failure

### Why Remove `async` from EmailService?

SMTP is inherently synchronous (blocking). Using `async` doesn't help because:
- `smtplib` is not async
- No real concurrency benefit
- Just adds complexity

So we made `EmailService` methods synchronous and added thin async wrappers for FastAPI compatibility.

## 📊 Monitoring

### Flower Dashboard

```bash
./start_flower.sh
# Open http://localhost:5555
```

View:
- Active tasks
- Completed tasks
- Failed tasks
- Worker status
- Task execution time

### Command Line

```bash
# Active tasks
celery -A celery_app inspect active

# Registered tasks
celery -A celery_app inspect registered

# Worker stats
celery -A celery_app inspect stats
```

## 🚀 Production Tips

1. **Use Supervisor** - Auto-restart Celery workers
2. **Monitor with Flower** - Track task execution
3. **Set up alerts** - Notify on failed tasks
4. **Scale workers** - Run multiple Celery workers
5. **Use Redis persistence** - Don't lose queued emails

## ✅ Summary

- ✅ All email logic in `utils/email.py` (single source of truth)
- ✅ Celery tasks are thin wrappers (no duplication)
- ✅ Synchronous functions for direct use
- ✅ Async wrappers for FastAPI compatibility
- ✅ Celery tasks for background processing
- ✅ 20-50x faster API responses
- ✅ Automatic retries on failure
- ✅ Easy to test and maintain

