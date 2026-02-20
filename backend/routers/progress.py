from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from sqlmodel import select, and_, func
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.course import Course
from models.enrollment import Enrollment, LessonProgress
from models.lesson import Lesson, QuizAttempt
from models.enums import CompletionStatus, EnrollmentStatus, UserRole
from schemas.enrollment import LessonProgressResponse, LessonProgressUpdate
from schemas.lesson import QuizAttemptCreate, QuizAttemptResponse
from middleware.auth import get_current_active_user
from utils.tokens import award_tokens
from utils.notifications import send_lesson_completion_notification
from utils.site_settings import (
    are_token_rewards_enabled, 
    get_default_token_reward,
    get_lesson_token_reward,
    get_quiz_token_reward
)
from utils.certificate_generator import generate_pdf_certificate
from utils.file_upload import file_upload_service

router = APIRouter()

@router.get("/course/slug/{course_slug}", response_model=List[LessonProgressResponse])
async def get_course_progress_by_slug(
    course_slug: str,
    cohort_id: Optional[uuid.UUID] = None,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # First get the course ID from slug
    query = select(Course).where(Course.slug == course_slug, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()

    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Check if user is enrolled in the course
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course.id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.active
    )
    
    if cohort_id:
        enrollment_query = enrollment_query.where(Enrollment.cohort_id == cohort_id)
        
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course"
        )

    # Get lesson progress joined with lessons
    progress_query = select(LessonProgress, Lesson.title, Lesson.type).join(
        Lesson, LessonProgress.lesson_id == Lesson.id
    ).where(
        LessonProgress.user_id == current_user.id,
        LessonProgress.course_id == course.id,
        LessonProgress.site_id == current_site.id
    ).order_by(Lesson.sort_order)
    
    progress_result = await session.exec(progress_query)
    progress_list = []
    
    for lp, title, ltype in progress_result.all():
        p_dict = lp.model_dump()
        p_dict["lesson_title"] = title
        p_dict["lesson_type"] = ltype
        progress_list.append(p_dict)

    return progress_list

@router.get("/course/{course_id}", response_model=List[LessonProgressResponse])
async def get_course_progress(
    course_id: uuid.UUID,
    cohort_id: Optional[uuid.UUID] = None,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Check if user is enrolled in the course
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == current_user.id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == current_site.id,
        Enrollment.status == EnrollmentStatus.active
    )
    
    if cohort_id:
        enrollment_query = enrollment_query.where(Enrollment.cohort_id == cohort_id)
        
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course"
        )

    # Get lesson progress joined with lessons
    progress_query = select(LessonProgress, Lesson.title, Lesson.type).join(
        Lesson, LessonProgress.lesson_id == Lesson.id
    ).where(
        LessonProgress.user_id == current_user.id,
        LessonProgress.course_id == course_id,
        LessonProgress.site_id == current_site.id
    ).order_by(Lesson.sort_order)
    
    progress_result = await session.exec(progress_query)
    progress_list = []
    
    for lp, title, ltype in progress_result.all():
        p_dict = lp.model_dump()
        p_dict["lesson_title"] = title
        p_dict["lesson_type"] = ltype
        progress_list.append(p_dict)

    return progress_list

