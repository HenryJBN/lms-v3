from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
import os

from database.connection import database
from models.schemas import (
    LessonCreate, LessonUpdate, LessonResponse,
    QuizCreate, QuizUpdate, QuizResponse,
    QuizQuestionCreate, QuizQuestionUpdate, QuizQuestionResponse,
    QuizAttemptCreate, QuizAttemptResponse,
    AssignmentCreate, AssignmentResponse,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_instructor_or_admin
from utils.file_upload import upload_video, upload_image, upload_file

router = APIRouter()

@router.get("/", response_model=PaginatedResponse)
async def get_all_lessons(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000),
    course_id: Optional[uuid.UUID] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|title|sort_order)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user = Depends(require_instructor_or_admin)
):
    """Get all lessons for admin management with filtering and pagination"""
    offset = (page - 1) * size

    # Build WHERE conditions
    where_conditions = []
    params = {"offset": offset, "limit": size}

    # Course filter
    if course_id:
        where_conditions.append("l.course_id = :course_id")
        params["course_id"] = course_id

    # Type filter
    if type:
        where_conditions.append("l.type = :type")
        params["type"] = type

    # Status filter (is_published)
    if status:
        if status == "published":
            where_conditions.append("l.is_published = true")
        elif status == "draft":
            where_conditions.append("l.is_published = false")

    # Search filter
    if search:
        where_conditions.append("""
            (l.title ILIKE :search OR
             l.description ILIKE :search OR
             c.title ILIKE :search OR
             u.first_name || ' ' || u.last_name ILIKE :search)
        """)
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

    # Build ORDER BY
    order_clause = f"l.{sort_by} {sort_order.upper()}"

    # Main query
    query = f"""
        SELECT
            l.id,
            l.title,
            l.slug,
            l.description,
            l.content,
            l.video_url,
            l.video_duration,
            l.type,
            l.sort_order,
            l.is_published,
            l.is_preview,
            l.prerequisites,
            l.resources,
            l.created_at,
            l.updated_at,
            l.section_id,
            c.title as course_title,
            c.id as course_id,
            s.title as section_title,
            s.id as section_id_ref,
            u.first_name as author_first_name,
            u.last_name as author_last_name,
            u.id as author_id,
            COALESCE(lp.total_views, 0) as views,
            COALESCE(lp.avg_completion, 0) as completion_rate
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN course_sections s ON l.section_id = s.id
        LEFT JOIN (
            SELECT
                lesson_id,
                COUNT(*) as total_views,
                AVG(CASE WHEN status = 'completed' THEN 100 ELSE progress_percentage END) as avg_completion
            FROM lesson_progress
            GROUP BY lesson_id
        ) lp ON l.id = lp.lesson_id
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """

    # Count query for pagination
    count_query = f"""
        SELECT COUNT(*) as total
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE {where_clause}
    """

    # Execute queries
    lessons = await database.fetch_all(query, values=params)
    count_result = await database.fetch_one(count_query, values={k: v for k, v in params.items() if k not in ["offset", "limit"]})

    total = count_result.total if count_result else 0
    total_pages = (total + size - 1) // size

    # Transform results to match frontend expectations
    transformed_lessons = []
    for lesson in lessons:
        # Convert video_duration (seconds) to MM:SS format
        duration_str = "00:00"
        if lesson.video_duration:
            minutes = lesson.video_duration // 60
            seconds = lesson.video_duration % 60
            duration_str = f"{minutes:02d}:{seconds:02d}"

        transformed_lesson = {
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "course": lesson.course_title,
            "course_id": str(lesson.course_id),
            "section_id": str(lesson.section_id) if lesson.section_id else None,
            "section_title": lesson.section_title,
            "type": lesson.type,
            "status": "published" if lesson.is_published else "draft",
            "duration": duration_str,
            "views": lesson.views,
            "completionRate": round(lesson.completion_rate, 1) if lesson.completion_rate else 0,
            "thumbnail": None,  # Could be added later
            "author": f"{lesson.author_first_name} {lesson.author_last_name}",
            "author_id": str(lesson.author_id),
            "createdDate": lesson.created_at.isoformat(),
            "isPreview": lesson.is_preview,
            "hasQuiz": False,  # Could be added later by checking if quiz exists
            "sort_order": lesson.sort_order,
            "video_url": lesson.video_url,
            "slug": lesson.slug
        }
        transformed_lessons.append(transformed_lesson)

    return PaginatedResponse(
        items=transformed_lessons,
        total=total,
        page=page,
        size=size,
        pages=total_pages
    )

