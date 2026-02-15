from fastapi import HTTPException, status, UploadFile, File, Form
from typing import Dict, Any
import uuid
import io
import csv
import secrets
import string
import json

from database.session import get_session, AsyncSession
from models.user import User
from models.system import AdminAuditLog
from middleware.auth import get_password_hash
from sqlmodel import select, func

async def import_admin_data(
    file: UploadFile = File(...),
    import_type: str = Form(...),
    current_user = None,
    session: AsyncSession = None,
    site_id: uuid.UUID = None
):
    """Import admin data from CSV file"""

    if import_type not in ["users"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid import type. Supported: users"
        )

    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )

    try:
        # Read file content
        content = await file.read()
        csv_content = content.decode('utf-8')

        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content))

        if import_type == "users":
            return await import_users(session, csv_reader, current_user, site_id)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import data: {str(e)}"
        )

async def import_users(session: AsyncSession, csv_reader, current_user, site_id: uuid.UUID):
    """Import users from CSV data"""
    imported_count = 0
    errors = []
    row_number = 1  # Start from 1 (header is row 0)

    for row in csv_reader:
        row_number += 1
        try:
            # Validate required fields
            email = row.get('Email', '').strip()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            role = row.get('Role', 'student').strip().lower()

            if not email or not first_name:
                errors.append(f"Row {row_number}: Email and First Name are required")
                continue

            # Check if user already exists in this site
            query = select(User.id).where(User.email == email, User.site_id == site_id)
            existing_user = (await session.exec(query)).first()
            if existing_user:
                errors.append(f"Row {row_number}: User with email {email} already exists in this site")
                continue

            # Validate role
            if role not in ['student', 'instructor', 'admin']:
                errors.append(f"Row {row_number}: Invalid role '{role}'. Must be student, instructor, or admin")
                continue

            # Derive username from first_name
            username = first_name.lower()

            # Ensure username uniqueness
            base_username = username
            attempt = 0
            while True:
                query = select(User.id).where(User.username == username, User.site_id == site_id)
                existing_username = (await session.exec(query)).first()
                if not existing_username:
                    break
                attempt += 1
                suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(3))
                username = f"{base_username}{suffix}"
                if attempt > 5:
                    username = f"{base_username}{uuid.uuid4().hex[:6]}"
                    break

            # Generate temporary password
            alphabet = string.ascii_letters + string.digits + string.punctuation
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(16))

            # Hash password and create user
            hashed_password = get_password_hash(temp_password)
            user_id = uuid.uuid4()

            # Optional fields
            phone = row.get('Phone', '').strip() or None
            bio = row.get('Bio', '').strip() or None

            new_user = User(
                id=user_id,
                site_id=site_id,
                email=email,
                username=username,
                password_hash=hashed_password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                phone=phone,
                bio=bio
            )
            session.add(new_user)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {row_number}: {str(e)}")
            continue

    # Log import action
    audit_log = AdminAuditLog(
        admin_user_id=current_user.id,
        action="users_imported",
        target_type="users",
        description=f"Imported {imported_count} users from CSV",
        action_metadata=json.dumps({"imported_count": imported_count, "errors_count": len(errors), "errors": errors[:10]}),
        site_id=site_id
    )
    session.add(audit_log)
    await session.commit()

    return {
        "import_type": "users",
        "imported_count": imported_count,
        "errors_count": len(errors),
        "errors": errors,
        "message": f"Successfully imported {imported_count} users" + (f" with {len(errors)} errors" if errors else "")
    }
