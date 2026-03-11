from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from typing import List, Optional
import uuid
import os
from datetime import datetime

from sqlmodel import select, func, or_, and_, desc, asc
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from database.session import get_session
from dependencies import get_current_site, SiteData
from models.site import Site
from models.lesson import Lesson, Quiz, QuizQuestion, Assignment
from models.course import Course, Section
from models.user import User
from models.enrollment import Enrollment, LessonProgress
from models.enums import LessonType, UserRole, CompletionStatus
from routers.progress import recalculate_course_progress_all_users, update_course_progress, award_tokens_background
from utils.site_settings import are_token_rewards_enabled, get_quiz_token_reward
from schemas.lesson import (
    LessonCreate, LessonUpdate, LessonResponse,
    QuizCreate, QuizUpdate, QuizResponse,
    QuizQuestionCreate, QuizQuestionUpdate, QuizQuestionResponse,
    QuizAttemptCreate, QuizAttemptResponse,
    AssignmentCreate, AssignmentResponse
)
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_instructor_or_admin
from utils.file_upload import upload_video, upload_image, upload_file, FILE_UPLOAD_PROVIDER

router = APIRouter()


async def check_and_trigger_video_transcoding(
    lesson_id: uuid.UUID,
    video_url: Optional[str],
    session: AsyncSession
):
    """
    Check if a lesson's video needs transcoding and trigger it if needed.
    
    This is called after lesson creation or update to automatically
    generate HLS files for video lessons.
    """
    if not video_url:
        return
    
    # Get the lesson to check current HLS status
    query = select(Lesson).where(Lesson.id == lesson_id)
    result = await session.exec(query)
    lesson = result.first()
    
    if not lesson:
        return
    
    # Check if HLS already exists
    resources = lesson.resources or {}
    if resources.get('hls_url'):
        print(f"[Lesson Transcode] Lesson {lesson_id} already has HLS, skipping")
        return
    
    # Check if video is a valid video file (not YouTube, not audio, etc.)
    video_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    is_video_file = any(video_url.lower().endswith(ext) for ext in video_extensions)
    
    if not is_video_file:
        print(f"[Lesson Transcode] URL is not a video file: {video_url}")
        return
    
    # Extract the video path from URL
    # URL format: http://localhost:8000/uploads/temp/20260214/uuid.mp4
    # We need: temp/20260214/uuid.mp4
    try:
        from tasks.video_tasks import trigger_video_transcoding
        
        # Parse the video path from URL
        if '/uploads/' in video_url:
            video_path = video_url.split('/uploads/')[-1]
        else:
            # Already a relative path
            video_path = video_url.lstrip('/')
        
        # Extract video_id from filename (without extension)
        filename = os.path.basename(video_path)
        video_id = os.path.splitext(filename)[0]
        
        print(f"[Lesson Transcode] Triggering transcoding for lesson {lesson_id}")
        print(f"[Lesson Transcode] Video path: {video_path}")
        print(f"[Lesson Transcode] Video ID: {video_id}")
        
        # Trigger transcoding task
        task_id = trigger_video_transcoding(
            video_path=video_path,
            video_id=video_id,
            lesson_id=str(lesson_id),
            provider=FILE_UPLOAD_PROVIDER
        )
        
        # Update lesson resources with task ID and status
        resources['transcoding_task_id'] = task_id
        resources['video_status'] = 'processing'
        lesson.resources = resources
        session.add(lesson)
        await session.commit()
        
        print(f"[Lesson Transcode] Triggered task: {task_id}")
        
    except Exception as e:
        print(f"[Lesson Transcode] Error triggering transcoding: {e}")
        # Don't fail the request, just log the error

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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Get all lessons for admin management with filtering and pagination"""
    offset = (page - 1) * size

    # Base query for counting and selection
    # For now, we'll do a slightly simpler join and handle analytics separately if too complex for one select
    # but let's try to get core info
    
    query = select(
        Lesson, 
        Course.title.label("course_title"),
        Section.title.label("section_title"),
        User.first_name.label("author_first_name"),
        User.last_name.label("author_last_name"),
        User.id.label("author_id")
    ).join(
        Course, Lesson.course_id == Course.id
    ).join(
        User, Course.instructor_id == User.id
    ).outerjoin(
        Section, Lesson.section_id == Section.id
    ).where(Lesson.site_id == current_site.id)

    # Filtering
    if course_id:
        query = query.where(Lesson.course_id == course_id)
    if type:
        query = query.where(Lesson.type == type)
    if status == "published":
        query = query.where(Lesson.is_published == True)
    elif status == "draft":
        query = query.where(Lesson.is_published == False)
    
    if search:
        search_filter = or_(
            Lesson.title.ilike(f"%{search}%"),
            Lesson.description.ilike(f"%{search}%"),
            Course.title.ilike(f"%{search}%"),
            (User.first_name + " " + User.last_name).ilike(f"%{search}%")
        )
        query = query.where(search_filter)

    # Sorting
    if sort_order == "desc":
        query = query.order_by(desc(getattr(Lesson, sort_by)))
    else:
        query = query.order_by(asc(getattr(Lesson, sort_by)))

    # Execute count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.exec(count_query)
    total = total_result.one()

    # Pagination
    query = query.offset(offset).limit(size)
    results = await session.exec(query)
    
    transformed_lessons = []
    for lesson, course_title, section_title, author_first_name, author_last_name, author_id in results.all():
        # Convert duration to MM:SS
        duration_str = "00:00"
        lesson_duration = lesson.estimated_duration or lesson.video_duration or 0
        if lesson_duration:
            minutes = int(lesson_duration // 60)
            seconds = int(lesson_duration % 60)
            duration_str = f"{minutes:02d}:{seconds:02d}"

        transformed_lesson = {
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "course": course_title,
            "course_id": str(lesson.course_id),
            "section_id": str(lesson.section_id) if lesson.section_id else None,
            "section_title": section_title,
            "type": lesson.type,
            "status": "published" if lesson.is_published else "draft",
            "duration": duration_str,
            "views": 0,  # Handle analytics separately if needed
            "completionRate": 0,
            "thumbnail": None,
            "author": f"{author_first_name} {author_last_name}",
            "author_id": str(author_id),
            "createdDate": lesson.created_at.isoformat(),
            "is_preview": lesson.is_preview,
            "has_quiz": lesson.has_quiz,
            "has_assignment": lesson.has_assignment,
            "passing_score": lesson.passing_score,
            "thumbnail_url": lesson.thumbnail_url,
            "content": lesson.content,
            "sort_order": lesson.sort_order,
            "video_url": lesson.video_url,
            "video_duration": lesson.video_duration,
            "estimated_duration": lesson.estimated_duration,
            "attachments": lesson.attachments,
            "resources": lesson.resources,
            "slug": lesson.slug
        }
        transformed_lessons.append(transformed_lesson)

    total_pages = (total + size - 1) // size

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
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # First get the course and check enrollment
    query = select(Course, Enrollment.id.label("enrollment_id")).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status.in_(["active", "completed"]))
    ).where(Course.slug == course_slug, Course.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course, enrollment_id = row

    # Check if user has access
    has_access = (
        enrollment_id is not None or
        str(course.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course lessons"
        )

    # Get lessons with progress and quiz data
    lessons_query = select(Lesson, LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(
        Lesson.course_id == course.id,
        Lesson.is_published == True
    ).options(
        selectinload(Lesson.quiz).selectinload(Quiz.questions)
    ).order_by(Lesson.sort_order, Lesson.created_at)

    lessons_result = await session.exec(lessons_query)
    
    response_lessons = []
    for lesson, status_val, progress_percentage in lessons_result.all():
        l_dict = lesson.model_dump()
        l_dict["progress_status"] = status_val or "not_started"
        l_dict["progress_percentage"] = progress_percentage or 0
        
        # Explicitly include quiz if it exists
        if hasattr(lesson, "quiz") and lesson.quiz:
            l_dict["quiz"] = lesson.quiz.model_dump()
            if lesson.quiz.questions:
                l_dict["quiz"]["questions"] = [q.model_dump() for q in lesson.quiz.questions]
            else:
                l_dict["quiz"]["questions"] = []
            
        response_lessons.append(l_dict)

    return response_lessons

@router.get("/course/{course_id}", response_model=List[LessonResponse])
async def get_course_lessons(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if user has access to course
    query = select(Course, Enrollment.id.label("enrollment_id")).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status.in_(["active", "completed"]))
    ).where(Course.id == course_id, Course.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course, enrollment_id = row

    # Check if user has access
    has_access = (
        enrollment_id is not None or
        str(course.instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to course lessons"
        )

    # Get lessons with progress and quiz data
    lessons_query = select(Lesson, LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(
        Lesson.course_id == course_id,
        Lesson.is_published == True
    ).options(
        selectinload(Lesson.quiz).selectinload(Quiz.questions)
    ).order_by(Lesson.sort_order, Lesson.created_at)

    lessons_result = await session.exec(lessons_query)
    
    response_lessons = []
    for lesson, status_val, progress_percentage in lessons_result.all():
        l_dict = lesson.model_dump()
        l_dict["progress_status"] = status_val or "not_started"
        l_dict["progress_percentage"] = progress_percentage or 0
        
        # Explicitly include quiz if it exists
        if hasattr(lesson, "quiz") and lesson.quiz:
            l_dict["quiz"] = lesson.quiz.model_dump()
            if lesson.quiz.questions:
                l_dict["quiz"]["questions"] = [q.model_dump() for q in lesson.quiz.questions]
            else:
                l_dict["quiz"]["questions"] = []
            
        response_lessons.append(l_dict)

    return response_lessons

@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Base query for lesson with course and section info
    query = select(Lesson, Course.instructor_id, Enrollment.id.label("enrollment_id"), LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        Course, Lesson.course_id == Course.id
    ).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status.in_(["active", "completed"]))
    ).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id).options(
        selectinload(Lesson.quiz).selectinload(Quiz.questions)
    )
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    lesson, instructor_id, enrollment_id, status_val, progress_percentage = row
    
    # Check access
    has_access = (
        enrollment_id is not None or 
        str(instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this lesson"
        )
    
    l_resp = LessonResponse.model_validate(lesson)
    l_resp.progress_status = status_val or "not_started"
    l_resp.progress_percentage = progress_percentage or 0
        
    return l_resp

@router.post("/", response_model=LessonResponse)
async def create_lesson(
    lesson_in: LessonCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if user owns the course or is admin
    query = select(Course).where(Course.id == lesson_in.course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if current_user.role != UserRole.admin and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create lessons for this course"
        )
    
    # Validate section_id if provided
    if lesson_in.section_id:
        section_query = select(Section).where(
            Section.id == lesson_in.section_id,
            Section.course_id == lesson_in.course_id
        )
        section_result = await session.exec(section_query)
        section = section_result.first()
        
        if not section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid section ID. Section must belong to this course."
            )
    
    # Get next sort order
    sort_query = select(func.max(Lesson.sort_order)).where(Lesson.course_id == lesson_in.course_id)
    sort_result = await session.exec(sort_query)
    max_order = sort_result.one() or 0
    
    new_lesson = Lesson(
        **lesson_in.dict(exclude={"sort_order"}),
        sort_order=max_order + 1,
        site_id=current_site.id
    )
    
    try:
        session.add(new_lesson)
        await session.commit()

        # Update course duration
        await update_course_duration(lesson_in.course_id, session)

        # Recalculate progress for all enrolled users if lesson is published
        if new_lesson.is_published:
            await recalculate_course_progress_all_users(lesson_in.course_id, session, current_site.id)

        # Fetch with selectinload to avoid lazy loading crash during serialization
        query = select(Lesson).where(Lesson.id == new_lesson.id).options(selectinload(Lesson.quiz))
        result = await session.exec(query)
        new_lesson = result.one()

        # Auto-transcode video if lesson has video_url
        await check_and_trigger_video_transcoding(new_lesson.id, new_lesson.video_url, session)

        return new_lesson
    except Exception as e:
        if "unique constraint" in str(e).lower() and "slug" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lesson with a similar title already exists in this course."
            )
        raise

@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    lesson_update: LessonUpdate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    lesson, instructor_id = row
    
    if current_user.role != UserRole.admin and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this lesson"
        )
    
    # Validate section_id if provided in update
    if lesson_update.section_id:
        section_query = select(Section).where(
            Section.id == lesson_update.section_id,
            Section.course_id == lesson.course_id
        )
        section_result = await session.exec(section_query)
        section = section_result.first()
        
        if not section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid section ID. Section must belong to the same course."
            )
    
    update_data = lesson_update.dict(exclude_unset=True)

    # Track if is_published changed to trigger recalculation
    publish_changed = 'is_published' in update_data and update_data['is_published'] != lesson.is_published

    for key, value in update_data.items():
        setattr(lesson, key, value)
        
    lesson.updated_at = datetime.utcnow()
    session.add(lesson)
    await session.commit()
    
    # Update course duration
    await update_course_duration(lesson.course_id, session)

    # Recalculate progress for all enrolled users if publish status changed
    if publish_changed:
        await recalculate_course_progress_all_users(lesson.course_id, session, current_site.id)
    
    # Fetch with selectinload to avoid lazy loading crash during serialization
    query = select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.quiz))
    result = await session.exec(query)
    lesson = result.one()

    # Auto-transcode video if video_url was updated or changed
    if 'video_url' in update_data:
        await check_and_trigger_video_transcoding(lesson.id, lesson.video_url, session)
    
    return lesson

@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    lesson, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this lesson"
        )
    
    course_id = lesson.course_id
    site_id = lesson.site_id
    await session.delete(lesson)
    await session.commit()
    
    # Update course duration
    await update_course_duration(course_id, session)

    # Recalculate progress for all enrolled users
    await recalculate_course_progress_all_users(course_id, session, site_id)
    
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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    lesson, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload video for this lesson"
        )
    
    # Upload video file
    try:
        video_result = await upload_video(file, f"lessons/{lesson_id}")
        
        # Extract just the URL string from the upload result
        video_url_str = video_result.get("url") or video_result.get("filename")
        
        # Store metadata in resources JSON field
        resources = lesson.resources or {}
        resources["video_metadata"] = {
            "filename": video_result.get("filename"),
            "original_filename": video_result.get("original_filename"),
            "size": video_result.get("size"),
            "duration": video_result.get("duration"),
            "width": video_result.get("width"),
            "height": video_result.get("height"),
            "codec": video_result.get("codec"),
            "bitrate": video_result.get("bitrate"),
            "transcoding_task_id": video_result.get("transcoding_task_id"),
            "video_status": video_result.get("video_status")
        }
        
        # Update lesson with video URL string and metadata
        lesson.video_url = video_url_str
        lesson.resources = resources
        lesson.updated_at = datetime.utcnow()
        session.add(lesson)
        await session.commit()
        
        # Trigger transcoding for the uploaded video
        await check_and_trigger_video_transcoding(lesson_id, video_url_str, session)
        
        return {"video_url": video_url_str, "message": "Video uploaded successfully", "metadata": resources["video_metadata"]}
        
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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    lesson, instructor_id = row

    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload audio for this lesson"
        )

    # Upload audio file
    try:
        audio_result = await upload_file(file, f"lessons/{lesson_id}/audio")

        # Extract just the URL string from the upload result
        audio_url_str = audio_result.get("url") or audio_result.get("filename")

        # Store metadata in resources JSON field
        resources = lesson.resources or {}
        resources["audio_metadata"] = {
            "filename": audio_result.get("filename"),
            "original_filename": audio_result.get("original_filename"),
            "size": audio_result.get("size"),
            "content_type": audio_result.get("content_type"),
            "uploaded_at": audio_result.get("uploaded_at")
        }

        # Update lesson with audio URL string and metadata
        lesson.video_url = audio_url_str
        lesson.resources = resources
        lesson.updated_at = datetime.utcnow()
        session.add(lesson)
        await session.commit()

        return {"audio_url": audio_url_str, "message": "Audio uploaded successfully", "metadata": resources["audio_metadata"]}

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

@router.post("/upload-attachment-temp")
async def upload_attachment_temp(
    file: UploadFile = File(...),
    current_user = Depends(require_instructor_or_admin)
):
    """Upload any file temporarily for lesson creation"""
    try:
        # Upload generic file
        result = await upload_file(file, "temp/attachments")
        return {"url": result["url"], "name": result.get("filename", file.filename)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload attachment: {str(e)}"
        )

@router.post("/{lesson_id}/upload-images")
async def upload_lesson_images(
    lesson_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    lesson, instructor_id = row

    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
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
        if uploaded_urls:
            lesson.video_url = uploaded_urls[0]
            lesson.updated_at = datetime.utcnow()
            session.add(lesson)
            await session.commit()

        return {"image_urls": uploaded_urls, "message": f"{len(uploaded_urls)} images uploaded successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload images: {str(e)}"
        )

@router.post("/{lesson_id}/quizzes", response_model=QuizResponse)
async def create_lesson_quiz(
    lesson_id: uuid.UUID,
    quiz_data: QuizCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )
    
    lesson, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create quiz for this lesson"
        )
    
    # Remove fields that are passed explicitly to avoid "multiple values" error
    quiz_dict = quiz_data.dict()
    quiz_dict.pop("lesson_id", None)
    quiz_dict.pop("course_id", None)
    quiz_dict.pop("site_id", None)
    quiz_dict.pop("questions", None)  # Handle separately or ignore if not using nested create
    
    new_quiz = Quiz(
        **quiz_dict,
        lesson_id=lesson_id,
        course_id=lesson.course_id,
        site_id=lesson.site_id
    )
    
    session.add(new_quiz)
    await session.commit()
    
    # Fetch with selectinload to avoid lazy loading crash during serialization
    query = select(Quiz).where(Quiz.id == new_quiz.id).options(selectinload(Quiz.questions))
    result = await session.exec(query)
    new_quiz = result.one()
    
    return new_quiz

@router.post("/{lesson_id}/assignments", response_model=AssignmentResponse)
async def create_lesson_assignment(
    lesson_id: uuid.UUID,
    assignment_data: AssignmentCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    # Check if lesson exists and user has permission
    query = select(Lesson, Course.instructor_id).join(
        Course, Lesson.course_id == Course.id
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    lesson, instructor_id = row

    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments for this lesson"
        )

    new_assignment = Assignment(
        **assignment_data.dict(),
        lesson_id=lesson_id,
        course_id=lesson.course_id,
        site_id=lesson.site_id
    )

    try:
        session.add(new_assignment)
        await session.commit()
        await session.refresh(new_assignment)
        return new_assignment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assignment: {str(e)}"
        )

@router.get("/{lesson_id}/assignments", response_model=List[AssignmentResponse])
async def get_lesson_assignments(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    from models.lesson import Assignment, AssignmentSubmission

    # Check access to lesson
    query = select(Lesson, Course.instructor_id, Enrollment.id.label("enrollment_id")).join(
        Course, Lesson.course_id == Course.id
    ).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    lesson, instructor_id, enrollment_id = row

    has_access = (
        enrollment_id is not None or
        str(instructor_id) == str(current_user.id) or
        current_user.role == "admin"
    )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to lesson assignments"
        )

    # Get assignments with user's latest submission
    assignments_query = select(Assignment, AssignmentSubmission.status.label("submission_status"), AssignmentSubmission.grade.label("user_grade"), AssignmentSubmission.submitted_at.label("submission_date")).outerjoin(
        AssignmentSubmission, and_(Assignment.id == AssignmentSubmission.assignment_id, AssignmentSubmission.user_id == current_user.id)
    ).where(
        Assignment.lesson_id == lesson_id,
        Assignment.is_published == True
    ).order_by(Assignment.due_date, Assignment.created_at)

    assignments_result = await session.exec(assignments_query)
    
    response_assignments = []
    for assignment, status_val, grade, s_date in assignments_result.all():
        a_dict = assignment.model_dump()
        a_dict["submission_status"] = status_val or "not_submitted"
        a_dict["user_grade"] = grade
        a_dict["submission_date"] = s_date
        response_assignments.append(a_dict)

    return response_assignments

@router.get("/{lesson_id}/quizzes", response_model=List[QuizResponse])
async def get_lesson_quizzes(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizAttempt

    # Check access
    query = select(Lesson, Course.instructor_id, Enrollment.id.label("enrollment_id")).join(
        Course, Lesson.course_id == Course.id
    ).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    
    lesson, instructor_id, enrollment_id = row
    
    has_access = enrollment_id is not None or str(instructor_id) == str(current_user.id) or current_user.role == "admin"
    if not has_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to lesson quizzes")
    
    # Get quizzes with score
    quizzes_query = select(Quiz, func.max(QuizAttempt.score).label("best_score"), func.bool_or(QuizAttempt.passed).label("passed")).outerjoin(
        QuizAttempt, and_(Quiz.id == QuizAttempt.quiz_id, QuizAttempt.user_id == current_user.id)
    ).where(
        Quiz.lesson_id == lesson_id
    )

    # If NOT admin or instructor of this course, only show published quizzes
    is_admin = current_user.role == "admin"
    is_instructor = str(instructor_id) == str(current_user.id)
    
    if not (is_admin or is_instructor):
        quizzes_query = quizzes_query.where(Quiz.is_published == True)

    quizzes_query = quizzes_query.group_by(Quiz.id).order_by(Quiz.created_at).options(
        selectinload(Quiz.questions)
    )

    quizzes_result = await session.exec(quizzes_query)
    
    response_quizzes = []
    for quiz, best_score, passed in quizzes_result.all():
        q_resp = QuizResponse.model_validate(quiz)
        q_resp.best_score = best_score
        q_resp.passed = passed or False
        response_quizzes.append(q_resp)

    return response_quizzes

@router.post("/{lesson_id}/quizzes/{quiz_id}/questions", response_model=QuizQuestionResponse)
async def create_quiz_question(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    question_data: QuizQuestionCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session)
):
    from models.lesson import QuizQuestion
    
    # Check if quiz exists and user has permission
    query = select(Quiz, Course.instructor_id).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).where(Quiz.id == quiz_id, Lesson.id == lesson_id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    
    quiz, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Sort order
    sort_query = select(func.max(QuizQuestion.sort_order)).where(QuizQuestion.quiz_id == quiz_id)
    sort_result = await session.exec(sort_query)
    max_order = sort_result.one() or 0
    
    # Remove fields that are passed explicitly to avoid "multiple values" error
    question_dict = question_data.dict()
    question_dict.pop("quiz_id", None)
    question_dict.pop("sort_order", None)
    question_dict.pop("site_id", None)
    
    new_question = QuizQuestion(
        **question_dict,
        quiz_id=quiz_id,
        sort_order=max_order + 1,
        site_id=quiz.site_id
    )
    
    session.add(new_question)
    await session.commit()
    await session.refresh(new_question)
    return new_question

@router.put("/{lesson_id}/quizzes/{quiz_id}", response_model=QuizResponse)
async def update_lesson_quiz(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    quiz_update: QuizUpdate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Update quiz settings"""
    # Check if quiz exists and user has permission
    query = select(Quiz, Course.instructor_id).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).where(Quiz.id == quiz_id, Lesson.id == lesson_id, Quiz.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    
    quiz, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update quiz data
    update_data = quiz_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(quiz, key, value)
    
    quiz.updated_at = datetime.utcnow()
    session.add(quiz)
    await session.commit()
    
    # Fetch with selectinload to avoid lazy loading crash during serialization
    query = select(Quiz).where(Quiz.id == quiz.id).options(selectinload(Quiz.questions))
    result = await session.exec(query)
    quiz = result.one()
    
    return quiz

@router.delete("/{lesson_id}/quizzes/{quiz_id}")
async def delete_lesson_quiz(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    """Delete a quiz"""
    # Check if quiz exists and user has permission
    query = select(Quiz, Course.instructor_id).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).where(Quiz.id == quiz_id, Lesson.id == lesson_id, Quiz.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    
    quiz, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await session.delete(quiz)
    await session.commit()
    return {"message": "Quiz deleted successfully"}

@router.put("/{lesson_id}/quizzes/{quiz_id}/questions/{question_id}", response_model=QuizQuestionResponse)
async def update_quiz_question(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    question_update: QuizQuestionUpdate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update a quiz question"""
    # Check permission through quiz ownership
    query = select(QuizQuestion, Course.instructor_id).join(
        Quiz, QuizQuestion.quiz_id == Quiz.id
    ).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).where(QuizQuestion.id == question_id, Quiz.id == quiz_id, Lesson.id == lesson_id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    
    question, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    # Update question data
    update_data = question_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(question, key, value)
    
    question.updated_at = datetime.utcnow()
    session.add(question)
    await session.commit()
    await session.refresh(question)
    return question

@router.delete("/{lesson_id}/quizzes/{quiz_id}/questions/{question_id}")
async def delete_quiz_question(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    question_id: uuid.UUID,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete a quiz question"""
    # Check permission through quiz ownership
    query = select(QuizQuestion, Course.instructor_id).join(
        Quiz, QuizQuestion.quiz_id == Quiz.id
    ).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).where(QuizQuestion.id == question_id, Quiz.id == quiz_id, Lesson.id == lesson_id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    
    question, instructor_id = row
    
    if current_user.role != "admin" and str(instructor_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    await session.delete(question)
    await session.commit()
    return {"message": "Question deleted successfully"}

@router.get("/{lesson_id}/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
async def get_quiz_questions(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    from models.lesson import QuizQuestion

    # Check access to quiz
    query = select(Quiz, Course.instructor_id, Enrollment.id.label("enrollment_id")).join(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Course, Lesson.course_id == Course.id
    ).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Quiz.id == quiz_id, Lesson.id == lesson_id, Quiz.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    
    quiz, instructor_id, enrollment_id = row
    
    has_access = enrollment_id is not None or str(instructor_id) == str(current_user.id) or current_user.role == "admin"
    if not has_access:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Get questions
    questions_query = select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.sort_order, QuizQuestion.created_at)
    questions_result = await session.exec(questions_query)
    return questions_result.all()

@router.post("/quizzes/{quiz_id}/attempts", response_model=QuizAttemptResponse)
async def create_quiz_attempt(
    quiz_id: uuid.UUID,
    attempt_data: QuizAttemptCreate,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizAttempt
    
    # Check access and attempt count
    query = select(Quiz, Enrollment.id.label("enrollment_id")).join(
        Course, Quiz.course_id == Course.id
    ).join(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status == "active")
    ).where(Quiz.id == quiz_id, Quiz.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    quiz, enrollment_id = row
    
    # Check attempt limit
    count_query = select(func.count(QuizAttempt.id)).where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id)
    count_result = await session.exec(count_query)
    attempt_count = count_result.one()
    
    if attempt_count >= quiz.max_attempts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attempts exceeded")
    
    # Create attempt
    new_attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz_id,
        course_id=quiz.course_id,
        attempt_number=attempt_count + 1,
        started_at=datetime.utcnow(),
        site_id=quiz.site_id
    )
    
    session.add(new_attempt)
    await session.commit()
    await session.refresh(new_attempt)
    return new_attempt

@router.put("/quizzes/attempts/{attempt_id}/submit", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    attempt_id: uuid.UUID,
    attempt_update: QuizAttemptCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: SiteData = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizAttempt, QuizQuestion, QuizAttemptAnswer
    
    # Get attempt and verify ownership
    query = select(QuizAttempt, Quiz).join(
        Quiz, QuizAttempt.quiz_id == Quiz.id
    ).where(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id, QuizAttempt.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    
    attempt, quiz = row
    passing_score = quiz.passing_score
    
    if attempt.completed_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz attempt already submitted")
    
    # Grade the answers
    questions_query = select(QuizQuestion).where(QuizQuestion.quiz_id == attempt.quiz_id).order_by(QuizQuestion.sort_order)
    questions_result = await session.exec(questions_query)
    questions = questions_result.all()
    
    total_questions = 0
    correct_answers = 0
    total_points = 0
    earned_points = 0
    
    for question in questions:
        total_questions += 1
        total_points += question.points
        
        user_answer = next((a for a in attempt_update.answers if a.question_id == question.id), None)
        is_correct = user_answer and user_answer.answer == question.correct_answer
        
        if is_correct:
            correct_answers += 1
            earned_points += question.points
            
        # Store individual answer
        if user_answer:
            new_answer = QuizAttemptAnswer(
                attempt_id=attempt_id,
                question_id=question.id,
                answer=user_answer.answer,
                is_correct=is_correct,
                points_earned=question.points if is_correct else 0,
                site_id=attempt.site_id
            )
            session.add(new_answer)
    
    score = int((earned_points / total_points * 100)) if total_points > 0 else 0
    passed = score >= passing_score
    
    attempt.completed_at = datetime.utcnow()
    attempt.score = score
    attempt.passed = passed
    attempt.time_taken = int((datetime.utcnow() - attempt.started_at).total_seconds())
    
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)
    
    # Award tokens if passed and rewards are enabled in background
    if passed and are_token_rewards_enabled(current_site):
        amount = get_quiz_token_reward(current_site)
        background_tasks.add_task(
            award_tokens_background,
            current_user.id,
            float(amount),
            f"Passed quiz: {quiz.title} ({score}%)",
            current_site.id,
            "quiz_passed",
            attempt.quiz_id
        )

    # Update lesson progress and course progress if it's a lesson-linked quiz
    if quiz.lesson_id:
        # Check if lesson progress record exists
        lp_query = select(LessonProgress).where(
            LessonProgress.user_id == current_user.id,
            LessonProgress.lesson_id == quiz.lesson_id,
            LessonProgress.site_id == current_site.id
        )
        lp_result = await session.exec(lp_query)
        lesson_progress = lp_result.first()
        
        if passed:
            if lesson_progress:
                if lesson_progress.status != CompletionStatus.completed:
                    lesson_progress.status = CompletionStatus.completed
                    lesson_progress.progress_percentage = 100
                    lesson_progress.completed_at = datetime.utcnow()
                    lesson_progress.updated_at = datetime.utcnow()
                    session.add(lesson_progress)
            else:
                new_lp = LessonProgress(
                    user_id=current_user.id,
                    lesson_id=quiz.lesson_id,
                    course_id=quiz.course_id,
                    status=CompletionStatus.completed,
                    progress_percentage=100,
                    site_id=current_site.id,
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow()
                )
                session.add(new_lp)
            
            await session.flush()
            
            # Trigger course progress update to check for completion
            await update_course_progress(
                user_id=current_user.id,
                course_id=quiz.course_id,
                session=session,
                site_id=current_site.id,
                background_tasks=background_tasks
            )
        elif not lesson_progress:
            # Mark as in_progress if attempted but not passed (and no existing record)
            new_lp = LessonProgress(
                user_id=current_user.id,
                lesson_id=quiz.lesson_id,
                course_id=quiz.course_id,
                status=CompletionStatus.in_progress,
                progress_percentage=0,
                site_id=current_site.id,
                started_at=datetime.utcnow()
            )
            session.add(new_lp)
            await session.flush()
    
    await session.commit()
    result = QuizAttemptResponse.model_validate(attempt)
    result.total_questions = total_questions
    result.correct_answers = correct_answers
    
    return result

async def update_course_duration(course_id: uuid.UUID, session: AsyncSession):
    """Update course total duration based on lesson durations"""
    query = select(func.sum(Lesson.video_duration)).where(Lesson.course_id == course_id, Lesson.is_published == True)
    result = await session.exec(query)
    total_duration = result.one() or 0
    
    course_query = select(Course).where(Course.id == course_id)
    course_result = await session.exec(course_query)
    course = course_result.first()
    
    if course:
        course.duration_hours = total_duration / 3600.0
        course.updated_at = datetime.utcnow()
        session.add(course)
        await session.commit()