@router.get("/course/slug/{course_slug}", response_model=List[LessonResponse])
async def get_course_lessons_by_slug(
    course_slug: str,
    current_user = Depends(get_current_active_user)
):
    # First get the course ID from slug
    course_query = """
        SELECT c.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE c.slug = :course_slug
    """

    course = await database.fetch_one(course_query, values={
        "course_slug": course_slug,
        "user_id": current_user.id
    })

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if user has access
    has_access = (
        course.is_enrolled or
        str(course.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course lessons"
        )

    # Get lessons
    query = """
        SELECT l.*,
               CASE WHEN lp.id IS NOT NULL THEN lp.status ELSE 'not_started' END as progress_status,
               CASE WHEN lp.id IS NOT NULL THEN lp.progress_percentage ELSE 0 END as progress_percentage
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = :user_id
        WHERE l.course_id = :course_id AND l.is_published = true
        ORDER BY l.sort_order, l.created_at
    """

    lessons = await database.fetch_all(query, values={
        "course_id": course.id,
        "user_id": current_user.id
    })

    return [LessonResponse(**lesson) for lesson in lessons]

@router.get("/course/{course_id}", response_model=List[LessonResponse])
async def get_course_lessons(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if user has access to course (enrolled or instructor/admin)
    access_query = """
        SELECT c.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE c.id = :course_id
    """

    access_check = await database.fetch_one(access_query, values={
        "course_id": course_id,
        "user_id": current_user.id
    })

    if not access_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if user has access
    has_access = (
        access_check.is_enrolled or
        str(access_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course lessons"
        )

    # Get lessons
    query = """
        SELECT l.*,
               CASE WHEN lp.id IS NOT NULL THEN lp.status ELSE 'not_started' END as progress_status,
               CASE WHEN lp.id IS NOT NULL THEN lp.progress_percentage ELSE 0 END as progress_percentage
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = :user_id
        WHERE l.course_id = :course_id AND l.is_published = true
        ORDER BY l.sort_order, l.created_at
    """

    lessons = await database.fetch_all(query, values={
        "course_id": course_id,
        "user_id": current_user.id
    })

    return [LessonResponse(**lesson) for lesson in lessons]

@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # For admin preview, allow access to any lesson
    if current_user.role == "admin":
        query = """
            SELECT l.*, c.title as course_title, s.title as section_title
            FROM lessons l
            JOIN courses c ON l.course_id = c.id
            LEFT JOIN course_sections s ON l.section_id = s.id
            WHERE l.id = :lesson_id
        """
        lesson = await database.fetch_one(query, values={"lesson_id": lesson_id})

        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found"
            )

        return LessonResponse(**lesson)
    # Check access and get lesson
    query = """
        SELECT l.*, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled,
               CASE WHEN lp.id IS NOT NULL THEN lp.status ELSE 'not_started' END as progress_status,
               CASE WHEN lp.id IS NOT NULL THEN lp.progress_percentage ELSE 0 END as progress_percentage
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
            AND ce.user_id = :user_id AND ce.status = 'active'
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = :user_id
        WHERE l.id = :lesson_id
    """
    
    lesson = await database.fetch_one(query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })
    
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    # Check access
    has_access = (
        lesson.is_enrolled or 
        str(lesson.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this lesson"
        )
    
    return LessonResponse(**lesson)

@router.post("/", response_model=LessonResponse)
async def create_lesson(
    lesson: LessonCreate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if user owns the course or is admin
    course_query = "SELECT instructor_id FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": lesson.course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create lessons for this course"
        )
    
    # Get next sort order
    sort_query = """
        SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
        FROM lessons WHERE course_id = :course_id
    """
    sort_result = await database.fetch_one(sort_query, values={"course_id": lesson.course_id})
    
    lesson_id = uuid.uuid4()
    
    query = """
        INSERT INTO lessons (
            id, course_id, section_id, title, slug, description, content, type,
            video_url, video_duration, sort_order,
            is_preview, is_published, prerequisites, resources
        )
        VALUES (
            :id, :course_id, :section_id, :title, :slug, :description, :content, :type,
            :video_url, :video_duration, :sort_order,
            :is_preview, :is_published, :prerequisites, :resources
        )
        RETURNING *
    """
    
    # Get lesson data and exclude fields that don't exist in database
    lesson_data = lesson.dict()
    lesson_data.pop('estimated_duration', None)  # Remove fields not in database
    lesson_data.pop('attachments', None)

    values = {
        "id": lesson_id,
        "sort_order": sort_result.next_order,
        **lesson_data
    }
    
    try:
        new_lesson = await database.fetch_one(query, values=values)

        # Update course duration
        await update_course_duration(lesson.course_id)

        return LessonResponse(**new_lesson)
    except Exception as e:
        # Handle unique constraint violation for slug
        if "unique constraint" in str(e).lower() and "slug" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lesson with a similar title already exists in this course. Please use a different title."
            )
        # Re-raise other exceptions
        raise

@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    lesson_update: LessonUpdate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    existing_lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})
    
    if not existing_lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    if current_user.role != "admin" and str(existing_lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this lesson"
        )
    
    # Build update query
    update_fields = []
    values = {"lesson_id": lesson_id}

    # Get all fields from the update, including those set to None
    update_dict = lesson_update.dict(exclude_unset=True)

    # Map estimated_duration to video_duration for database compatibility
    if 'estimated_duration' in update_dict:
        update_dict['video_duration'] = update_dict.pop('estimated_duration')
    
    # Handle section_id special case
    if 'section_id' in update_dict and update_dict['section_id'] == "none":
        update_dict['section_id'] = None

    for field, value in update_dict.items():
        update_fields.append(f"{field} = :{field}")
        # Convert None to None for SQL NULL
        values[field] = value

    if not update_fields:
        return LessonResponse(**existing_lesson)

    query = f"""
        UPDATE lessons
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :lesson_id
        RETURNING *
    """
    
    updated_lesson = await database.fetch_one(query, values=values)
    
    # Update course duration if duration changed
    if 'estimated_duration' in lesson_update.dict(exclude_unset=True) or 'video_duration' in update_dict:
        await update_course_duration(existing_lesson.course_id)
    
    return LessonResponse(**updated_lesson)

