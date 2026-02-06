from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime
from sqlmodel import select, func, and_, or_
from sqlalchemy.orm import selectinload

from database.session import get_session, AsyncSession
from dependencies import get_current_site
from models.site import Site
from models.course import Section, Course
from models.lesson import Lesson
from models.enrollment import Enrollment
from schemas.course import SectionCreate, SectionUpdate, SectionResponse
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_instructor_or_admin
from models.enums import UserRole

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_sections(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    course_id: Optional[uuid.UUID] = Query(None),
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get all sections for admin management"""
    offset = (page - 1) * size

    # Base query
    query = select(Section, func.count(Lesson.id).label("lesson_count")).outerjoin(
        Lesson, Section.id == Lesson.section_id
    ).where(Section.site_id == current_site.id).group_by(Section.id).order_by(Section.course_id, Section.sort_order)

    if course_id:
        query = query.where(Section.course_id == course_id)

    # Count
    count_query = select(func.count(Section.id)).where(Section.site_id == current_site.id)
    if course_id:
        count_query = count_query.where(Section.course_id == course_id)
    
    total_result = await session.exec(count_query)
    total = total_result.one()

    # Pagination
    query = query.offset(offset).limit(size)
    results = await session.exec(query)
    
    transformed_sections = []
    for section, lesson_count in results.all():
        s_dict = section.model_dump()
        s_dict["lesson_count"] = lesson_count
        transformed_sections.append(s_dict)

    total_pages = (total + size - 1) // size

    return PaginatedResponse(
        items=transformed_sections,
        total=total,
        page=page,
        size=size,
        pages=total_pages
    )

@router.get("/course/{course_id}", response_model=List[SectionResponse])
async def get_course_sections(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get sections for a specific course"""
    # Check if course exists and user has access
    query = select(Course, Enrollment.id.label("enrollment_id")).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Course.id == course_id, Course.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    course, enrollment_id = row

    # Check access (enrolled, instructor, or admin)
    has_access = (
        enrollment_id is not None or
        str(course.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get sections
    query = select(Section, func.count(Lesson.id).label("lesson_count")).outerjoin(
        Lesson, Section.id == Lesson.section_id
    ).where(Section.course_id == course_id, Section.site_id == current_site.id).group_by(Section.id).order_by(Section.sort_order)

    results = await session.exec(query)
    
    response_sections = []
    for section, lesson_count in results.all():
        s_dict = section.model_dump()
        s_dict["lesson_count"] = lesson_count
        response_sections.append(s_dict)
        
    return response_sections

@router.get("/{section_id}", response_model=SectionResponse)
async def get_section(
    section_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Get a specific section"""
    query = select(Section, func.count(Lesson.id).label("lesson_count")).outerjoin(
        Lesson, Section.id == Lesson.section_id
    ).where(Section.id == section_id, Section.site_id == current_site.id).group_by(Section.id)

    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    section, lesson_count = row

    # Check if user has access to the course
    course_query = select(Course, Enrollment.id.label("enrollment_id")).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Course.id == section.course_id, Course.site_id == current_site.id)

    course_result = await session.exec(course_query)
    course_row = course_result.first()

    if course_row:
        course, enrollment_id = course_row
        has_access = (
            enrollment_id is not None or
            str(course.instructor_id) == str(current_user.id) or
            current_user.role == "admin"
        )

        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")

    return {**section.model_dump(), "lesson_count": lesson_count}

@router.post("/", response_model=SectionResponse)
async def create_section(
    section_data: SectionCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Create a new section"""
    # Check if course exists and user has permission
    query = select(Course).where(Course.id == section_data.course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to create sections for this course")

    # Get next sort order
    sort_query = select(func.max(Section.sort_order)).where(Section.course_id == section_data.course_id)
    sort_result = await session.exec(sort_query)
    max_order = sort_result.one() or 0

    new_section = Section(
        **section_data.model_dump(),
        sort_order=max_order + 1,
        site_id=current_site.id
    )

    session.add(new_section)
    await session.commit()
    await session.refresh(new_section)
    return new_section

@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: uuid.UUID,
    section_update: SectionUpdate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Update a section"""
    # Check if section exists and user has permission
    query = select(Section, Course.instructor_id).join(
        Course, Section.course_id == Course.id
    ).where(Section.id == section_id, Section.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    section, instructor_id = row

    if current_user.role != UserRole.admin and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this section")

    # Update fields
    update_data = section_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(section, field, value)

    section.updated_at = datetime.utcnow()
    session.add(section)
    await session.commit()
    await session.refresh(section)
    return section

@router.delete("/{section_id}")
async def delete_section(
    section_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """Delete a section"""
    # Check if section exists and user has permission
    query = select(Section, Course.instructor_id).join(
        Course, Section.course_id == Course.id
    ).where(Section.id == section_id, Section.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Section not found")

    section, instructor_id = row

    if current_user.role != UserRole.admin and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this section")

    await session.delete(section)
    await session.commit()

    return {"message": "Section deleted successfully"}