@router.put("/lesson/{lesson_id}", response_model=LessonProgressResponse)
async def update_lesson_progress(
    lesson_id: uuid.UUID,
    progress_update: LessonProgressUpdate,
    cohort_id: Optional[uuid.UUID] = Query(None),
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get lesson info and check enrollment (allow both active and completed enrollments
    # so students can progress on newly added lessons after course completion)
    enrollment_query_base = select(Lesson, Enrollment.id.label("enrollment_id")).join(
        Enrollment, Lesson.course_id == Enrollment.course_id
    ).where(
        Lesson.id == lesson_id,
        Lesson.site_id == current_site.id,
        Enrollment.user_id == current_user.id,
        Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed]),
        Enrollment.site_id == current_site.id
    )
    
    if cohort_id:
        enrollment_query_base = enrollment_query_base.where(Enrollment.cohort_id == cohort_id)
        
    lesson_result = await session.exec(enrollment_query_base)
    row = lesson_result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lesson not found or you are not enrolled in this course/cohort"
        )
    
    lesson, enrollment_id = row
    
    # Capture lesson data before it can be expired by session.commit() in other functions
    lesson_title = lesson.title
    lesson_type = lesson.type
    course_id = lesson.course_id
    user_id = current_user.id
    site_id = current_site.id

    # Check assessment completion status
    assessment_status = await check_lesson_assessment_completion(current_user.id, lesson_id, session, site_id=current_site.id)

    # Check if progress record exists
    existing_query = select(LessonProgress).where(
        LessonProgress.user_id == current_user.id,
        LessonProgress.lesson_id == lesson_id,
        LessonProgress.site_id == current_site.id
    )
    existing_result = await session.exec(existing_query)
    existing_progress = existing_result.first()

    # Determine completion status based on video progress AND assessments
    video_progress = progress_update.progress_percentage if progress_update.progress_percentage is not None else 0
    assessment_complete = assessment_status['overall_complete']

    # Use enum values
    status_enum = CompletionStatus.not_started
    final_progress_percentage = video_progress

    if video_progress > 0 or assessment_status['has_started']:
        status_enum = CompletionStatus.in_progress

    # Lesson is complete if video is watched (at least 85%) AND all assessments are complete
    if video_progress >= 85 and assessment_complete:
        status_enum = CompletionStatus.completed
        final_progress_percentage = 100
    elif video_progress >= 85 and not assessment_complete:
        # Video complete but assessments pending
        status_enum = CompletionStatus.in_progress
        final_progress_percentage = min(95, video_progress)  # Cap at 95% until assessments done
    elif assessment_complete and video_progress < 85:
        # Assessments done but video not yet at threshold
        status_enum = CompletionStatus.in_progress
        final_progress_percentage = video_progress

    if existing_progress:
        # Update existing progress
        prev_status = existing_progress.status
        existing_progress.status = status_enum
        existing_progress.progress_percentage = int(final_progress_percentage)
        
        # Optional fields from payload
        for field, value in progress_update.model_dump(exclude_unset=True).items():
            if field and value is not None and field not in ("progress_percentage",):
                setattr(existing_progress, field, value)

        # Set timestamps based on status transitions
        if status_enum == CompletionStatus.completed and prev_status != CompletionStatus.completed:
            existing_progress.completed_at = datetime.utcnow()
            if not existing_progress.started_at:
                existing_progress.started_at = datetime.utcnow()
        elif status_enum == CompletionStatus.in_progress and prev_status == CompletionStatus.not_started:
            existing_progress.started_at = datetime.utcnow()
        
        existing_progress.updated_at = datetime.utcnow()
        session.add(existing_progress)
        updated_progress = existing_progress
    else:
        # Create new progress record
        updated_progress = LessonProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            course_id=lesson.course_id,
            status=status_enum,
            progress_percentage=int(final_progress_percentage),
            time_spent=progress_update.time_spent or 0,
            last_position=progress_update.last_position or 0,
            notes=progress_update.notes,
            site_id=current_site.id,
            started_at=datetime.utcnow() if status_enum != CompletionStatus.not_started else None,
            completed_at=datetime.utcnow() if status_enum == CompletionStatus.completed else None
        )
        session.add(updated_progress)

    await session.commit()
    await session.refresh(updated_progress)
    await session.refresh(current_site)

    # Award tokens if lesson just completed and rewards are enabled
    if status_enum == CompletionStatus.completed and (not existing_progress or prev_status != CompletionStatus.completed):
        if are_token_rewards_enabled(current_site):
            amount = get_lesson_token_reward(current_site)
            await award_tokens(
                user_id=user_id,
                amount=float(amount),
                description=f"Completed lesson: {lesson_title}",
                session=session,
                site_id=site_id,
                reference_type="lesson_completed",
                reference_id=lesson_id
            )

        # Send completion notification
        await send_lesson_completion_notification(
            user_id=user_id,
            lesson_title=lesson_title,
            course_id=course_id,
            session=session,
            site_id=site_id
        )

        # Update course progress - MOVED to always update below the block
        # await update_course_progress(user_id, course_id, session, current_site, cohort_id=cohort_id)

    # Always update overall course progress to reflect granular changes
    course_progress = await update_course_progress(user_id, course_id, session, site_id, cohort_id=cohort_id)

    # Prepare response from updated_progress
    res_dict = updated_progress.model_dump()
    res_dict["lesson_title"] = lesson_title
    res_dict["lesson_type"] = lesson_type
    res_dict["course_progress_percentage"] = course_progress
    return res_dict

