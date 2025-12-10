from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid

from database.connection import database
from models.schemas import (
    CourseResponse, CourseCreate, CourseUpdate, CategoryResponse,
    PaginationParams, PaginatedResponse, CourseLevel, CourseStatus, FileUploadResponse
)
from middleware.auth import get_current_active_user, require_instructor_or_admin, require_admin
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
    status: Optional[CourseStatus] = Query(CourseStatus.published)
):
    # Build query with filters
    where_conditions = ["c.status = :status"]
    values = {
        "status": status,
        "size": pagination.size, 
        "offset": (pagination.page - 1) * pagination.size
    }
    
    if category_id:
        where_conditions.append("c.category_id = :category_id")
        values["category_id"] = category_id
    
    if level:
        where_conditions.append("c.level = :level")
        values["level"] = level
    
    if is_free is not None:
        where_conditions.append("c.is_free = :is_free")
        values["is_free"] = is_free
    
    if is_featured is not None:
        where_conditions.append("c.is_featured = :is_featured")
        values["is_featured"] = is_featured
    
    if instructor_id:
        where_conditions.append("c.instructor_id = :instructor_id")
        values["instructor_id"] = instructor_id
    
    if search:
        where_conditions.append("""
            (c.title ILIKE :search OR c.description ILIKE :search OR 
             c.short_description ILIKE :search)
        """)
        values["search"] = f"%{search}%"
    
    where_clause = "WHERE " + " AND ".join(where_conditions)
    
    # Get total count (exclude pagination params)
    count_query = f"""
        SELECT COUNT(*) as total 
        FROM courses c {where_clause}
    """
    count_values = {k: v for k, v in values.items() if k not in ["size", "offset"]}
    total_result = await database.fetch_one(count_query, values=count_values)
    total = total_result["total"] if total_result else 0
    
    # Get courses with instructor info
    query = f"""
        SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
               cat.name as category_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        {where_clause}
        ORDER BY c.created_at DESC
        LIMIT :size OFFSET :offset
    """
    
    courses = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[CourseResponse(**course) for course in courses],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.get("/featured/", response_model=List[CourseResponse])
async def get_featured_courses():
    query = """
        SELECT * FROM courses 
        WHERE is_featured = true 
        ORDER BY title
    """
    
    featured_courses  = await database.fetch_all(query)
    return [CourseResponse(**featured_course) for featured_course in featured_courses]



@router.get("/{slug}", response_model=CourseResponse)
async def get_course(slug: str):
    """
    Fetch a course by its slug with instructor and category info.
    """
    query = """
        SELECT 
            c.*, 
            u.first_name AS instructor_first_name, 
            u.last_name AS instructor_last_name,
            cat.name AS category_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE c.slug = :slug
    """

    course = await database.fetch_one(query, values={"slug": slug})

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseResponse(**dict(course))


@router.post("/", response_model=CourseResponse)
async def create_course(
    course: CourseCreate,
    current_user = Depends(require_instructor_or_admin)
):
    course_id = uuid.uuid4()
    
    query = """
        INSERT INTO courses (
            id, title, slug, description, short_description, thumbnail_url,
            trailer_video_url, instructor_id, category_id, level, price,
            original_price, currency, duration_hours, language, requirements,
            learning_outcomes, target_audience, tags, is_featured, is_free,
            enrollment_limit
        )
        VALUES (
            :id, :title, :slug, :description, :short_description, :thumbnail_url,
            :trailer_video_url, :instructor_id, :category_id, :level, :price,
            :original_price, :currency, :duration_hours, :language, :requirements,
            :learning_outcomes, :target_audience, :tags, :is_featured, :is_free,
            :enrollment_limit
        )
        RETURNING *
    """
    
    values = {
        "id": course_id,
        "instructor_id": current_user.id,
        **course.dict()
    }
    
    new_course = await database.fetch_one(query, values=values)
    
    # Log admin action if admin created the course
    if current_user.role == "admin":
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
            VALUES (:admin_id, 'course_created', 'course', :target_id, :description)
        """
        
        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "target_id": course_id,
            "description": f"Created course: {course.title}"
        })
    
    return CourseResponse(**new_course)

@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    course_update: CourseUpdate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if course exists and user has permission
    check_query = "SELECT * FROM courses WHERE id = :course_id"
    existing_course = await database.fetch_one(check_query, values={"course_id": course_id})
    
    if not existing_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if user is the instructor or admin
    if current_user.role != "admin" and str(existing_course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this course"
        )
    
    # Build update query
    update_fields = []
    values = {"course_id": course_id}
    
    for field, value in course_update.dict(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = :{field}")
            values[field] = value
    
    if not update_fields:
        return CourseResponse(**existing_course)
    
    query = f"""
        UPDATE courses 
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :course_id
        RETURNING *
    """
    
    updated_course = await database.fetch_one(query, values=values)
    
    # Log admin action
    if current_user.role == "admin":
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
            VALUES (:admin_id, 'course_updated', 'course', :target_id, :description)
        """
        
        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "target_id": course_id,
            "description": f"Updated course: {existing_course.title}"
        })
    
    return CourseResponse(**updated_course)

