from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid
from datetime import datetime

from database.connection import database
from models.schemas import (
    LessonProgressUpdate, LessonProgressResponse, QuizAttemptCreate,
    QuizAttemptResponse, CompletionStatus
)
from middleware.auth import get_current_active_user
from utils.tokens import award_tokens
from utils.notifications import send_lesson_completion_notification

router = APIRouter()

@router.get("/course/{course_id}", response_model=List[LessonProgressResponse])
async def get_course_progress(
    course_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if user is enrolled in the course
    enrollment_query = """
        SELECT id FROM course_enrollments 
        WHERE user_id = :user_id AND course_id = :course_id AND status = 'active'
    """
    enrollment = await database.fetch_one(enrollment_query, values={
        "user_id": current_user.id,
        "course_id": course_id
    })
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course"
        )
    
    # Get lesson progress
    query = """
        SELECT lp.*, l.title as lesson_title, l.type as lesson_type
        FROM lesson_progress lp
        JOIN lessons l ON lp.lesson_id = l.id
        WHERE lp.user_id = :user_id AND lp.course_id = :course_id
        ORDER BY l.sort_order
    """
    
    progress = await database.fetch_all(query, values={
        "user_id": current_user.id,
        "course_id": course_id
    })
    
    return [LessonProgressResponse(**p) for p in progress]

@router.put("/lesson/{lesson_id}", response_model=LessonProgressResponse)
async def update_lesson_progress(
    lesson_id: uuid.UUID,
    progress_update: LessonProgressUpdate,
    current_user = Depends(get_current_active_user)
):
    # Get lesson info and check enrollment
    lesson_query = """
        SELECT l.*, ce.id as enrollment_id
        FROM lessons l
        JOIN course_enrollments ce ON l.course_id = ce.course_id
        WHERE l.id = :lesson_id AND ce.user_id = :user_id AND ce.status = 'active'
    """

    lesson = await database.fetch_one(lesson_query, values={
        "lesson_id": lesson_id,
        "user_id": current_user.id
    })

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lesson not found or not enrolled in course"
        )

    # Check assessment completion status
    assessment_status = await check_lesson_assessment_completion(current_user.id, lesson_id)

    # Check if progress record exists
    existing_query = """
        SELECT * FROM lesson_progress
        WHERE user_id = :user_id AND lesson_id = :lesson_id
    """
    existing_progress = await database.fetch_one(existing_query, values={
        "user_id": current_user.id,
        "lesson_id": lesson_id
    })

    # Determine completion status based on video progress AND assessments
    video_progress = progress_update.progress_percentage if progress_update.progress_percentage is not None else 0
    assessment_complete = assessment_status['overall_complete']

    status_value = CompletionStatus.not_started
    final_progress_percentage = video_progress

    if video_progress > 0 or assessment_status['has_started']:
        status_value = CompletionStatus.in_progress

    # Lesson is complete if video is watched AND all assessments are complete
    if video_progress >= 100 and assessment_complete:
        status_value = CompletionStatus.completed
        final_progress_percentage = 100
    elif video_progress >= 100 and not assessment_complete:
        # Video complete but assessments pending
        final_progress_percentage = min(95, video_progress)  # Cap at 95% until assessments done
    elif assessment_complete and video_progress < 100:
        # Assessments done but video not complete - allow completion anyway
        status_value = CompletionStatus.completed
        final_progress_percentage = 100

    if existing_progress:
        # Update existing progress
        update_fields = []
        values = {
            "user_id": current_user.id,
            "lesson_id": lesson_id,
            "status": status_value,
            "progress_percentage": final_progress_percentage
        }

        for field, value in progress_update.dict(exclude_unset=True).items():
            if field != 'progress_percentage':  # We override this with our calculated value
                if value is not None:
                    update_fields.append(f"{field} = :{field}")
                    values[field] = value

        # Set completion timestamp if just completed
        if (status_value == CompletionStatus.completed and
            existing_progress.status != CompletionStatus.completed):
            update_fields.append("completed_at = NOW()")
            update_fields.append("started_at = COALESCE(started_at, NOW())")
        elif status_value == CompletionStatus.in_progress and existing_progress.status == CompletionStatus.not_started:
            update_fields.append("started_at = NOW()")

        query = f"""
            UPDATE lesson_progress
            SET {', '.join(update_fields)}, updated_at = NOW()
            WHERE user_id = :user_id AND lesson_id = :lesson_id
            RETURNING *
        """

        updated_progress = await database.fetch_one(query, values=values)
    else:
        # Create new progress record
        progress_id = uuid.uuid4()

        query = """
            INSERT INTO lesson_progress (
                id, user_id, lesson_id, course_id, status, progress_percentage,
                time_spent, last_position, notes, started_at, completed_at
            )
            VALUES (
                :id, :user_id, :lesson_id, :course_id, :status, :progress_percentage,
                :time_spent, :last_position, :notes,
                CASE WHEN :status != 'not_started' THEN NOW() END,
                CASE WHEN :status = 'completed' THEN NOW() END
            )
            RETURNING *
        """

        values = {
            "id": progress_id,
            "user_id": current_user.id,
            "lesson_id": lesson_id,
            "course_id": lesson.course_id,
            "status": status_value,
            "progress_percentage": final_progress_percentage,
            **progress_update.dict()
        }

        updated_progress = await database.fetch_one(query, values=values)

    # Award tokens if lesson just completed
    if (status_value == CompletionStatus.completed and
        (not existing_progress or existing_progress.status != CompletionStatus.completed)):

        await award_tokens(
            user_id=current_user.id,
            amount=10.0,
            description=f"Completed lesson: {lesson.title}",
            reference_type="lesson_completed",
            reference_id=lesson_id
        )

        # Send completion notification
        await send_lesson_completion_notification(current_user.id, lesson.title, lesson.course_id)

        # Update course progress
        await update_course_progress(current_user.id, lesson.course_id)

    return LessonProgressResponse(**updated_progress)

