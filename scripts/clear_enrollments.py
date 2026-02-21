#!/usr/bin/env python3
"""
Script to clear all student enrollments, lesson progress, certificates,
token balances, and token transactions for fresh testing.
"""

import psycopg2
from psycopg2 import sql

# Database connection parameters
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "lms_database"
DB_USER = "postgres"
DB_PASSWORD = "1234"

def clear_enrollments():
    """Clear all enrollment-related data from the database."""
    
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Tables to clear in order (respecting foreign key constraints)
    tables = [
        "token_transactions",
        "token_balances", 
        "certificate",
        "lesson_progress",
        "enrollment"
    ]
    
    print("=" * 60)
    print("CLEARING STUDENT ENROLLMENT DATA")
    print("=" * 60)
    print()
    
    total_deleted = 0
    
    for table in tables:
        try:
            # First check if table exists and get count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            
            # Delete all records
            cursor.execute(f"DELETE FROM {table}")
            
            print(f"✓ {table}: Deleted {count} records")
            total_deleted += count
            
        except Exception as e:
            print(f"✗ {table}: Error - {e}")
    
    print()
    print("-" * 60)
    print(f"TOTAL RECORDS DELETED: {total_deleted}")
    print("-" * 60)
    print()
    print("✅ All student enrollments cleared successfully!")
    print("   You can now start fresh testing of:")
    print("   - Course enrollments")
    print("   - Lesson progress tracking")
    print("   - Reward system (token points)")
    print("   - Certificate issuance on completion")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    clear_enrollments()
