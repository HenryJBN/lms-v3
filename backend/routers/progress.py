from fastapi import APIRouter, Depends, HTTPException, status
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

router = APIRouter()

@router.get("/course/slug/{course_slug}", response_model=List[LessonProgressResponse])
async def get_course_progress_by_slug(
    course_slug: str,
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
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Get lesson info and check enrollment
    lesson_query = select(Lesson, Enrollment.id.label("enrollment_id")).join(
        Enrollment, Lesson.course_id == Enrollment.course_id
    ).where(
        Lesson.id == lesson_id,
        Lesson.site_id == current_site.id,
        Enrollment.user_id == current_user.id,
        Enrollment.status == EnrollmentStatus.active,
        Enrollment.site_id == current_site.id
    )
    lesson_result = await session.exec(lesson_query)
    row = lesson_result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lesson not found or not enrolled in course"
        )
    
    lesson = row[0]

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

    # Lesson is complete if video is watched AND all assessments are complete
    if video_progress >= 100 and assessment_complete:
        status_enum = CompletionStatus.completed
        final_progress_percentage = 100
    elif video_progress >= 100 and not assessment_complete:
        # Video complete but assessments pending
        final_progress_percentage = min(95, video_progress)  # Cap at 95% until assessments done
    elif assessment_complete and video_progress < 100:
        # Assessments done but video not complete - allow completion anyway
        status_enum = CompletionStatus.completed
        final_progress_percentage = 100

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

    # Award tokens if lesson just completed
    if status_enum == CompletionStatus.completed and (not existing_progress or prev_status != CompletionStatus.completed):
        await award_tokens(
            user_id=current_user.id,
            amount=10.0,
            description=f"Completed lesson: {lesson.title}",
            session=session,
            reference_type="lesson_completed",
            reference_id=lesson_id
        )

        # Send completion notification
        await send_lesson_completion_notification(current_user.id, lesson.title, lesson.course_id, session)

        # Update course progress
        await update_course_progress(current_user.id, lesson.course_id, session, site_id=current_site.id)

    # Prepare response from updated_progress
    res_dict = updated_progress.model_dump()
    res_dict["lesson_title"] = lesson.title
    res_dict["lesson_type"] = lesson.type
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
    
    # Award tokens if passed
    if passed:
        await award_tokens(
            user_id=current_user.id,
            amount=15.0,
            description=f"Passed quiz: {quiz.title} ({score}%)",
            session=session,
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

async def update_course_progress(user_id: uuid.UUID, course_id: uuid.UUID, session: AsyncSession, site_id: uuid.UUID):
    """Update overall course progress based on lesson completions"""
    from models.enrollment import Enrollment, LessonProgress
    from models.lesson import Lesson
    from models.gamification import TokenTransaction
    
    # Get total lessons and completed lessons
    # We use a join to ensure we only count published lessons
    total_query = select(func.count(Lesson.id)).where(
        Lesson.course_id == course_id,
        Lesson.is_published == True,
        Lesson.site_id == site_id
    )
    total_result = await session.exec(total_query)
    total_lessons = total_result.one()
    
    if total_lessons == 0:
        return
    
    completed_query = select(func.count(LessonProgress.id)).join(
        Lesson, LessonProgress.lesson_id == Lesson.id
    ).where(
        LessonProgress.user_id == user_id,
        LessonProgress.course_id == course_id,
        LessonProgress.status == CompletionStatus.completed,
        LessonProgress.site_id == site_id,
        Lesson.is_published == True
    )
    completed_result = await session.exec(completed_query)
    completed_lessons = completed_result.one()
    
    progress_percentage = int((completed_lessons / total_lessons) * 100)
    
    # Update enrollment progress
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == user_id,
        Enrollment.course_id == course_id,
        Enrollment.site_id == site_id
    )
    enrollment_result = await session.exec(enrollment_query)
    enrollment = enrollment_result.first()
    
    if enrollment:
        prev_progress = enrollment.progress_percentage
        enrollment.progress_percentage = progress_percentage
        enrollment.last_accessed_at = datetime.utcnow()
        enrollment.updated_at = datetime.utcnow()
        
        if progress_percentage >= 100:
            enrollment.status = EnrollmentStatus.completed
            if not enrollment.completed_at:
                enrollment.completed_at = datetime.utcnow()
        
        session.add(enrollment)
        await session.commit()
    
        # If course completed, award bonus tokens and issue certificate
        if progress_percentage >= 100 and prev_progress < 100:
            # Check if already awarded completion bonus
            bonus_query = select(TokenTransaction).where(
                TokenTransaction.user_id == user_id,
                TokenTransaction.reference_type == "course_completed",
                TokenTransaction.reference_id == course_id
            )
            bonus_result = await session.exec(bonus_query)
            if not bonus_result.first():
                # Award course completion bonus
                await award_tokens(
                    user_id=user_id,
                    amount=50.0,
                    description="Course completion bonus",
                    session=session,
                    reference_type="course_completed",
                    reference_id=course_id
                )
                
                # Issue certificate
                await issue_certificate(user_id, course_id, session, site_id=site_id)

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
    """Issue NFT certificate for course completion"""
    from models.course import Course
    from models.enrollment import Enrollment, Certificate

    # Get course info
    course_query = select(Course).where(Course.id == course_id, Course.site_id == site_id)
    course_result = await session.exec(course_query)
    course = course_result.first()

    if not course:
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

    # Create certificate record
    new_cert = Certificate(
        user_id=user_id,
        course_id=course_id,
        title=f"Certificate of Completion - {course.title}",
        description=f"This certificate verifies that the holder has successfully completed the course: {course.title}",
        status="pending",
        blockchain_network="polygon",
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
