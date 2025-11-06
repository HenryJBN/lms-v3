from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from database.connection import database
from models.schemas import (
    CertificateResponse, CertificateCreate, CertificateUpdate,
    PaginationParams, PaginatedResponse
)
from middleware.auth import get_current_active_user, require_admin
from utils.blockchain import mint_certificate_nft, verify_certificate_on_chain
from utils.notifications import send_certificate_notification

router = APIRouter()

@router.get("/my-certificates", response_model=List[CertificateResponse])
async def get_my_certificates(
    current_user = Depends(get_current_active_user)
):
    query = """
        SELECT c.*, co.title as course_title, co.thumbnail_url as course_thumbnail
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        WHERE c.user_id = :user_id
        ORDER BY c.issued_at DESC
    """
    
    certificates = await database.fetch_all(query, values={"user_id": current_user.id})
    return [CertificateResponse(**cert) for cert in certificates]

@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    query = """
        SELECT c.*, co.title as course_title, co.thumbnail_url as course_thumbnail,
               u.first_name, u.last_name, u.email
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE c.id = :certificate_id
    """
    
    certificate = await database.fetch_one(query, values={"certificate_id": certificate_id})
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Check if user owns certificate or is admin
    if (str(certificate.user_id) != str(current_user.id) and 
        current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this certificate"
        )
    
    return CertificateResponse(**certificate)

@router.get("/verify/{certificate_id}")
async def verify_certificate(certificate_id: uuid.UUID):
    """Public endpoint to verify certificate authenticity"""
    
    query = """
        SELECT c.*, co.title as course_title, u.first_name, u.last_name
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE c.id = :certificate_id AND c.status = 'issued'
    """
    
    certificate = await database.fetch_one(query, values={"certificate_id": certificate_id})
    
    if not certificate:
        return {"valid": False, "message": "Certificate not found or not issued"}
    
    # Verify on blockchain if available
    blockchain_verified = False
    if certificate.token_id and certificate.contract_address:
        try:
            blockchain_verified = await verify_certificate_on_chain(
                certificate.contract_address,
                certificate.token_id
            )
        except Exception:
            pass  # Blockchain verification failed, but certificate still exists in DB
    
    return {
        "valid": True,
        "certificate_id": certificate_id,
        "recipient_name": f"{certificate.first_name} {certificate.last_name}",
        "course_title": certificate.course_title,
        "issued_at": certificate.issued_at,
        "blockchain_verified": blockchain_verified,
        "blockchain_network": certificate.blockchain_network,
        "token_id": certificate.token_id
    }