@router.post("/quiz/attempt", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    attempt: QuizAttemptCreate,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizQuestion, QuizAttempt
    # Get quiz info and check enrollment
    quiz_query = select(Quiz, Lesson.title.label("lesson_title")).outerjoin(
        Lesson, Quiz.lesson_id == Lesson.id
    ).join(
        Enrollment, Quiz.course_id == Enrollment.course_id
    ).where(
        Quiz.id == attempt.quiz_id,
        Quiz.site_id == current_site.id,
        Enrollment.user_id == current_user.id,
        Enrollment.status == EnrollmentStatus.active,
        Enrollment.site_id == current_site.id
    )
    
    quiz_result = await session.exec(quiz_query)
    row = quiz_result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quiz not found or not enrolled in course"
        )
    
    quiz = row[0]
    
    # Check attempt limit
    attempts_query = select(func.count(QuizAttempt.id)).where(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.quiz_id == attempt.quiz_id
    )
    count_result = await session.exec(attempts_query)
    attempts_count = count_result.one()
    
    if attempts_count >= quiz.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts exceeded"
        )
    
    # Get quiz questions for scoring
    questions_query = select(QuizQuestion).where(
        QuizQuestion.quiz_id == attempt.quiz_id
    ).order_by(QuizQuestion.sort_order)
    
    questions_result = await session.exec(questions_query)
    questions = questions_result.all()
    
    # Calculate score
    total_points = sum(q.points for q in questions)
    earned_points = 0
    
    for question in questions:
        user_answer = attempt.answers.get(str(question.id))
        if user_answer and str(user_answer).lower().strip() == str(question.correct_answer).lower().strip():
            earned_points += question.points
    
    score = int((earned_points / total_points) * 100) if total_points > 0 else 0
    passed = score >= quiz.passing_score
    
    # Create quiz attempt record
    new_attempt = QuizAttempt(
        user_id=current_user.id,
        quiz_id=attempt.quiz_id,
        course_id=quiz.course_id,
        attempt_number=attempts_count + 1,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        score=score,
        passed=passed,
        answers=attempt.answers,
        site_id=current_site.id
    )
    
    session.add(new_attempt)
    await session.commit()
    await session.refresh(new_attempt)
    
    # Award tokens if passed and rewards are enabled
    if passed and are_token_rewards_enabled(current_site):
        amount = get_quiz_token_reward(current_site)
        await award_tokens(
            user_id=current_user.id,
            amount=float(amount),
            description=f"Passed quiz: {quiz.title} ({score}%)",
            session=session,
            site_id=current_site.id,
            reference_type="quiz_passed",
            reference_id=attempt.quiz_id
        )
    
    return new_attempt

@router.get("/quiz/{quiz_id}/attempts", response_model=List[QuizAttemptResponse])
async def get_quiz_attempts(
    quiz_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    from models.lesson import Quiz, QuizAttempt
    # Check if user has access to this quiz
    quiz_query = select(Quiz.id).join(
        Enrollment, Quiz.course_id == Enrollment.course_id
    ).where(
        Quiz.id == quiz_id,
        Quiz.site_id == current_site.id,
        Enrollment.user_id == current_user.id,
        Enrollment.status == EnrollmentStatus.active,
        Enrollment.site_id == current_site.id
    )
    
    quiz_result = await session.exec(quiz_query)
    quiz_id_found = quiz_result.first()
    
    if not quiz_id_found:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quiz not found or not enrolled in course"
        )
    
    # Get user's attempts
    query = select(QuizAttempt).where(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.quiz_id == quiz_id
    ).order_by(QuizAttempt.attempt_number.desc())
    
    attempts_result = await session.exec(query)
    return attempts_result.all()

