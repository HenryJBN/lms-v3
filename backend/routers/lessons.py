from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from typing import List, Optional
import uuid
import os

from sqlmodel import select, func, or_, and_, desc, asc
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.lesson import Lesson, Quiz, Assignment
from models.course import Course, Section
from models.user import User
from models.enrollment import Enrollment, LessonProgress
from models.enums import LessonType
from schemas.lesson import (
    LessonCreate, LessonUpdate, LessonResponse,
    QuizCreate, QuizUpdate, QuizResponse,
    QuizQuestionCreate, QuizQuestionUpdate, QuizQuestionResponse,
    QuizAttemptCreate, QuizAttemptResponse,
    AssignmentCreate, AssignmentResponse
)
from schemas.common import PaginationParams, PaginatedResponse
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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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
        # Convert video_duration to MM:SS
        duration_str = "00:00"
        if lesson.video_duration:
            minutes = lesson.video_duration // 60
            seconds = lesson.video_duration % 60
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
            "isPreview": lesson.is_preview,
            "hasQuiz": False,
            "sort_order": lesson.sort_order,
            "video_url": lesson.video_url,
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
    current_site: Site = Depends(get_current_site)
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

    # Get lessons with progress
    lessons_query = select(Lesson, LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(
        Lesson.course_id == course.id,
        Lesson.is_published == True
    ).order_by(Lesson.sort_order, Lesson.created_at)

    lessons_result = await session.exec(lessons_query)
    
    response_lessons = []
    for lesson, status_val, progress_percentage in lessons_result.all():
        l_dict = lesson.model_dump()
        l_dict["progress_status"] = status_val or "not_started"
        l_dict["progress_percentage"] = progress_percentage or 0
        response_lessons.append(l_dict)

    return response_lessons

@router.get("/course/{course_id}", response_model=List[LessonResponse])
async def get_course_lessons(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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

    # Get lessons with progress
    lessons_query = select(Lesson, LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(
        Lesson.course_id == course_id,
        Lesson.is_published == True
    ).order_by(Lesson.sort_order, Lesson.created_at)

    lessons_result = await session.exec(lessons_query)
    
    response_lessons = []
    for lesson, status_val, progress_percentage in lessons_result.all():
        l_dict = lesson.model_dump()
        l_dict["progress_status"] = status_val or "not_started"
        l_dict["progress_percentage"] = progress_percentage or 0
        response_lessons.append(l_dict)

    return response_lessons

@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Base query for lesson with course and section info
    query = select(Lesson, Course.instructor_id, Enrollment.id.label("enrollment_id"), LessonProgress.status.label("progress_status"), LessonProgress.progress_percentage).outerjoin(
        Course, Lesson.course_id == Course.id
    ).outerjoin(
        Enrollment, and_(Course.id == Enrollment.course_id, Enrollment.user_id == current_user.id, Enrollment.status.in_(["active", "completed"]))
    ).outerjoin(
        LessonProgress, and_(Lesson.id == LessonProgress.lesson_id, LessonProgress.user_id == current_user.id)
    ).where(Lesson.id == lesson_id, Lesson.site_id == current_site.id)
    
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
    
    l_dict = lesson.model_dump()
    l_dict["progress_status"] = status_val or "not_started"
    l_dict["progress_percentage"] = progress_percentage or 0
    return l_dict

@router.post("/", response_model=LessonResponse)
async def create_lesson(
    lesson_in: LessonCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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
    
    # Get next sort order
    sort_query = select(func.max(Lesson.sort_order)).where(Lesson.course_id == lesson_in.course_id)
    sort_result = await session.exec(sort_query)
    max_order = sort_result.one() or 0
    
    new_lesson = Lesson(
        **lesson_in.dict(),
        sort_order=max_order + 1,
        site_id=current_site.id
    )
    
    try:
        session.add(new_lesson)
        await session.commit()
        await session.refresh(new_lesson)

        # Update course duration
        await update_course_duration(lesson_in.course_id, session)

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
    current_site: Site = Depends(get_current_site)
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
    
    update_data = lesson_update.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(lesson, key, value)
        
    lesson.updated_at = datetime.utcnow()
    session.add(lesson)
    await session.commit()
    await session.refresh(lesson)
    
    # Update course duration
    await update_course_duration(lesson.course_id, session)
    
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
    await session.delete(lesson)
    await session.commit()
    
    # Update course duration
    await update_course_duration(course_id, session)
    
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
    current_site: Site = Depends(get_current_site)
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
        video_url = await upload_video(file, f"lessons/{lesson_id}")
        
        # Update lesson with video URL
        lesson.video_url = video_url
        lesson.updated_at = datetime.utcnow()
        session.add(lesson)
        await session.commit()
        
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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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

        # Update lesson with audio URL
        lesson.video_url = audio_result["url"]
        lesson.updated_at = datetime.utcnow()
        session.add(lesson)
        await session.commit()

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
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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
    current_site: Site = Depends(get_current_site)
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
    
    new_quiz = Quiz(
        **quiz_data.dict(),
        lesson_id=lesson_id,
        course_id=lesson.course_id,
        site_id=lesson.site_id
    )
    
    session.add(new_quiz)
    await session.commit()
    await session.refresh(new_quiz)
    return new_quiz

@router.post("/{lesson_id}/assignments", response_model=AssignmentResponse)
async def create_lesson_assignment(
    lesson_id: uuid.UUID,
    assignment_data: AssignmentCreate,
    current_user = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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
    current_site: Site = Depends(get_current_site)
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
    current_site: Site = Depends(get_current_site)
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
        Quiz.lesson_id == lesson_id,
        Quiz.is_published == True
    ).group_by(Quiz.id).order_by(Quiz.created_at)

    quizzes_result = await session.exec(quizzes_query)
    
    response_quizzes = []
    for quiz, best_score, passed in quizzes_result.all():
        q_dict = quiz.model_dump()
        q_dict["best_score"] = best_score
        q_dict["passed"] = passed or False
        response_quizzes.append(q_dict)

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
    
    new_question = QuizQuestion(
        **question_data.dict(),
        quiz_id=quiz_id,
        sort_order=max_order + 1,
        site_id=quiz.site_id
    )
    
    session.add(new_question)
    await session.commit()
    await session.refresh(new_question)
    return new_question

@router.get("/{lesson_id}/quizzes/{quiz_id}/questions", response_model=List[QuizQuestionResponse])
async def get_quiz_questions(
    lesson_id: uuid.UUID,
    quiz_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
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
    current_site: Site = Depends(get_current_site)
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
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizAttempt, QuizQuestion, QuizAttemptAnswer
    
    # Get attempt and verify ownership
    query = select(QuizAttempt, Quiz.passing_score).join(
        Quiz, QuizAttempt.quiz_id == Quiz.id
    ).where(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id, QuizAttempt.site_id == current_site.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz attempt not found")
    
    attempt, passing_score = row
    
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