@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    existing_lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})
    
    if not existing_lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    if current_user.role != "admin" and str(existing_lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this lesson"
        )
    
    # Delete lesson (cascade will handle related records)
    query = "DELETE FROM lessons WHERE id = :lesson_id"
    await database.execute(query, values={"lesson_id": lesson_id})
    
    # Update course duration
    await update_course_duration(existing_lesson.course_id)
    
    return {"message": "Lesson deleted successfully"}

@router.post("/upload-video-temp")
async def upload_video_temp(
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    """Upload video file temporarily for lesson creation"""
    try:
        # Upload video file
        video_result = await upload_video(file, "temp")

        return {"video_url": video_result["url"], "message": "Video uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video: {str(e)}"
        )

@router.post("/{lesson_id}/upload-video")
async def upload_lesson_video(
    lesson_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})
    
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    if current_user.role != "admin" and str(lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload video for this lesson"
        )
    
    # Upload video file
    try:
        video_url = await upload_video(file, f"lessons/{lesson_id}")
        
        # Update lesson with video URL
        update_query = """
            UPDATE lessons 
            SET video_url = :video_url, updated_at = NOW()
            WHERE id = :lesson_id
            RETURNING *
        """
        
        updated_lesson = await database.fetch_one(update_query, values={
            "video_url": video_url,
            "lesson_id": lesson_id
        })
        
        return {"video_url": video_url, "message": "Video uploaded successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video: {str(e)}"
        )