async def update_course_progress(user_id: uuid.UUID, course_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID, cohort_id: Optional[uuid.UUID] = None):
    """Update overall course progress based on average lesson progress"""
    from models.enrollment import Enrollment, LessonProgress
    from models.lesson import Lesson
    from models.enums import CompletionStatus, EnrollmentStatus
    
    # Get all published lessons for the course
    lessons_query = select(Lesson.id).where(
        Lesson.course_id == course_id,
        Lesson.is_published == True,
        Lesson.site_id == site_id
    )
    lessons_result = await session.exec(lessons_query)
    lesson_ids = lessons_result.all()
    total_lessons = len(lesson_ids)
    
    if total_lessons == 0:
        return 0

    # Get course info for rewards and certificate settings
    from models.course import Course
    course_query = select(Course).where(Course.id == course_id)
    course_result = await session.exec(course_query)
    course = course_result.first()
    
    if not course:
        return 0

    # Get progress for these specific lessons
    progress_query = select(LessonProgress.progress_percentage, LessonProgress.status).where(
        LessonProgress.user_id == user_id,
        LessonProgress.lesson_id.in_(lesson_ids),
        LessonProgress.site_id == site_id
    )
    progress_result = await session.exec(progress_query)
    existing_progress_data = progress_result.all()
    
    # Calculate average. Missing lesson progress records count as 0%
    # If a lesson is marked 'completed', it counts as 100% regardless of actual video percentage
    total_progress_sum = 0
    for percentage, status_val in existing_progress_data:
        if status_val == CompletionStatus.completed:
            total_progress_sum += 100
        else:
            total_progress_sum += percentage
            
    progress_percentage = int(total_progress_sum / total_lessons)
    
    # Update enrollment progress
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == site_id
    )
    
    if cohort_id:
        enrollment_query = enrollment_query.where(Enrollment.cohort_id == cohort_id)
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()
    
    if enrollment:
        prev_progress = enrollment.progress_percentage
        enrollment.progress_percentage = progress_percentage
        enrollment.last_accessed_at = datetime.utcnow()
        enrollment.updated_at = datetime.utcnow()
        
        # If progress is 100%, consider the course completed
        if progress_percentage >= 100:
            enrollment.status = EnrollmentStatus.completed
            if not enrollment.completed_at:
                enrollment.completed_at = datetime.utcnow()
        
        session.add(enrollment)
        await session.commit()
        await session.refresh(enrollment)
        
        # If course completed, award bonus tokens and issue certificate
        if progress_percentage >= 100 and prev_progress < 100:
            from utils.site_settings import are_token_rewards_enabled
            from models.site import Site
            
            # Fetch site for utilities
            site = await session.get(Site, site_id)
            
            # Check if already awarded completion bonus
            from models.gamification import TokenTransaction
            bonus_query = select(TokenTransaction).where(
                TokenTransaction.user_id == user_id,
                TokenTransaction.reference_type == "course_completed",
                TokenTransaction.reference_id == course_id
            )
            bonus_result = await session.exec(bonus_query)
            if not bonus_result.first() and site:
                # Award course completion bonus if rewards are enabled
                if are_token_rewards_enabled(site):
                    # Use course-specific reward if set, otherwise fallback to site default
                    amount = course.token_reward if course.token_reward > 0 else get_default_token_reward(site)
                    from utils.tokens import award_tokens
                    await award_tokens(
                        user_id=user_id,
                        amount=float(amount),
                        description=f"Course completion bonus: {course.title}",
                        session=session,
                        site_id=site_id,
                        reference_type="course_completed",
                        reference_id=course_id
                    )
            
            # Issue certificate if enabled for this course
            if course.certificate_enabled:
                await issue_certificate(user_id, course_id, session, site_id)
            
        return progress_percentage
    return 0

async def recalculate_course_progress_all_users(course_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID):
    """Recalculate course progress for ALL enrolled users.
    Called when lessons are added, removed, or published/unpublished.
    If progress drops below 100%, reverts completed enrollments back to active."""
    from models.enrollment import Enrollment
    from models.enums import EnrollmentStatus
    
    # Get all enrollments for this course (active + completed)
    enrollments_query = select(Enrollment).where(
        Enrollment.course_id == course_id,
        Enrollment.site_id == site_id,
        Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed])
    )
    enrollments_result = await session.exec(enrollments_query)
    enrollments = enrollments_result.all()
    
    for enrollment in enrollments:
        new_progress = await update_course_progress(
            user_id=enrollment.user_id,
            course_id=course_id,
            session=session,
            site_id=site_id,
            cohort_id=enrollment.cohort_id
        )
        
        # If progress dropped below 100% and enrollment was completed, revert to active
        if new_progress < 100 and enrollment.status == EnrollmentStatus.completed:
            # Re-fetch enrollment since update_course_progress may have committed
            refreshed_query = select(Enrollment).where(Enrollment.id == enrollment.id)
            refreshed_result = await session.exec(refreshed_query)
            refreshed_enrollment = refreshed_result.first()
            if refreshed_enrollment and refreshed_enrollment.status == EnrollmentStatus.completed:
                refreshed_enrollment.status = EnrollmentStatus.active
                refreshed_enrollment.completed_at = None
                session.add(refreshed_enrollment)
                await session.commit()

