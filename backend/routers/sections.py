from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid

from database.connection import database
from models.schemas import (
    SectionCreate, SectionUpdate, SectionResponse,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_instructor_or_admin

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_sections(
    pagination: PaginationParams = Depends(),
    course_id: Optional[uuid.UUID] = Query(None),
    current_user = Depends(require_instructor_or_admin)
):
    """Get all sections for admin management"""
    offset = (pagination.page - 1) * pagination.size

    # Build WHERE conditions
    where_conditions = []
    params = {"offset": offset, "limit": pagination.size}

    if course_id:
        where_conditions.append("s.course_id = :course_id")
        params["course_id"] = course_id

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

    # Main query
    query = f"""
        SELECT
            s.*,
            COUNT(l.id) as lesson_count
        FROM course_sections s
        LEFT JOIN lessons l ON s.id = l.section_id
        WHERE {where_clause}
        GROUP BY s.id
        ORDER BY s.course_id, s.sort_order
        LIMIT :limit OFFSET :offset
    """

    # Count query
    count_query = f"""
        SELECT COUNT(*) as total
        FROM course_sections s
        WHERE {where_clause}
    """

    sections = await database.fetch_all(query, values=params)
    count_result = await database.fetch_one(count_query, values={k: v for k, v in params.items() if k not in ["offset", "limit"]})

    total = count_result.total if count_result else 0
    total_pages = (total + pagination.size - 1) // pagination.size

    return PaginatedResponse(
        items=[SectionResponse(**section) for section in sections],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=total_pages
    )

@router.get("/course/{course_id}", response_model=List[SectionResponse])
async def get_course_sections(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    """Get sections for a specific course"""
    # Check if course exists and user has access
    course_query = """
        SELECT c.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE c.id = :course_id
    """

    course_check = await database.fetch_one(course_query, values={
        "course_id": course_id,
        "user_id": current_user.id
    })

    if not course_check:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check access (enrolled, instructor, or admin)
    has_access = (
        course_check.is_enrolled or
        str(course_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get sections
    query = """
        SELECT
            s.*,
            COUNT(l.id) as lesson_count
        FROM course_sections s
        LEFT JOIN lessons l ON s.id = l.section_id
        WHERE s.course_id = :course_id
        GROUP BY s.id
        ORDER BY s.sort_order
    """

    sections = await database.fetch_all(query, values={"course_id": course_id})
    return [SectionResponse(**section) for section in sections]

@router.get("/{section_id}", response_model=SectionResponse)
async def get_section(
    section_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    """Get a specific section"""
    query = """
        SELECT
            s.*,
            COUNT(l.id) as lesson_count
        FROM course_sections s
        LEFT JOIN lessons l ON s.id = l.section_id
        WHERE s.id = :section_id
        GROUP BY s.id
    """

    section = await database.fetch_one(query, values={"section_id": section_id})

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Check if user has access to the course
    course_query = """
        SELECT c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE c.id = :course_id
    """

    course_check = await database.fetch_one(course_query, values={
        "course_id": section.course_id,
        "user_id": current_user.id
    })

    if course_check:
        has_access = (
            course_check.is_enrolled or
            str(course_check.instructor_id) == str(current_user.id) or
            current_user.role == "admin"
        )

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    return SectionResponse(**section)

@router.post("/", response_model=SectionResponse)
async def create_section(
    section: SectionCreate,
    current_user = Depends(require_instructor_or_admin)
):
    """Create a new section"""
    # Check if course exists and user has permission
    course_query = "SELECT instructor_id FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": section.course_id})

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to create sections for this course")

    # Get next sort order
    sort_query = """
        SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
        FROM course_sections WHERE course_id = :course_id
    """
    sort_result = await database.fetch_one(sort_query, values={"course_id": section.course_id})

    section_id = uuid.uuid4()

    query = """
        INSERT INTO course_sections (
            id, course_id, title, description, sort_order, is_published
        )
        VALUES (
            :id, :course_id, :title, :description, :sort_order, :is_published
        )
        RETURNING *
    """

    values = {
        "id": section_id,
        "sort_order": sort_result.next_order,
        **section.dict()
    }

    new_section = await database.fetch_one(query, values=values)
    return SectionResponse(**new_section)

@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: uuid.UUID,
    section_update: SectionUpdate,
    current_user = Depends(require_instructor_or_admin)
):
    """Update a section"""
    # Check if section exists and user has permission
    check_query = """
        SELECT s.*, c.instructor_id
        FROM course_sections s
        JOIN courses c ON s.course_id = c.id
        WHERE s.id = :section_id
    """
    existing_section = await database.fetch_one(check_query, values={"section_id": section_id})

    if not existing_section:
        raise HTTPException(status_code=404, detail="Section not found")

    if current_user.role != "admin" and str(existing_section.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this section")

    # Build update query
    update_fields = []
    values = {"section_id": section_id}

    for field, value in section_update.dict(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = :{field}")
            values[field] = value

    if not update_fields:
        return SectionResponse(**existing_section)

    query = f"""
        UPDATE course_sections
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :section_id
        RETURNING *
    """

    updated_section = await database.fetch_one(query, values=values)
    return SectionResponse(**updated_section)

@router.delete("/{section_id}")
async def delete_section(
    section_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    """Delete a section"""
    # Check if section exists and user has permission
    check_query = """
        SELECT s.*, c.instructor_id
        FROM course_sections s
        JOIN courses c ON s.course_id = c.id
        WHERE s.id = :section_id
    """
    existing_section = await database.fetch_one(check_query, values={"section_id": section_id})

    if not existing_section:
        raise HTTPException(status_code=404, detail="Section not found")

    if current_user.role != "admin" and str(existing_section.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this section")

    # Delete section (cascade will handle lessons)
    query = "DELETE FROM course_sections WHERE id = :section_id"
    await database.execute(query, values={"section_id": section_id})

    return {"message": "Section deleted successfully"}
