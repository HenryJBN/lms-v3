from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
import uuid
from datetime import datetime

from database.connection import database
from models.schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    PaginatedResponse,
    PaginationParams
)
from middleware.auth import get_current_active_user, require_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("", response_model=List[CategoryResponse])
async def get_categories():
    """
    Get all categories
    """
    try:
        query = """
            SELECT c.* 
            FROM categories c
            ORDER BY c.sort_order, c.name
        """
        categories = await database.fetch_all(query)
        return categories  # ✅ Directly return list of categories

    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )

@router.get("/top-level", response_model=List[CategoryResponse])
async def get_top_level_categories():
    """
    Get all top-level categories (no parent)
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.parent_id IS NULL AND c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
            ORDER BY c.sort_order, c.name
        """
        categories = await database.fetch_all(query)
        return categories
        
    except Exception as e:
        logger.error(f"Error fetching top-level categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )

@router.get("/tree")
async def get_category_tree():
    """
    Get category tree (hierarchical structure)
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
            ORDER BY c.sort_order, c.name
        """
        categories = await database.fetch_all(query)
        
        # Build tree structure
        category_map = {str(cat["id"]): {**dict(cat), "children": []} for cat in categories}
        tree = []
        
        for category in categories:
            cat_id = str(category["id"])
            parent_id = str(category["parent_id"]) if category["parent_id"] else None
            
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
async def get_popular_categories(limit: int = Query(10, ge=1, le=50)):
    """
    Get popular categories by enrollment count
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT e.id) as enrollment_count,
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            LEFT JOIN enrollments e ON e.course_id = co.id
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
            ORDER BY enrollment_count DESC
            LIMIT :limit
        """
        categories = await database.fetch_all(query, {"limit": limit})
        return categories
        
    except Exception as e:
        logger.error(f"Error fetching popular categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch popular categories"
        )

@router.get("/search")
async def search_categories(q: str = Query(..., min_length=1)):
    """
    Search categories by name or description
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.is_active = true 
              AND (c.name ILIKE :search OR c.description ILIKE :search)
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
            ORDER BY c.name
            LIMIT 20
        """
        categories = await database.fetch_all(query, {"search": f"%{q}%"})
        return categories
        
    except Exception as e:
        logger.error(f"Error searching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search categories"
        )

@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str):
    """
    Get a single category by ID
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.id = :category_id
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
        """
        category = await database.fetch_one(query, {"category_id": category_id})
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category"
        )

@router.get("/slug/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(slug: str):
    """
    Get category by slug
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.slug = :slug
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
        """
        category = await database.fetch_one(query, {"slug": slug})
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category by slug: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category"
        )

@router.get("/{category_id}/subcategories", response_model=List[CategoryResponse])
async def get_subcategories(category_id: str):
    """
    Get subcategories of a category
    """
    try:
        query = """
            SELECT c.*, 
                   COUNT(DISTINCT co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category_id = c.id
            WHERE c.parent_id = :category_id AND c.is_active = true
            GROUP BY c.id, c.name, c.slug, c.description, c.icon, c.color, 
                     c.parent_id, c.sort_order, c.is_active, c.created_at, c.updated_at
            ORDER BY c.sort_order, c.name
        """
        subcategories = await database.fetch_all(query, {"category_id": category_id})
        return subcategories
        
    except Exception as e:
        logger.error(f"Error fetching subcategories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subcategories"
        )

