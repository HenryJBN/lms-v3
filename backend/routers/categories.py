from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
import uuid
from datetime import datetime

from database.session import get_session, AsyncSession
from sqlmodel import select, func, and_, or_, desc, col
from models.course import Category, Course
from models.enrollment import Enrollment
from schemas.course import CategoryCreate, CategoryUpdate, CategoryResponse
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("", response_model=List[CategoryResponse])
async def get_categories(session: AsyncSession = Depends(get_session)):
    """Get all categories"""
    try:
        query = select(Category).order_by(Category.sort_order, Category.name)
        result = await session.exec(query)
        return result.all()
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )

@router.get("/top-level", response_model=List[CategoryResponse])
async def get_top_level_categories(session: AsyncSession = Depends(get_session)):
    """Get all top-level categories (no parent)"""
    try:
        query = select(
            Category, 
            func.count(Course.id).label("course_count")
        ).outerjoin(Course).where(
            Category.parent_id == None, 
            Category.is_active == True
        ).group_by(Category.id).order_by(Category.sort_order, Category.name)
        
        result = await session.exec(query)
        categories = []
        for cat, count in result:
            c_dict = cat.model_dump()
            c_dict["course_count"] = count
            categories.append(c_dict)
        return categories
    except Exception as e:
        logger.error(f"Error fetching top-level categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )

@router.get("/tree")
async def get_category_tree(session: AsyncSession = Depends(get_session)):
    """Get category tree (hierarchical structure)"""
    try:
        query = select(
            Category, 
            func.count(Course.id).label("course_count")
        ).outerjoin(Course).where(Category.is_active == True).group_by(Category.id).order_by(Category.sort_order, Category.name)
        
        result = await session.exec(query)
        
        categories = []
        for cat, count in result:
            categories.append({**cat.model_dump(), "course_count": count})
        
        # Build tree structure
        category_map = {str(cat["id"]): {**cat, "children": []} for cat in categories}
        tree = []
        
        for cat in categories:
            cat_id = str(cat["id"])
            parent_id = str(cat["parent_id"]) if cat["parent_id"] else None
            
            if parent_id and parent_id in category_map:
                category_map[parent_id]["children"].append(category_map[cat_id])
            else:
                tree.append(category_map[cat_id])
        return tree
    except Exception as e:
        logger.error(f"Error fetching category tree: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category tree"
        )

@router.get("/popular")
async def get_popular_categories(session: AsyncSession = Depends(get_session), limit: int = Query(10, ge=1, le=50)):
    """Get popular categories by enrollment count"""
    try:
        query = select(
            Category,
            func.count(Enrollment.id.distinct()).label("enrollment_count"),
            func.count(Course.id.distinct()).label("course_count")
        ).outerjoin(Course, Course.category_id == Category.id).outerjoin(
            Enrollment, Enrollment.course_id == Course.id
        ).where(Category.is_active == True).group_by(Category.id).order_by(desc("enrollment_count")).limit(limit)
        
        result = await session.exec(query)
        categories = []
        for cat, e_count, c_count in result:
            categories.append({
                **cat.model_dump(),
                "enrollment_count": e_count,
                "course_count": c_count
            })
        return categories
    except Exception as e:
        logger.error(f"Error fetching popular categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch popular categories"
        )

@router.get("/search")
async def search_categories(session: AsyncSession = Depends(get_session), q: str = Query(..., min_length=1)):
    """Search categories by name or description"""
    try:
        query = select(
            Category,
            func.count(Course.id.distinct()).label("course_count")
        ).outerjoin(Course).where(
            Category.is_active == True,
            or_(Category.name.ilike(f"%{q}%"), Category.description.ilike(f"%|{q}%"))
        ).group_by(Category.id).order_by(Category.name).limit(20)
        
        result = await session.exec(query)
        categories = []
        for cat, count in result:
            categories.append({**cat.model_dump(), "course_count": count})
        return categories
    except Exception as e:
        logger.error(f"Error searching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search categories"
        )

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Get a single category by ID"""
    try:
        query = select(
            Category, 
            func.count(Course.id.distinct()).label("course_count")
        ).outerjoin(Course).where(Category.id == category_id).group_by(Category.id)
        
        result = await session.exec(query)
        row = result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        cat, count = row
        return {**cat.model_dump(), "course_count": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category"
        )

@router.get("/slug/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(slug: str, session: AsyncSession = Depends(get_session)):
    """Get category by slug"""
    try:
        query = select(
            Category, 
            func.count(Course.id.distinct()).label("course_count")
        ).outerjoin(Course).where(Category.slug == slug).group_by(Category.id)
        
        result = await session.exec(query)
        row = result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        cat, count = row
        return {**cat.model_dump(), "course_count": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category by slug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category"
        )

@router.get("/{category_id}/subcategories", response_model=List[CategoryResponse])
async def get_subcategories(category_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Get subcategories of a category"""
    try:
        query = select(
            Category, 
            func.count(Course.id.distinct()).label("course_count")
        ).outerjoin(Course).where(
            Category.parent_id == category_id, 
            Category.is_active == True
        ).group_by(Category.id).order_by(Category.sort_order, Category.name)
        
        result = await session.exec(query)
        categories = []
        for cat, count in result:
            categories.append({**cat.model_dump(), "course_count": count})
        return categories
    except Exception as e:
        logger.error(f"Error fetching subcategories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subcategories"
        )

@router.get("/{category_id}/courses")
async def get_category_courses(
    category_id: uuid.UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session)
):
    """Get courses in a category"""
    try:
        offset = (page - 1) * size
        
        # Get category
        category = await session.get(Category, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Get total count
        count_query = select(func.count(Course.id)).where(
            Course.category_id == category_id, 
            Course.status == 'published'
        )
        total = (await session.exec(count_query)).one()
        
        # Get courses
        from models.user import User
        courses_query = select(
            Course, 
            User.first_name.label("instructor_first_name"),
            User.last_name.label("instructor_last_name")
        ).join(User, User.id == Course.instructor_id).where(
            Course.category_id == category_id, 
            Course.status == 'published'
        ).order_by(desc(Course.created_at)).limit(size).offset(offset)
        
        result = await session.exec(courses_query)
        courses_list = []
        for course, f_name, l_name in result:
            c_dict = course.model_dump()
            c_dict["instructor_first_name"] = f_name
            c_dict["instructor_last_name"] = l_name
            courses_list.append(c_dict)
            
        return {
            "category": category,
            "courses": courses_list,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category courses: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category courses"
        )

@router.get("/{category_id}/stats")
async def get_category_stats(category_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Get category statistics"""
    try:
        # Sum of revenue is more complex, but we can do it with a subquery
        query = select(
            func.count(Course.id.distinct()).label("total_courses"),
            func.count(Enrollment.id.distinct()).label("total_enrollments"),
            func.count(Enrollment.user_id.distinct()).label("total_students"),
            func.coalesce(func.avg(Course.rating_average), 0).label("average_rating")
        ).outerjoin(Enrollment, Enrollment.course_id == Course.id).where(
            Course.category_id == category_id, 
            Course.status == 'published'
        )
        
        result = await session.exec(query)
        stats = result.first()
        
        # For revenue, we might want a separate calculation or a very complex aggregation
        # Simplified here for SQLModel translation
        return {
            "total_courses": stats[0],
            "total_enrollments": stats[1],
            "total_students": stats[2],
            "average_rating": float(stats[3])
        }
    except Exception as e:
        logger.error(f"Error fetching category stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category statistics"
        )

@router.get("/{category_id}/breadcrumbs")
async def get_category_breadcrumbs(category_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Get category breadcrumb trail"""
    try:
        breadcrumbs = []
        current_id = category_id
        
        while current_id:
            category = await session.get(Category, current_id)
            if not category:
                break
            breadcrumbs.insert(0, category)
            current_id = category.parent_id
        return breadcrumbs
    except Exception as e:
        logger.error(f"Error fetching breadcrumbs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch breadcrumbs"
        )

@router.post("", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Create a new category (admin only)"""
    try:
        new_category = Category(
            **category_data.model_dump(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(new_category)
        await session.commit()
        await session.refresh(new_category)
        return new_category
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    category_data: CategoryUpdate,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Update a category (admin only)"""
    try:
        category = await session.get(Category, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        update_data = category_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
            
        category.updated_at = datetime.utcnow()
        session.add(category)
        await session.commit()
        await session.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )

@router.delete("/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Delete a category (admin only)"""
    try:
        category = await session.get(Category, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
            
        # Check if category has courses
        course_count_query = select(func.count(Course.id)).where(Course.category_id == category_id)
        course_count = (await session.exec(course_count_query)).one()
        
        if course_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with courses. Please move or delete courses first."
            )
        
        # Check for subcategories
        subcat_count_query = select(func.count(Category.id)).where(Category.parent_id == category_id)
        subcat_count = (await session.exec(subcat_count_query)).one()
        
        if subcat_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with subcategories. Please move or delete subcategories first."
            )
        
        await session.delete(category)
        await session.commit()
        
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )

@router.post("/reorder")
async def reorder_categories(
    category_ids: List[uuid.UUID],
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Reorder categories (admin only)"""
    try:
        for index, category_id in enumerate(category_ids):
            category = await session.get(Category, category_id)
            if category:
                category.sort_order = index
                category.updated_at = datetime.utcnow()
                session.add(category)
        
        await session.commit()
        return {"message": "Categories reordered successfully"}
    except Exception as e:
        logger.error(f"Error reordering categories: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder categories"
        )

@router.post("/{category_id}/toggle-status", response_model=CategoryResponse)
async def toggle_category_status(
    category_id: uuid.UUID,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Toggle category active status (admin only)"""
    try:
        category = await session.get(Category, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
            
        category.is_active = not category.is_active
        category.updated_at = datetime.utcnow()
        session.add(category)
        await session.commit()
        await session.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling category status: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle category status"
        )