@router.post("/quiz/attempt", response_model=QuizAttemptResponse)
async def submit_quiz_attempt(
    attempt: QuizAttemptCreate,
    current_user = Depends(get_current_active_user)
):
    # Get quiz info and check enrollment
    quiz_query = """
        SELECT q.*, ce.id as enrollment_id, l.title as lesson_title
        FROM quizzes q
        LEFT JOIN lessons l ON q.lesson_id = l.id
        JOIN course_enrollments ce ON q.course_id = ce.course_id
        WHERE q.id = :quiz_id AND ce.user_id = :user_id AND ce.status = 'active'
    """
    
    quiz = await database.fetch_one(quiz_query, values={
        "quiz_id": attempt.quiz_id,
        "user_id": current_user.id
    })
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quiz not found or not enrolled in course"
        )
    
    # Check attempt limit
    attempts_query = """
        SELECT COUNT(*) as count FROM quiz_attempts 
        WHERE user_id = :user_id AND quiz_id = :quiz_id
    """
    attempts_count = await database.fetch_one(attempts_query, values={
        "user_id": current_user.id,
        "quiz_id": attempt.quiz_id
    })
    
    if attempts_count.count >= quiz.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts exceeded"
        )
    
    # Get quiz questions for scoring
    questions_query = """
        SELECT * FROM quiz_questions 
        WHERE quiz_id = :quiz_id 
        ORDER BY sort_order
    """
    questions = await database.fetch_all(questions_query, values={"quiz_id": attempt.quiz_id})
    
    # Calculate score
    total_points = sum(q.points for q in questions)
    earned_points = 0
    
    for question in questions:
        user_answer = attempt.answers.get(str(question.id))
        if user_answer and user_answer.lower().strip() == question.correct_answer.lower().strip():
            earned_points += question.points
    
    score = int((earned_points / total_points) * 100) if total_points > 0 else 0
    passed = score >= quiz.passing_score
    
    # Create quiz attempt record
    attempt_id = uuid.uuid4()
    attempt_number = attempts_count.count + 1
    
    insert_query = """
        INSERT INTO quiz_attempts (
            id, user_id, quiz_id, course_id, attempt_number, started_at,
            completed_at, score, passed, answers
        )
        VALUES (
            :id, :user_id, :quiz_id, :course_id, :attempt_number, NOW(),
            NOW(), :score, :passed, :answers
        )
        RETURNING *
    """
    
    values = {
        "id": attempt_id,
        "user_id": current_user.id,
        "quiz_id": attempt.quiz_id,
        "course_id": quiz.course_id,
        "attempt_number": attempt_number,
        "score": score,
        "passed": passed,
        "answers": attempt.answers
    }
    
    new_attempt = await database.fetch_one(insert_query, values=values)
    
    # Award tokens if passed
    if passed:
        await award_tokens(
            user_id=current_user.id,
            amount=15.0,
            description=f"Passed quiz: {quiz.title} ({score}%)",
            reference_type="quiz_passed",
            reference_id=attempt.quiz_id
        )
    
    return QuizAttemptResponse(**new_attempt)