@router.delete("/{course_id}")
async def delete_course(
    course_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if course exists and user has permission
    check_query = "SELECT * FROM courses WHERE id = :course_id"
    existing_course = await database.fetch_one(check_query, values={"course_id": course_id})
    
    if not existing_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if user is the instructor or admin
    if current_user.role != "admin" and str(existing_course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this course"
        )
    
    # Soft delete by archiving
    query = """
        UPDATE courses SET status = 'archived', updated_at = NOW()
        WHERE id = :course_id
    """
    
    await database.execute(query, values={"course_id": course_id})
    
    # Log admin action
    if current_user.role == "admin":
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
            VALUES (:admin_id, 'course_deleted', 'course', :target_id, :description)
        """
        
        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "target_id": course_id,
            "description": f"Deleted course: {existing_course.title}"
        })
    
    return {"message": "Course deleted successfully"}

@router.post("/{course_id}/publish")
async def publish_course(
    course_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if course exists and user has permission
    check_query = "SELECT * FROM courses WHERE id = :course_id"
    existing_course = await database.fetch_one(check_query, values={"course_id": course_id})
    
    if not existing_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if user is the instructor or admin
    if current_user.role != "admin" and str(existing_course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to publish this course"
        )
    
    # Update course status
    query = """
        UPDATE courses 
        SET status = 'published', published_at = NOW(), updated_at = NOW()
        WHERE id = :course_id
        RETURNING *
    """
    
    updated_course = await database.fetch_one(query, values={"course_id": course_id})
    
    # Log admin action
    log_query = """
        INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
        VALUES (:admin_id, 'course_published', 'course', :target_id, :description)
    """
    
    await database.execute(log_query, values={
        "admin_id": current_user.id,
        "target_id": course_id,
        "description": f"Published course: {existing_course.title}"
    })
    
    return CourseResponse(**updated_course)

@router.post("/{course_id}/unpublish")
async def unpublish_course(
    course_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if course exists and user has permission
    check_query = "SELECT * FROM courses WHERE id = :course_id"
    existing_course = await database.fetch_one(check_query, values={"course_id": course_id})

    if not existing_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if user is the instructor or admin
    if current_user.role != "admin" and str(existing_course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to unpublish this course"
        )

    # Update course status to draft
    query = """
        UPDATE courses
        SET status = 'draft', updated_at = NOW()
        WHERE id = :course_id
        RETURNING *
    """

    updated_course = await database.fetch_one(query, values={"course_id": course_id})

    # Log admin action
    if current_user.role == "admin":
        log_query = """
            INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, description)
            VALUES (:admin_id, 'course_unpublished', 'course', :target_id, :description)
        """

        await database.execute(log_query, values={
            "admin_id": current_user.id,
            "target_id": course_id,
            "description": f"Unpublished course: {existing_course.title}"
        })

    return CourseResponse(**updated_course)

@router.post("/upload-thumbnail", response_model=FileUploadResponse)
async def upload_course_thumbnail(
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
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
    current_user = Depends(require_instructor_or_admin)
):
    """Upload course trailer video"""
    try:
        result = await upload_video(file, "courses/trailers")
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/categories/", response_model=List[CategoryResponse])
async def get_categories():
    query = """
        SELECT * FROM categories
        WHERE is_active = true
        ORDER BY sort_order, name
    """

    categories = await database.fetch_all(query)
    return [CategoryResponse(**category) for category in categories]



@router.get("/{course_id}/stats")
async def get_course_stats(
    course_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if course exists and user has permission
    check_query = "SELECT * FROM courses WHERE id = :course_id"
    existing_course = await database.fetch_one(check_query, values={"course_id": course_id})
    
    if not existing_course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if user is the instructor or admin
    if current_user.role != "admin" and str(existing_course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view course stats"
        )
    
    # Get course statistics
    stats_query = """
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
    """
    
    stats = await database.fetch_one(stats_query, values={"course_id": course_id})
    
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
