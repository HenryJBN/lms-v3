from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from database.session import get_session
from dependencies import get_current_site
from models.site import Site
from models.user import User
from models.course import Course
from models.cohort import Cohort
from models.enrollment import Enrollment
from models.enums import EnrollmentStatus

from schemas.cohort import CohortCreate, CohortUpdate, CohortResponse
from middleware.auth import require_instructor_or_admin

router = APIRouter()

@router.get("", response_model=List[CohortResponse])
async def list_all_cohorts(
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    """List all cohorts across all courses for the current site."""
    # Base query for all cohorts in the site
    query = select(Cohort).where(Cohort.site_id == current_site.id).order_by(Cohort.start_date.desc())
    
    # If instructor, only show cohorts for their courses
    if current_user.role == "instructor":
        # Get course IDs owned by this instructor
        course_query = select(Course.id).where(Course.instructor_id == current_user.id)
        course_ids_result = await session.exec(course_query)
        course_ids = course_ids_result.all()
        query = query.where(Cohort.course_id.in_(course_ids))

    results = await session.exec(query)
    cohorts = results.all()
    
    # Enrich with enrollment counts
    enriched_cohorts = []
    for cohort in cohorts:
        count_query = select(func.count(Enrollment.id)).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.status == EnrollmentStatus.active
        )
        count_result = await session.exec(count_query)
        count = count_result.one()
        
        enriched_cohorts.append(
            CohortResponse(
                **cohort.model_dump(),
                current_enrollment_count=count
            )
        )
        
    return enriched_cohorts

@router.post("", response_model=CohortResponse)
async def create_cohort(
    cohort_in: CohortCreate,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Verify Course exists and belongs to this site
    query = select(Course).where(Course.id == cohort_in.course_id, Course.site_id == current_site.id)
    result = await session.exec(query)
    course = result.first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    # Check authorization if not admin (instructor must own the course)
    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to create cohorts for this course")
        
    # Ensure datetimes are naive UTC for asyncpg
    if cohort_in.start_date.tzinfo:
        cohort_in.start_date = cohort_in.start_date.astimezone(timezone.utc).replace(tzinfo=None)
    if cohort_in.end_date and cohort_in.end_date.tzinfo:
        cohort_in.end_date = cohort_in.end_date.astimezone(timezone.utc).replace(tzinfo=None)

    new_cohort = Cohort(
        **cohort_in.model_dump(),
        site_id=current_site.id
    )
    session.add(new_cohort)
    await session.commit()
    await session.refresh(new_cohort)
    
    return CohortResponse(**new_cohort.model_dump(), current_enrollment_count=0)

@router.get("/course/{course_id}", response_model=List[CohortResponse])
async def get_course_cohorts(
    course_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    # Base query for cohorts
    query = select(Cohort).where(
        Cohort.course_id == course_id,
        Cohort.site_id == current_site.id
    ).order_by(Cohort.start_date.desc())
    
    results = await session.exec(query)
    cohorts = results.all()
    
    # Enrich with enrollment counts
    enriched_cohorts = []
    for cohort in cohorts:
        count_query = select(func.count(Enrollment.id)).where(
            Enrollment.cohort_id == cohort.id,
            Enrollment.status == EnrollmentStatus.active
        )
        count_result = await session.exec(count_query)
        count = count_result.one()
        
        enriched_cohorts.append(
            CohortResponse(
                **cohort.model_dump(),
                current_enrollment_count=count
            )
        )
        
    return enriched_cohorts

@router.get("/{cohort_id}", response_model=CohortResponse)
async def get_cohort(
    cohort_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Cohort).where(Cohort.id == cohort_id, Cohort.site_id == current_site.id)
    result = await session.exec(query)
    cohort = result.first()
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    # Get count
    count_query = select(func.count(Enrollment.id)).where(
        Enrollment.cohort_id == cohort.id,
        Enrollment.status == EnrollmentStatus.active
    )
    count_result = await session.exec(count_query)
    count = count_result.one()
    
    return CohortResponse(**cohort.model_dump(), current_enrollment_count=count)

@router.put("/{cohort_id}", response_model=CohortResponse)
async def update_cohort(
    cohort_id: uuid.UUID,
    cohort_update: CohortUpdate,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Cohort).where(Cohort.id == cohort_id, Cohort.site_id == current_site.id)
    result = await session.exec(query)
    cohort = result.first()
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    # Check course ownership if instructor
    course = await session.get(Course, cohort.course_id)
    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this cohort")

    # Ensure datetimes are naive UTC for asyncpg
    if cohort_update.start_date and cohort_update.start_date.tzinfo:
        cohort_update.start_date = cohort_update.start_date.astimezone(timezone.utc).replace(tzinfo=None)
    if cohort_update.end_date and cohort_update.end_date.tzinfo:
        cohort_update.end_date = cohort_update.end_date.astimezone(timezone.utc).replace(tzinfo=None)

    cohort_data = cohort_update.model_dump(exclude_unset=True)
    for key, value in cohort_data.items():
        setattr(cohort, key, value)
        
    cohort.updated_at = datetime.utcnow()
    session.add(cohort)
    await session.commit()
    await session.refresh(cohort)
    
    # Get count
    count_query = select(func.count(Enrollment.id)).where(
        Enrollment.cohort_id == cohort.id,
        Enrollment.status == EnrollmentStatus.active
    )
    count_result = await session.exec(count_query)
    count = count_result.one()
    
    return CohortResponse(**cohort.model_dump(), current_enrollment_count=count)

@router.delete("/{cohort_id}")
async def delete_cohort(
    cohort_id: uuid.UUID,
    current_user: User = Depends(require_instructor_or_admin),
    session: AsyncSession = Depends(get_session),
    current_site: Site = Depends(get_current_site)
):
    query = select(Cohort).where(Cohort.id == cohort_id, Cohort.site_id == current_site.id)
    result = await session.exec(query)
    cohort = result.first()
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    # Check course ownership if instructor
    course = await session.get(Course, cohort.course_id)
    if current_user.role != "admin" and str(course.instructor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this cohort")
        
    # Check if there are active enrollments
    count_query = select(func.count(Enrollment.id)).where(
        Enrollment.cohort_id == cohort.id,
        Enrollment.status == EnrollmentStatus.active
    )
    count_result = await session.exec(count_query)
    if count_result.one() > 0:
        raise HTTPException(status_code=400, detail="Cannot delete cohort with active enrollments")
        
    await session.delete(cohort)
    await session.commit()
    
    return {"message": "Cohort deleted successfully"}
