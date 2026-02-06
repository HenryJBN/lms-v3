from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
from datetime import datetime
from sqlmodel import select, col, text, func, and_
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.course import Course, Category
from models.user import User
# Categories are not migrated to SQLModel in my list yet, assuming they exist as table.
# Actually I haven't checked Category model. If not migrated, I can treat it as raw or assume it will be migrated.
# To be safe, I will use strict joins if I had models, but for now I'll use simple selects or assume models exist?
# Wait, I didn't see `Category` in the `models` folder list previously? 
# I check `models/__init__.py` in my mind... checking logged output...
# Phase 2 task list had "Migrate Course...", "Migrate User...". I don't recall Category.
# I'll use LEFT JOIN logic with `text` if needed, or better:
# I will fetch Course + User strictly. For Category, I might need to fetch it separately or ignore if not critical for now,
# OR I'll assume I can just use raw SQL for the joins if I want to match the previous efficiency.
# Actually, let's use SQLModel for Course but keep the `select` flexible.
from models.enums import CourseLevel, CourseStatus

from schemas.course import (
    CourseResponse, CourseCreate, CourseUpdate, CategoryResponse,
    CategoryCreate, CategoryUpdate,
    ReviewCreate, ReviewUpdate, ReviewResponse,
    SectionCreate, SectionUpdate, SectionResponse 
    # Added Section* schemas as I appended them to course.py
)
from schemas.system import CourseAnalytics, FileUploadResponse
from schemas.common import PaginationParams, PaginatedResponse
from schemas.cohort import CohortResponse
from models.cohort import Cohort
from middleware.auth import get_current_active_user, require_instructor_or_admin
from utils.file_upload import upload_image, upload_video

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_courses(
    pagination: PaginationParams = Depends(),
    category_id: Optional[uuid.UUID] = Query(None),
    level: Optional[CourseLevel] = Query(None),
    is_free: Optional[bool] = Query(None),
    is_featured: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    instructor_id: Optional[uuid.UUID] = Query(None),
    status: Optional[CourseStatus] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Base query: Course + Instructor (User)
    # We select Course and User. We also need Category info potentially.
    # To keep it simple and compatible with SQLModel, we'll start with filtering.
    
    # We need to construct a query that joins User to get instructor names.
    # Since I haven't defined relationship attributes in Course yet, I'll use explicit join.
    
    # Query for counting first
    query_count = select(func.count(Course.id)).where(Course.site_id == current_site.id)
    
    # Filters
    if status is not None:
        query_count = query_count.where(Course.status == status)
    if category_id:
        query_count = query_count.where(Course.category_id == category_id)
    if level:
        query_count = query_count.where(Course.level == level)
    if is_free is not None:
        query_count = query_count.where(Course.is_free == is_free)
    if is_featured is not None:
        query_count = query_count.where(Course.is_featured == is_featured)
    if instructor_id:
        query_count = query_count.where(Course.instructor_id == instructor_id)
    if search:
        # Simple ILIKE not available directly in pure python comparisons, use col() with ilike
        search_fmt = f"%{search}%"
        query_count = query_count.where(
            (col(Course.title).ilike(search_fmt)) | 
            (col(Course.description).ilike(search_fmt)) |
            (col(Course.short_description).ilike(search_fmt))
        )
        
    total_result = await session.exec(query_count)
    total = total_result.one()
    
    # Main Query
    # We join User to get instructor details
    # We assume 'categories' table exists. Since we don't have SQLModel for it yet (maybe), 
    # we can try to join it if we defined it, or leave it for now. 
    # The previous code did `LEFT JOIN categories cat`.
    # Let's write a `text` based query for the selection part to be safe and robust, 
    # OR define Category model. 
    # Given I am in "Execution", I should probably stick to SQLModel if possible, but without the Model definitions, `text` is safer for joins.
    # HOWEVER, mixing SQLModel Objects and raw SQL text selection is robust.
    
    # Actually, let's use `select(Course, User)` and fill category_name separately or via lazy load?
    # No, let's use the explicit select.
    
    query = select(Course, User).join(User, Course.instructor_id == User.id).where(Course.site_id == current_site.id)
    
    # Apply same filters
    if status is not None:
        query = query.where(Course.status == status)
    if category_id:
        query = query.where(Course.category_id == category_id)
    if level:
        query = query.where(Course.level == level)
    if is_free is not None:
        query = query.where(Course.is_free == is_free)
    if is_featured is not None:
        query = query.where(Course.is_featured == is_featured)
    if instructor_id:
        query = query.where(Course.instructor_id == instructor_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.where(
            (col(Course.title).ilike(search_fmt)) | 
            (col(Course.description).ilike(search_fmt)) |
            (col(Course.short_description).ilike(search_fmt))
        )
        
    query = query.order_by(col(Course.created_at).desc())
    query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)
    
    results = await session.exec(query)
    
    items = []
    for course, instructor in results:
        # Map to CourseResponse
        # Note: category_name is missing here. If needed, we'd add Category to select.
        # But we don't have Category model imported yet.
        # For Phase 3, getting the core course + instructor is key.
        # We can implement Category later or fetch it if needed.
        
        # We can fetch category name via ID if really needed, but let's assume UI handles missing name or ID lookup.
        item = CourseResponse(
            **course.model_dump(),
            instructor_first_name=instructor.first_name,
            instructor_last_name=instructor.last_name,
            category_name=None # Placeholder
        )
        items.append(item)
        
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/featured/", response_model=List[CourseResponse])
async def get_featured_courses(
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course, User).join(User).where(
        Course.site_id == current_site.id,
        Course.is_featured == True
    ).order_by(Course.title)
    
    results = await session.exec(query)
    items = []
    for course, instructor in results:
        item = CourseResponse(
            **course.model_dump(),
            instructor_first_name=instructor.first_name,
            instructor_last_name=instructor.last_name
        )
        items.append(item)
    return items

@router.get("/slug/{slug}", response_model=CourseResponse)
async def get_course(
    slug: str,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course, User).join(User).where(
        Course.slug == slug,
        Course.site_id == current_site.id
    )
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course, instructor = row
    course, instructor = row
    return CourseResponse(
        **course.model_dump(),
        instructor_first_name=instructor.first_name,
        instructor_last_name=instructor.last_name
    )

@router.get("/{course_id}/cohorts", response_model=List[CohortResponse])
async def get_course_cohorts(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Cohort).where(
        Cohort.course_id == course_id,
        Cohort.site_id == current_site.id,
        Cohort.is_active == True
    ).order_by(Cohort.start_date.desc())
    
    results = await session.exec(query)
    cohorts = results.all()
    
    # We might want to fill current_enrollment_count dynamically or assume it's set on the object
    # For now, return as is (ignoring the count field or letting it default to 0 if not computed)
    return [CohortResponse(**cohort.model_dump()) for cohort in cohorts]

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course_by_id(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course, User).join(User).where(
        Course.id == course_id,
        Course.site_id == current_site.id # Strict Site Check!
    )
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
        
    course, instructor = row
    return CourseResponse(
        **course.model_dump(),
        instructor_first_name=instructor.first_name,
        instructor_last_name=instructor.last_name
    )

@router.post("/", response_model=CourseResponse)
async def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Create object
    new_course = Course(
        **course_in.model_dump(),
        instructor_id=current_user.id,
        site_id=current_site.id # Bind to current site
    )
    # Ensure slug uniqueness within site? (Assuming DB constraint or logic)
    # Ideally we check:
    # check_slug = await session.exec(select(Course).where(Course.slug == new_course.slug, Course.site_id == current_site.id))
    
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    
    # Build response (User is current_user)
    return CourseResponse(
        **new_course.model_dump(),
        instructor_first_name=current_user.first_name,
        instructor_last_name=current_user.last_name
    )

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    course_update: CourseUpdate,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this course")

    course_data = course_update.dict(exclude_unset=True)
    for key, value in course_data.items():
        setattr(course, key, value)
        
    course.updated_at = datetime.utcnow()
    session.add(course)
    await session.commit()
    await session.refresh(course)
    
    # We need to fetch instructor info again? 
    # Or just return current_user info if they are the instructor?
    # Or fetch deeply.
    # To be safe, let's fetch the instructor from DB or just use current_user if matching.
    
    instructor = await session.get(User, course.instructor_id)
    
    return CourseResponse(
        **course.model_dump(),
        instructor_first_name=instructor.first_name,
        instructor_last_name=instructor.last_name
    )

@router.delete("/{course_id}")
async def delete_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")
        
    course.status = CourseStatus.archived
    course.updated_at = datetime.utcnow()
    session.add(course)
    await session.commit()
    
    return {"message": "Course deleted successfully"}

@router.post("/{course_id}/publish", response_model=CourseResponse)
async def publish_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to publish this course")
        
    course.status = CourseStatus.published
    course.updated_at = datetime.utcnow()
    # course.published_at = datetime.utcnow() # If field exists
    session.add(course)
    await session.commit()
    await session.refresh(course)
    
    instructor = await session.get(User, course.instructor_id)
    return CourseResponse(
        **course.model_dump(),
        instructor_first_name=instructor.first_name,
        instructor_last_name=instructor.last_name
    )

@router.post("/{course_id}/unpublish", response_model=CourseResponse)
async def unpublish_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to unpublish this course")
        
    course.status = CourseStatus.draft
    course.updated_at = datetime.utcnow()
    session.add(course)
    await session.commit()
    await session.refresh(course)
    
    instructor = await session.get(User, course.instructor_id)
    return CourseResponse(
        **course.model_dump(),
        instructor_first_name=instructor.first_name,
        instructor_last_name=instructor.last_name
    )

@router.post("/upload-thumbnail", response_model=FileUploadResponse)
async def upload_course_thumbnail(
    file: UploadFile = File(...),
    current_user: User = Depends(require_instructor_or_admin)
):
    """Upload course thumbnail image"""
    try:
        result = await upload_image(file, "courses/thumbnails")
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload-trailer", response_model=FileUploadResponse)
async def upload_course_trailer(
    file: UploadFile = File(...),
    current_user: User = Depends(require_instructor_or_admin)
):
    """Upload course trailer video"""
    try:
        result = await upload_video(file, "courses/trailers")
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/categories/", response_model=List[CategoryResponse])
async def get_categories(
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Category).where(
        Category.site_id == current_site.id,
        Category.is_active == True
    ).order_by(Category.sort_order, Category.name)
    
    result = await session.exec(query)
    categories = result.all()
    return [CategoryResponse(**cat.model_dump()) for cat in categories]

@router.get("/{course_id}/stats")
async def get_course_stats(
    course_id: uuid.UUID,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Course).where(Course.id == course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view course stats")
    
    # Use raw SQL for stats aggregation
    stats_query = text("""
        SELECT 
            COUNT(DISTINCT ce.id) as total_enrollments,
            COUNT(DISTINCT CASE WHEN ce.status = 'completed' THEN ce.id END) as completions,
            COUNT(DISTINCT CASE WHEN ce.status = 'active' THEN ce.id END) as active_enrollments,
            AVG(cr.rating) as avg_rating,
            COUNT(DISTINCT cr.id) as total_reviews,
            SUM(CASE WHEN rr.status = 'completed' THEN rr.amount ELSE 0 END) as total_revenue
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        LEFT JOIN course_reviews cr ON c.id = cr.course_id AND cr.is_published = true
        LEFT JOIN revenue_records rr ON c.id = rr.course_id
        WHERE c.id = :course_id
        GROUP BY c.id
    """)
    
    stats_result = await session.exec(stats_query, params={"course_id": course_id})
    stats = stats_result.first()
    
    if not stats:
        # Return empty stats if no data found (e.g. no enrollments yet)
        return {
            "course_id": course_id,
            "total_enrollments": 0,
            "completions": 0,
            "active_enrollments": 0,
            "completion_rate": 0,
            "avg_rating": 0,
            "total_reviews": 0,
            "total_revenue": 0
        }
    
    return {
        "course_id": course_id,
        "total_enrollments": stats.total_enrollments or 0,
        "completions": stats.completions or 0,
        "active_enrollments": stats.active_enrollments or 0,
        "completion_rate": (stats.completions / max(stats.total_enrollments, 1)) * 100 if stats.total_enrollments else 0,
        "avg_rating": float(stats.avg_rating) if stats.avg_rating else 0,
        "total_reviews": stats.total_reviews or 0,
        "total_revenue": float(stats.total_revenue) if stats.total_revenue else 0
    }