@router.post("/upload-audio-temp")
async def upload_audio_temp(
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    """Upload audio file temporarily for lesson creation"""
    try:
        # Upload audio file using generic upload function with audio types
        audio_result = await upload_file(file, "temp/audio")

        return {"audio_url": audio_result["url"], "message": "Audio uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload audio: {str(e)}"
        )

@router.post("/{lesson_id}/upload-audio")
async def upload_lesson_audio(
    lesson_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    if current_user.role != "admin" and str(lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload audio for this lesson"
        )

    # Upload audio file
    try:
        audio_result = await upload_file(file, f"lessons/{lesson_id}/audio")

        # Update lesson with audio URL (using video_url field for now)
        update_query = """
            UPDATE lessons
            SET video_url = :audio_url, updated_at = NOW()
            WHERE id = :lesson_id
            RETURNING *
        """

        updated_lesson = await database.fetch_one(update_query, values={
            "audio_url": audio_result["url"],
            "lesson_id": lesson_id
        })

        return {"audio_url": audio_result["url"], "message": "Audio uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload audio: {str(e)}"
        )

@router.post("/upload-image-temp")
async def upload_image_temp(
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    """Upload image file temporarily for lesson creation"""
    try:
        # Upload image file
        image_result = await upload_image(file, "temp/images")

        return {"image_url": image_result["url"], "message": "Image uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.post("/{lesson_id}/upload-images")
async def upload_lesson_images(
    lesson_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    if current_user.role != "admin" and str(lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload images for this lesson"
        )

    # Upload image files
    try:
        uploaded_urls = []
        for file in files:
            image_result = await upload_image(file, f"lessons/{lesson_id}/images")
            uploaded_urls.append(image_result["url"])

        # For now, store the first image URL in video_url field
        # TODO: Update database schema to support multiple image URLs
        if uploaded_urls:
            update_query = """
                UPDATE lessons
                SET video_url = :image_url, updated_at = NOW()
                WHERE id = :lesson_id
                RETURNING *
            """

            await database.fetch_one(update_query, values={
                "image_url": uploaded_urls[0],  # Store first image URL
                "lesson_id": lesson_id
            })

        return {"image_urls": uploaded_urls, "message": f"{len(uploaded_urls)} images uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload images: {str(e)}"
        )

@router.post("/{lesson_id}/quizzes", response_model=QuizResponse)
async def create_lesson_quiz(
    lesson_id: uuid.UUID,
    quiz: QuizCreate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})
    
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    if current_user.role != "admin" and str(lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create quiz for this lesson"
        )
    
    quiz_id = uuid.uuid4()
    
    query = """
        INSERT INTO quizzes (
            id, lesson_id, course_id, title, description, instructions,
            time_limit, max_attempts, passing_score, is_published
        )
        VALUES (
            :id, :lesson_id, :course_id, :title, :description, :instructions,
            :time_limit, :max_attempts, :passing_score, :is_published
        )
        RETURNING *
    """
    
    values = {
        "id": quiz_id,
        "lesson_id": lesson_id,
        "course_id": lesson.course_id,
        **quiz.dict()
    }
    
    new_quiz = await database.fetch_one(query, values=values)
    return QuizResponse(**new_quiz)

@router.post("/{lesson_id}/assignments", response_model=AssignmentResponse)
async def create_lesson_assignment(
    lesson_id: uuid.UUID,
    assignment: AssignmentCreate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if lesson exists and user has permission
    check_query = """
        SELECT l.*, c.instructor_id
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(check_query, values={"lesson_id": lesson_id})

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    if current_user.role != "admin" and str(lesson.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments for this lesson"
        )

    assignment_id = uuid.uuid4()

    query = """
        INSERT INTO assignments (
            id, lesson_id, course_id, title, description, instructions,
            due_date, max_points, allow_late_submission, is_published
        )
        VALUES (
            :id, :lesson_id, :course_id, :title, :description, :instructions,
            :due_date, :max_points, :allow_late_submission, :is_published
        )
        RETURNING *
    """

    values = {
        "id": assignment_id,
        "lesson_id": lesson_id,
        "course_id": lesson.course_id,
        **assignment.dict()
    }

    try:
        new_assignment = await database.fetch_one(query, values=values)
        return AssignmentResponse(**new_assignment)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assignment: {str(e)}"
        )

@router.get("/{lesson_id}/assignments", response_model=List[AssignmentResponse])
async def get_lesson_assignments(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check access to lesson
    access_query = """
        SELECT l.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE l.id = :lesson_id
    """

    access_check = await database.fetch_one(access_query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })

    if not access_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    has_access = (
        access_check.is_enrolled or
        str(access_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to lesson assignments"
        )

    # Get assignments
    query = """
        SELECT a.*,
               CASE WHEN sub.id IS NOT NULL THEN sub.status ELSE 'not_submitted' END as submission_status,
               CASE WHEN sub.id IS NOT NULL THEN sub.grade ELSE null END as user_grade,
               sub.submitted_at as submission_date
        FROM assignments a
        LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id
            AND sub.user_id = :user_id
        WHERE a.lesson_id = :lesson_id AND a.is_published = true
        ORDER BY a.due_date, a.created_at
    """

    assignments = await database.fetch_all(query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })

    return [AssignmentResponse(**assignment) for assignment in assignments]

@router.get("/{lesson_id}/quizzes", response_model=List[QuizResponse])
async def get_lesson_quizzes(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check access to lesson
    access_query = """
        SELECT l.id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE l.id = :lesson_id
    """
    
    access_check = await database.fetch_one(access_query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })
    
    if not access_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    has_access = (
        access_check.is_enrolled or 
        str(access_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to lesson quizzes"
        )
    
    # Get quizzes
    query = """
        SELECT q.*,
               CASE WHEN qa.id IS NOT NULL THEN qa.score ELSE null END as best_score,
               CASE WHEN qa.id IS NOT NULL THEN qa.passed ELSE false END as passed
        FROM quizzes q
        LEFT JOIN (
            SELECT quiz_id, MAX(score) as score, 
                   bool_or(passed) as passed
            FROM quiz_attempts 
            WHERE user_id = :user_id
            GROUP BY quiz_id
        ) qa ON q.id = qa.quiz_id
        WHERE q.lesson_id = :lesson_id AND q.is_published = true
        ORDER BY q.created_at
    """
    
    quizzes = await database.fetch_all(query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })
    
    return [QuizResponse(**quiz) for quiz in quizzes]

@router.post("/{lesson_id}/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse)
async def create_quiz_question(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    question: QuizQuestionCreate,
    current_user = Depends(require_instructor_or_admin)
):
    # Check if quiz exists and user has permission
    check_query = """
        SELECT q.*, l.course_id, c.instructor_id
        FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        WHERE q.id = :quiz_id AND l.id = :lesson_id
    """
    quiz = await database.fetch_one(check_query, values={
        "quiz_id": quiz_id,
        "lesson_id": lesson_id
    })
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    if current_user.role != "admin" and str(quiz.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add questions to this quiz"
        )
    
    # Get next sort order
    sort_query = """
        SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
        FROM quiz_questions WHERE quiz_id = :quiz_id
    """
    sort_result = await database.fetch_one(sort_query, values={"quiz_id": quiz_id})
    
    question_id = uuid.uuid4()
    
    query = """
        INSERT INTO quiz_questions (
            id, quiz_id, question, type, options, correct_answer,
            explanation, points, sort_order
        )
        VALUES (
            :id, :quiz_id, :question, :type, :options, :correct_answer,
            :explanation, :points, :sort_order
        )
        RETURNING *
    """
    
    values = {
        "id": question_id,
        "quiz_id": quiz_id,
        "sort_order": sort_result.next_order,
        **question.dict()
    }
    
    new_question = await database.fetch_one(query, values=values)
    return QuizQuestionResponse(**new_question)

@router.get("/{lesson_id}/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
async def get_quiz_questions(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check access to quiz
    access_query = """
        SELECT q.*, l.course_id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled
        FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
            AND ce.user_id = :user_id AND ce.status = 'active'
        WHERE q.id = :quiz_id AND l.id = :lesson_id
    """
    
    access_check = await database.fetch_one(access_query, values={
        "quiz_id": quiz_id,
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })
    
    if not access_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    has_access = (
        access_check.is_enrolled or 
        str(access_check.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to quiz questions"
        )
    
    # Get questions
    query = """
        SELECT * FROM quiz_questions 
        WHERE quiz_id = :quiz_id 
        ORDER BY sort_order, created_at
    """
    
    questions = await database.fetch_all(query, values={"quiz_id": quiz_id})
    return [QuizQuestionResponse(**question) for question in questions]

@router.post("/quizzes/{quiz_id}/attempts", response_model=QuizAttemptResponse)
async def create_quiz_attempt(
    quiz_id: uuid.UUID,
    attempt_data: QuizAttemptCreate,
    current_user = Depends(get_current_active_user)
):
    # Check if user has access to quiz and can take it
    access_query = """
        SELECT q.*, l.course_id, c.instructor_id,
               CASE WHEN ce.id IS NOT NULL THEN true ELSE false END as is_enrolled,
               COUNT(qa.id) as attempt_count
        FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id 
            AND ce.user_id = :user_id AND ce.status = 'active'
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = :user_id
        WHERE q.id = :quiz_id
        GROUP BY q.id, l.course_id, c.instructor_id, ce.id
    """
    
    access_check = await database.fetch_one(access_query, values={
        "quiz_id": quiz_id,
        "user_id": current_user.id
    })
    
    if not access_check or not access_check.is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this quiz"
        )
    
    # Check attempt limit
    if access_check.attempt_count >= access_check.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts exceeded"
        )
    
    # Create quiz attempt
    attempt_id = uuid.uuid4()
    
    attempt_query = """
        INSERT INTO quiz_attempts (
            id, user_id, quiz_id, course_id, attempt_number, started_at
        )
        VALUES (
            :id, :user_id, :quiz_id, :course_id, :attempt_number, NOW()
        )
        RETURNING *
    """
    
    attempt_values = {
        "id": attempt_id,
        "user_id": current_user.id,
        "quiz_id": quiz_id,
        "course_id": access_check.course_id,
        "attempt_number": access_check.attempt_count + 1
    }
    
    new_attempt = await database.fetch_one(attempt_query, values=attempt_values)
    return QuizAttemptResponse(**new_attempt)

@router.put("/quizzes/attempts/{attempt_id}/submit", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    attempt_id: uuid.UUID,
    attempt_update: QuizAttemptCreate,
    current_user = Depends(get_current_active_user)
):
    # Get attempt and verify ownership
    attempt_query = """
        SELECT qa.*, q.passing_score, q.show_correct_answers
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.id = :attempt_id AND qa.user_id = :user_id
    """
    
    attempt = await database.fetch_one(attempt_query, values={
        "attempt_id": attempt_id,
        "user_id": current_user.id
    })
    
    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz attempt not found"
        )
    
    if attempt.completed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz attempt already submitted"
        )
    
    # Calculate score
    total_questions = 0
    correct_answers = 0
    total_points = 0
    earned_points = 0
    
    # Get all quiz questions
    questions_query = """
        SELECT id, correct_answer, points FROM quiz_questions 
        WHERE quiz_id = :quiz_id ORDER BY sort_order
    """
    questions = await database.fetch_all(questions_query, values={"quiz_id": attempt.quiz_id})
    
    # Grade the answers
    for question in questions:
        total_questions += 1
        total_points += question.points
        
        # Find user's answer for this question
        user_answer = next((a for a in attempt_update.answers if a.question_id == question.id), None)
        
        if user_answer and user_answer.answer == question.correct_answer:
            correct_answers += 1
            earned_points += question.points
    
    # Calculate percentage score
    score = int((earned_points / total_points * 100)) if total_points > 0 else 0
    passed = score >= attempt.passing_score
    
    # Update attempt with results
    update_query = """
        UPDATE quiz_attempts 
        SET completed_at = NOW(), 
            score = :score, 
            passed = :passed,
            time_taken = EXTRACT(EPOCH FROM (NOW() - started_at))::int
        WHERE id = :attempt_id
        RETURNING *
    """
    
    updated_attempt = await database.fetch_one(update_query, values={
        "attempt_id": attempt_id,
        "score": score,
        "passed": passed
    })
    
    # Store individual answers
    for answer in attempt_update.answers:
        question = next((q for q in questions if q.id == answer.question_id), None)
        if question:
            is_correct = answer.answer == question.correct_answer
            points_earned = question.points if is_correct else 0
            
            answer_query = """
                INSERT INTO quiz_attempt_answers (
                    id, attempt_id, question_id, answer, is_correct, points_earned
                )
                VALUES (:id, :attempt_id, :question_id, :answer, :is_correct, :points_earned)
            """
            
            await database.execute(answer_query, values={
                "id": uuid.uuid4(),
                "attempt_id": attempt_id,
                "question_id": answer.question_id,
                "answer": answer.answer,
                "is_correct": is_correct,
                "points_earned": points_earned
            })
    
    result = QuizAttemptResponse(**updated_attempt)
    result.total_questions = total_questions
    result.correct_answers = correct_answers
    
    return result

async def update_course_duration(course_id: uuid.UUID):
    """Update course total duration based on lesson durations"""

    duration_query = """
        SELECT COALESCE(SUM(video_duration), 0) as total_duration
        FROM lessons
        WHERE course_id = :course_id AND is_published = true
    """

    result = await database.fetch_one(duration_query, values={"course_id": course_id})

    update_query = """
        UPDATE courses
        SET duration_hours = :duration_hours, updated_at = NOW()
        WHERE id = :course_id
    """

    await database.execute(update_query, values={
        "duration_hours": result.total_duration / 3600.0,  # Convert seconds to hours
        "course_id": course_id
    })