@router.get("/{category_id}/courses")
async def get_category_courses(
    category_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    """
    Get courses in a category
    """
    try:
        offset = (page - 1) * size
        
        # Get category
        category_query = "SELECT * FROM categories WHERE id = :category_id"
        category = await database.fetch_one(category_query, {"category_id": category_id})
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Get total count
        count_query = """
            SELECT COUNT(*) as count 
            FROM courses 
            WHERE category_id = :category_id AND status = 'published'
        """
        total = await database.fetch_val(count_query, {"category_id": category_id})
        
        # Get courses
        courses_query = """
            SELECT c.*, 
                   u.first_name as instructor_first_name,
                   u.last_name as instructor_last_name
            FROM courses c
            JOIN users u ON u.id = c.instructor_id
            WHERE c.category_id = :category_id AND c.status = 'published'
            ORDER BY c.created_at DESC
            LIMIT :size OFFSET :offset
        """
        courses = await database.fetch_all(
            courses_query, 
            {"category_id": category_id, "size": size, "offset": offset}
        )
        
        return {
            "category": category,
            "courses": courses,
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
async def get_category_stats(category_id: str):
    """
    Get category statistics
    """
    try:
        query = """
            SELECT 
                COUNT(DISTINCT c.id) as total_courses,
                COUNT(DISTINCT e.id) as total_enrollments,
                COUNT(DISTINCT e.user_id) as total_students,
                COALESCE(AVG(c.rating_average), 0) as average_rating,
                COALESCE(SUM(c.price * (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id)), 0) as total_revenue
            FROM courses c
            LEFT JOIN enrollments e ON e.course_id = c.id
            WHERE c.category_id = :category_id AND c.status = 'published'
        """
        stats = await database.fetch_one(query, {"category_id": category_id})
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching category stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch category statistics"
        )

@router.get("/{category_id}/breadcrumbs")
async def get_category_breadcrumbs(category_id: str):
    """
    Get category breadcrumb trail
    """
    try:
        breadcrumbs = []
        current_id = category_id
        
        while current_id:
            query = "SELECT * FROM categories WHERE id = :category_id"
            category = await database.fetch_one(query, {"category_id": current_id})
            
            if not category:
                break
            
            breadcrumbs.insert(0, category)
            current_id = category["parent_id"]
        
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
    current_user = Depends(require_admin)
):
    """
    Create a new category (admin only)
    """
    try:
        category_id = uuid.uuid4()
        
        query = """
            INSERT INTO categories (
                id, name, slug, description, icon, color, parent_id, 
                sort_order, is_active, created_at, updated_at
            )
            VALUES (
                :id, :name, :slug, :description, :icon, :color, :parent_id,
                :sort_order, :is_active, :created_at, :updated_at
            )
            RETURNING *
        """
        
        values = {
            "id": category_id,
            "name": category_data.name,
            "slug": category_data.slug,
            "description": category_data.description,
            "icon": category_data.icon,
            "color": category_data.color,
            "parent_id": category_data.parent_id,
            "sort_order": category_data.sort_order,
            "is_active": category_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        category = await database.fetch_one(query, values)
        return category
        
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create category"
        )

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    current_user = Depends(require_admin)
):
    """
    Update a category (admin only)
    """
    try:
        # Check if category exists
        check_query = "SELECT id FROM categories WHERE id = :category_id"
        exists = await database.fetch_one(check_query, {"category_id": category_id})
        
        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Build update query dynamically
        update_fields = []
        values = {"category_id": category_id, "updated_at": datetime.utcnow()}
        
        for field, value in category_data.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = :{field}")
            values[field] = value
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append("updated_at = :updated_at")
        
        query = f"""
            UPDATE categories 
            SET {', '.join(update_fields)}
            WHERE id = :category_id
            RETURNING *
        """
        
        category = await database.fetch_one(query, values)
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update category"
        )

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user = Depends(require_admin)
):
    """
    Delete a category (admin only)
    """
    try:
        # Check if category has courses
        check_query = """
            SELECT COUNT(*) as count 
            FROM courses 
            WHERE category_id = :category_id
        """
        course_count = await database.fetch_val(check_query, {"category_id": category_id})
        
        if course_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with courses. Please move or delete courses first."
            )
        
        # Check for subcategories
        subcat_query = """
            SELECT COUNT(*) as count 
            FROM categories 
            WHERE parent_id = :category_id
        """
        subcat_count = await database.fetch_val(subcat_query, {"category_id": category_id})
        
        if subcat_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with subcategories. Please move or delete subcategories first."
            )
        
        # Delete category
        delete_query = "DELETE FROM categories WHERE id = :category_id"
        await database.execute(delete_query, {"category_id": category_id})
        
        return {"message": "Category deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete category"
        )

@router.post("/reorder")
async def reorder_categories(
    category_ids: List[str],
    current_user = Depends(require_admin)
):
    """
    Reorder categories (admin only)
    """
    try:
        for index, category_id in enumerate(category_ids):
            query = """
                UPDATE categories 
                SET sort_order = :sort_order, updated_at = :updated_at
                WHERE id = :category_id
            """
            await database.execute(
                query,
                {
                    "sort_order": index,
                    "category_id": category_id,
                    "updated_at": datetime.utcnow()
                }
            )
        
        return {"message": "Categories reordered successfully"}
        
    except Exception as e:
        logger.error(f"Error reordering categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder categories"
        )

@router.post("/{category_id}/toggle-status", response_model=CategoryResponse)
async def toggle_category_status(
    category_id: str,
    current_user = Depends(require_admin)
):
    """
    Toggle category active status (admin only)
    """
    try:
        query = """
            UPDATE categories 
            SET is_active = NOT is_active, updated_at = :updated_at
            WHERE id = :category_id
            RETURNING *
        """
        category = await database.fetch_one(
            query,
            {"category_id": category_id, "updated_at": datetime.utcnow()}
        )
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        return category
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling category status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle category status"
        )