@router.post("/{certificate_id}/mint")
async def mint_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(get_current_active_user)
):
    """Mint certificate as NFT on blockchain"""
    
    # Get certificate
    query = """
        SELECT c.*, co.title as course_title, u.wallet_address
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE c.id = :certificate_id AND c.user_id = :user_id
    """
    
    certificate = await database.fetch_one(query, values={
        "certificate_id": certificate_id,
        "user_id": current_user.id
    })
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    if certificate.status != "issued":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate must be issued before minting"
        )
    
    if certificate.token_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already minted"
        )
    
    if not certificate.wallet_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet address required for minting"
        )
    
    try:
        # Mint NFT on blockchain
        mint_result = await mint_certificate_nft(
            recipient_address=certificate.wallet_address,
            certificate_data={
                "certificate_id": str(certificate_id),
                "recipient_name": f"{current_user.first_name} {current_user.last_name}",
                "course_title": certificate.course_title,
                "issued_at": certificate.issued_at.isoformat(),
                "description": certificate.description
            }
        )
        
        # Update certificate with blockchain info
        update_query = """
            UPDATE certificates 
            SET token_id = :token_id, 
                contract_address = :contract_address,
                transaction_hash = :transaction_hash,
                blockchain_network = :blockchain_network,
                status = 'minted',
                updated_at = NOW()
            WHERE id = :certificate_id
            RETURNING *
        """
        
        updated_certificate = await database.fetch_one(update_query, values={
            "token_id": mint_result["token_id"],
            "contract_address": mint_result["contract_address"],
            "transaction_hash": mint_result["transaction_hash"],
            "blockchain_network": mint_result["network"],
            "certificate_id": certificate_id
        })
        
        # Send notification
        await send_certificate_notification(
            current_user.id,
            certificate.course_title,
            "minted"
        )
        
        return {
            "message": "Certificate minted successfully",
            "token_id": mint_result["token_id"],
            "transaction_hash": mint_result["transaction_hash"],
            "contract_address": mint_result["contract_address"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mint certificate: {str(e)}"
        )

@router.get("/", response_model=PaginatedResponse)
async def get_all_certificates(
    pagination: PaginationParams = Depends(),
    user_id: Optional[uuid.UUID] = Query(None),
    course_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user = Depends(require_admin)
):
    """Admin endpoint to get all certificates"""
    
    # Build query with filters
    where_conditions = []
    values = {
        "size": pagination.size,
        "offset": (pagination.page - 1) * pagination.size
    }
    
    if user_id:
        where_conditions.append("c.user_id = :user_id")
        values["user_id"] = user_id
    
    if course_id:
        where_conditions.append("c.course_id = :course_id")
        values["course_id"] = course_id
    
    if status:
        where_conditions.append("c.status = :status")
        values["status"] = status
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total count
    count_query = f"""
        SELECT COUNT(*) as total 
        FROM certificates c {where_clause}
    """
    total_result = await database.fetch_one(count_query, values=values)
    total = total_result.total
    
    # Get certificates
    query = f"""
        SELECT c.*, co.title as course_title, co.thumbnail_url as course_thumbnail,
               u.first_name, u.last_name, u.email
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        JOIN users u ON c.user_id = u.id
        {where_clause}
        ORDER BY c.issued_at DESC
        LIMIT :size OFFSET :offset
    """
    
    certificates = await database.fetch_all(query, values=values)
    
    return PaginatedResponse(
        items=[CertificateResponse(**cert) for cert in certificates],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.post("/", response_model=CertificateResponse)
async def create_certificate(
    certificate: CertificateCreate,
    current_user = Depends(require_admin)
):
    """Admin endpoint to manually create certificate"""
    
    # Check if user completed the course
    completion_query = """
        SELECT ce.* FROM course_enrollments ce
        WHERE ce.user_id = :user_id AND ce.course_id = :course_id 
        AND ce.status = 'completed'
    """
    
    enrollment = await database.fetch_one(completion_query, values={
        "user_id": certificate.user_id,
        "course_id": certificate.course_id
    })
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not completed this course"
        )
    
    # Check if certificate already exists
    existing_query = """
        SELECT id FROM certificates 
        WHERE user_id = :user_id AND course_id = :course_id
    """
    
    existing = await database.fetch_one(existing_query, values={
        "user_id": certificate.user_id,
        "course_id": certificate.course_id
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already exists for this user and course"
        )
    
    # Get course info
    course_query = "SELECT title FROM courses WHERE id = :course_id"
    course = await database.fetch_one(course_query, values={"course_id": certificate.course_id})
    
    certificate_id = uuid.uuid4()
    
    query = """
        INSERT INTO certificates (
            id, user_id, course_id, title, description, status,
            blockchain_network, issued_at
        )
        VALUES (
            :id, :user_id, :course_id, :title, :description, 'issued',
            'polygon', NOW()
        )
        RETURNING *
    """
    
    values = {
        "id": certificate_id,
        "title": certificate.title or f"Certificate of Completion - {course.title}",
        "description": certificate.description or f"This certificate verifies completion of {course.title}",
        **certificate.dict(exclude={"title", "description"})
    }
    
    new_certificate = await database.fetch_one(query, values=values)
    
    # Send notification
    await send_certificate_notification(
        certificate.user_id,
        course.title,
        "issued"
    )
    
    return CertificateResponse(**new_certificate)

@router.put("/{certificate_id}", response_model=CertificateResponse)
async def update_certificate(
    certificate_id: uuid.UUID,
    certificate_update: CertificateUpdate,
    current_user = Depends(require_admin)
):
    """Admin endpoint to update certificate"""
    
    # Check if certificate exists
    check_query = "SELECT * FROM certificates WHERE id = :certificate_id"
    existing_certificate = await database.fetch_one(check_query, values={"certificate_id": certificate_id})
    
    if not existing_certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Build update query
    update_fields = []
    values = {"certificate_id": certificate_id}
    
    for field, value in certificate_update.dict(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = :{field}")
            values[field] = value
    
    if not update_fields:
        return CertificateResponse(**existing_certificate)
    
    query = f"""
        UPDATE certificates 
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = :certificate_id
        RETURNING *
    """
    
    updated_certificate = await database.fetch_one(query, values=values)
    return CertificateResponse(**updated_certificate)

@router.delete("/{certificate_id}")
async def revoke_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(require_admin)
):
    """Admin endpoint to revoke certificate"""
    
    # Check if certificate exists
    check_query = """
        SELECT c.*, co.title as course_title, u.first_name, u.last_name
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        JOIN users u ON c.user_id = u.id
        WHERE c.id = :certificate_id
    """
    certificate = await database.fetch_one(check_query, values={"certificate_id": certificate_id})
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # Update certificate status to revoked
    query = """
        UPDATE certificates 
        SET status = 'revoked', updated_at = NOW()
        WHERE id = :certificate_id
    """
    
    await database.execute(query, values={"certificate_id": certificate_id})
    
    # Send notification
    await send_certificate_notification(
        certificate.user_id,
        certificate.course_title,
        "revoked"
    )
    
    return {"message": "Certificate revoked successfully"}