@router.get("/quiz/{quiz_id}/attempts", response_model=List[QuizAttemptResponse])
async def get_quiz_attempts(
    quiz_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    # Check if user has access to this quiz
    quiz_query = """
        SELECT q.id FROM quizzes q
        JOIN course_enrollments ce ON q.course_id = ce.course_id
        WHERE q.id = :quiz_id AND ce.user_id = :user_id AND ce.status = 'active'
    """
    
    quiz = await database.fetch_one(quiz_query, values={
        "quiz_id": quiz_id,
        "user_id": current_user.id
    })
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quiz not found or not enrolled in course"
        )
    
    # Get user's attempts
    query = """
        SELECT * FROM quiz_attempts 
        WHERE user_id = :user_id AND quiz_id = :quiz_id
        ORDER BY attempt_number DESC
    """
    
    attempts = await database.fetch_all(query, values={
        "user_id": current_user.id,
        "quiz_id": quiz_id
    })
    
    return [QuizAttemptResponse(**attempt) for attempt in attempts]

async def update_course_progress(user_id: uuid.UUID, course_id: uuid.UUID):
    """Update overall course progress based on lesson completions"""
    
    # Get total lessons and completed lessons
    progress_query = """
        SELECT 
            COUNT(l.id) as total_lessons,
            COUNT(CASE WHEN lp.status = 'completed' THEN 1 END) as completed_lessons
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = :user_id
        WHERE l.course_id = :course_id AND l.is_published = true
    """
    
    progress_data = await database.fetch_one(progress_query, values={
        "user_id": user_id,
        "course_id": course_id
    })
    
    if progress_data.total_lessons == 0:
        return
    
    progress_percentage = int((progress_data.completed_lessons / progress_data.total_lessons) * 100)
    
    # Update enrollment progress
    update_query = """
        UPDATE course_enrollments 
        SET progress_percentage = :progress_percentage,
            last_accessed_at = NOW(),
            completed_at = CASE WHEN :progress_percentage >= 100 THEN NOW() ELSE completed_at END,
            status = CASE WHEN :progress_percentage >= 100 THEN 'completed' ELSE status END,
            updated_at = NOW()
        WHERE user_id = :user_id AND course_id = :course_id
    """
    
    await database.execute(update_query, values={
        "progress_percentage": progress_percentage,
        "user_id": user_id,
        "course_id": course_id
    })
    
    # If course completed, award bonus tokens and issue certificate
    if progress_percentage >= 100:
        # Check if already awarded completion bonus
        existing_bonus_query = """
            SELECT id FROM token_transactions 
            WHERE user_id = :user_id AND reference_type = 'course_completed' 
            AND reference_id = :course_id
        """
        existing_bonus = await database.fetch_one(existing_bonus_query, values={
            "user_id": user_id,
            "course_id": course_id
        })
        
        if not existing_bonus:
            # Award course completion bonus
            await award_tokens(
                user_id=user_id,
                amount=50.0,
                description="Course completion bonus",
                reference_type="course_completed",
                reference_id=course_id
            )
            
            # Issue certificate (this would trigger blockchain minting in production)
            await issue_certificate(user_id, course_id)