async def check_lesson_assessment_completion(user_id: uuid.UUID, lesson_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID):
    """
    Check if user has completed all required assessments for a lesson.
    Returns dict with completion status for quizzes, assignments, and overall.
    """
    from models.lesson import Quiz, QuizAttempt, Assignment, AssignmentSubmission
    
    # Get quiz for the lesson
    quiz_query = select(Quiz).where(Quiz.lesson_id == lesson_id, Quiz.is_published == True, Quiz.site_id == site_id)
    quiz_result = await session.exec(quiz_query)
    quiz = quiz_result.first()
    
    # Get assignment for the lesson
    assignment_query = select(Assignment).where(Assignment.lesson_id == lesson_id, Assignment.is_published == True, Assignment.site_id == site_id)
    assignment_result = await session.exec(assignment_query)
    assignment = assignment_result.first()

    has_quiz = quiz is not None
    has_assignment = assignment is not None
    has_started = False
    
    # Check quiz completion
    quiz_complete = True
    if has_quiz:
        quiz_attempt_query = select(QuizAttempt).where(
            QuizAttempt.user_id == user_id,
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.site_id == site_id
        ).order_by(QuizAttempt.completed_at.desc()).limit(1)
        
        latest_attempt_result = await session.exec(quiz_attempt_query)
        latest_attempt = latest_attempt_result.first()
        
        if latest_attempt:
            has_started = True
            quiz_complete = latest_attempt.passed or (latest_attempt.score is not None and latest_attempt.score >= quiz.passing_score)
        else:
            quiz_complete = False

    # Check assignment completion
    assignment_complete = True
    if has_assignment:
        assignment_submission_query = select(AssignmentSubmission).where(
            AssignmentSubmission.user_id == user_id,
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.site_id == site_id
        ).order_by(AssignmentSubmission.submitted_at.desc()).limit(1)
        
        latest_submission_result = await session.exec(assignment_submission_query)
        latest_submission = latest_submission_result.first()
        
        if latest_submission:
            has_started = True
            # Assignment is complete if submitted and graded (or if grading not required)
            assignment_complete = latest_submission.status == 'graded' or latest_submission.grade is not None
        else:
            assignment_complete = False

    # Overall completion: all required assessments must be complete
    overall_complete = True
    if has_quiz and not quiz_complete:
        overall_complete = False
    if has_assignment and not assignment_complete:
        overall_complete = False

    return {
        'has_quiz': has_quiz,
        'has_assignment': has_assignment,
        'quiz_complete': quiz_complete,
        'assignment_complete': assignment_complete,
        'overall_complete': overall_complete,
        'has_started': has_started
    }

async def issue_certificate(user_id: uuid.UUID, course_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID):
    """Issue PDF certificate for course completion"""
    from models.course import Course
    from models.enrollment import Enrollment, Certificate
    from models.user import User

    # Get course and user info
    course_query = select(Course).where(Course.id == course_id, Course.site_id == site_id)
    user_query = select(User).where(User.id == user_id, User.site_id == site_id)
    
    course_result = await session.exec(course_query)
    user_result = await session.exec(user_query)
    
    course = course_result.first()
    user = user_result.first()

    if not course or not user:
        return

    # Check if certificate already exists
    existing_cert_query = select(Certificate).where(
        Certificate.user_id == user_id,
        Certificate.course_id == course_id,
        Certificate.site_id == site_id
    )
    existing_cert_result = await session.exec(existing_cert_query)
    
    if existing_cert_result.first():
        return

    # Generate PDF certificate
    student_name = f"{user.first_name} {user.last_name}"
    academy_name = course.site.name if hasattr(course, 'site') and course.site else "Learning Academy"
    
    # If site is not prefetched, try to get it
    if academy_name == "Learning Academy":
        from models.site import Site
        site = await session.get(Site, site_id)
        if site:
            academy_name = site.name

    certificate_id = str(uuid.uuid4())
    
    try:
        pdf_bytes = generate_pdf_certificate(
            student_name=student_name,
            course_title=course.title,
            completion_date=datetime.utcnow(),
            certificate_id=certificate_id,
            academy_name=academy_name
        )
        
        # Upload PDF to storage
        filename = f"certificates/{user_id}/{course_id}_{certificate_id}.pdf"
        certificate_url = await file_upload_service.provider.upload_file_content(
            pdf_bytes, 
            filename, 
            "application/pdf"
        )
    except Exception as e:
        print(f"Failed to generate/upload certificate: {e}")
        certificate_url = None

    # Create certificate record
    new_cert = Certificate(
        id=uuid.UUID(certificate_id) if certificate_id else uuid.uuid4(),
        user_id=user_id,
        course_id=course_id,
        title=f"Certificate of Completion - {course.title}",
        description=f"This certificate verifies that {student_name} has successfully completed the course: {course.title}",
        certificate_url=certificate_url,
        status="issued",
        blockchain_network=None, # For future use
        site_id=site_id,
        issued_at=datetime.utcnow()
    )
    session.add(new_cert)

    # Update enrollment with certificate issued timestamp
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == site_id
    )
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()
    
    if enrollment:
        enrollment.certificate_issued_at = datetime.utcnow()
        session.add(enrollment)
    
    await session.commit()