async def check_lesson_assessment_completion(user_id: uuid.UUID, lesson_id: uuid.UUID):
    """
    Check if user has completed all required assessments for a lesson.
    Returns dict with completion status for quizzes, assignments, and overall.
    """

    # Get lesson assessment requirements
    lesson_query = """
        SELECT l.has_quiz, l.has_assignment, l.passing_score,
               q.id as quiz_id, q.passing_score as quiz_passing_score,
               a.id as assignment_id
        FROM lessons l
        LEFT JOIN quizzes q ON q.lesson_id = l.id AND q.is_published = true
        LEFT JOIN assignments a ON a.lesson_id = l.id AND a.is_published = true
        WHERE l.id = :lesson_id
    """
    lesson = await database.fetch_one(lesson_query, values={"lesson_id": lesson_id})

    if not lesson:
        return {
            'has_quiz': False,
            'has_assignment': False,
            'quiz_complete': True,  # No quiz required
            'assignment_complete': True,  # No assignment required
            'overall_complete': True,
            'has_started': False
        }

    has_quiz = lesson.has_quiz and lesson.quiz_id
    has_assignment = lesson.has_assignment and lesson.assignment_id
    has_started = False

    # Check quiz completion
    quiz_complete = True
    if has_quiz:
        quiz_attempt_query = """
            SELECT qa.score, qa.passed, q.passing_score
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = :user_id AND qa.quiz_id = :quiz_id
            ORDER BY qa.completed_at DESC
            LIMIT 1
        """
        latest_attempt = await database.fetch_one(quiz_attempt_query, values={
            "user_id": user_id,
            "quiz_id": lesson.quiz_id
        })

        if latest_attempt:
            has_started = True
            quiz_complete = latest_attempt.passed or latest_attempt.score >= lesson.quiz_passing_score
        else:
            quiz_complete = False  # Quiz exists but not attempted

    # Check assignment completion
    assignment_complete = True
    if has_assignment:
        assignment_submission_query = """
            SELECT sub.grade, sub.status, a.max_points
            FROM assignment_submissions sub
            JOIN assignments a ON sub.assignment_id = a.id
            WHERE sub.user_id = :user_id AND sub.assignment_id = :assignment_id
            ORDER BY sub.submitted_at DESC
            LIMIT 1
        """
        latest_submission = await database.fetch_one(assignment_submission_query, values={
            "user_id": user_id,
            "assignment_id": lesson.assignment_id
        })

        if latest_submission:
            has_started = True
            # Assignment is complete if submitted and graded (or if grading not required)
            assignment_complete = latest_submission.status == 'graded' or latest_submission.grade is not None
        else:
            assignment_complete = False  # Assignment exists but not submitted

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

async def issue_certificate(user_id: uuid.UUID, course_id: uuid.UUID):
    """Issue NFT certificate for course completion"""

    # Get course info
    course_query = "SELECT title FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": course_id})

    if not course:
        return

    # Check if certificate already exists
    existing_cert_query = """
        SELECT id FROM certificates
        WHERE user_id = :user_id AND course_id = :course_id
    """
    existing_cert = await database.fetch_one(existing_cert_query, values={
        "user_id": user_id,
        "course_id": course_id
    })

    if existing_cert:
        return

    # Create certificate record
    cert_id = uuid.uuid4()

    insert_query = """
        INSERT INTO certificates (
            id, user_id, course_id, title, description, status,
            blockchain_network, issued_at
        )
        VALUES (
            :id, :user_id, :course_id, :title, :description, 'pending',
            'polygon', NOW()
        )
    """

    await database.execute(insert_query, values={
        "id": cert_id,
        "user_id": user_id,
        "course_id": course_id,
        "title": f"Certificate of Completion - {course.title}",
        "description": f"This certificate verifies that the holder has successfully completed the course: {course.title}"
    })

    # Update enrollment with certificate issued timestamp
    update_enrollment_query = """
        UPDATE course_enrollments
        SET certificate_issued_at = NOW()
        WHERE user_id = :user_id AND course_id = :course_id
    """

    await database.execute(update_enrollment_query, values={
        "user_id": user_id,
        "course_id": course_id
    })
