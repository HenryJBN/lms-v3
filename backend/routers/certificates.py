from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import uuid
from datetime import datetime

from database.session import get_session, AsyncSession
from sqlmodel import select, func, and_, or_, desc, col
from models.enrollment import Certificate, Enrollment
from models.course import Course
from models.user import User
from schemas.enrollment import CertificateCreate, CertificateUpdate, CertificateResponse
from schemas.common import PaginationParams, PaginatedResponse
from middleware.auth import get_current_active_user, require_admin
from utils.blockchain import mint_certificate_nft, verify_certificate_on_chain
from utils.notifications import send_certificate_notification

router = APIRouter()

@router.get("/my-certificates", response_model=List[CertificateResponse])
async def get_my_certificates(
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Get certificates for current user"""
    query = select(
        Certificate, 
        Course.title.label("course_title"), 
        Course.thumbnail_url.label("course_thumbnail")
    ).join(Course, Certificate.course_id == Course.id).where(
        Certificate.user_id == current_user.id
    ).order_by(desc(Certificate.issued_at))
    
    result = await session.exec(query)
    certificates = []
    for cert, title, thumb in result:
        c_dict = cert.model_dump()
        c_dict["course_title"] = title
        c_dict["course_thumbnail"] = thumb
        certificates.append(CertificateResponse(**c_dict))
    return certificates

@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    query = select(
        Certificate, 
        Course.title.label("course_title"), 
        Course.thumbnail_url.label("course_thumbnail"),
        User.first_name, User.last_name, User.email
    ).join(Course, Course.id == Certificate.course_id).join(
        User, User.id == Certificate.user_id
    ).where(Certificate.id == certificate_id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    cert, title, thumb, f_name, l_name, email = row
    
    # Check if user owns certificate or is admin
    if (str(cert.user_id) != str(current_user.id) and 
        current_user.role != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this certificate"
        )
    
    c_dict = cert.model_dump()
    c_dict.update({
        "course_title": title,
        "course_thumbnail": thumb,
        "first_name": f_name,
        "last_name": l_name,
        "email": email
    })
    return CertificateResponse(**c_dict)

@router.get("/verify/{certificate_id}")
async def verify_certificate(
    certificate_id: uuid.UUID,
    session: AsyncSession = Depends(get_session)
):
    """Public endpoint to verify certificate authenticity"""
    query = select(
        Certificate, 
        Course.title.label("course_title"), 
        User.first_name, 
        User.last_name
    ).join(Course, Course.id == Certificate.course_id).join(
        User, User.id == Certificate.user_id
    ).where(Certificate.id == certificate_id, Certificate.status == 'issued')
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        return {"valid": False, "message": "Certificate not found or not issued"}
    
    cert, title, f_name, l_name = row
    
    # Verify on blockchain if available
    blockchain_verified = False
    if cert.token_id and cert.contract_address:
        try:
            blockchain_verified = await verify_certificate_on_chain(
                cert.contract_address,
                cert.token_id
            )
        except Exception:
            pass  # Blockchain verification failed
    
    return {
        "valid": True,
        "certificate_id": certificate_id,
        "recipient_name": f"{f_name} {l_name}",
        "course_title": title,
        "issued_at": cert.issued_at,
        "blockchain_verified": blockchain_verified,
        "blockchain_network": cert.blockchain_network,
        "token_id": cert.token_id
    }

@router.post("/{certificate_id}/mint")
async def mint_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session)
):
    """Mint certificate as NFT on blockchain"""
    query = select(
        Certificate, 
        Course.title.label("course_title"), 
        User.wallet_address
    ).join(Course, Course.id == Certificate.course_id).join(
        User, User.id == Certificate.user_id
    ).where(Certificate.id == certificate_id, Certificate.user_id == current_user.id)
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    cert, title, wallet_address = row
    
    if cert.status != "issued":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate must be issued before minting"
        )
    
    if cert.token_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already minted"
        )
    
    if not wallet_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet address required for minting"
        )
    
    try:
        # Mint NFT on blockchain
        mint_result = await mint_certificate_nft(
            recipient_address=wallet_address,
            certificate_data={
                "certificate_id": str(certificate_id),
                "recipient_name": f"{current_user.first_name} {current_user.last_name}",
                "course_title": title,
                "issued_at": cert.issued_at.isoformat(),
                "description": cert.description
            }
        )
        
        # Update certificate with blockchain info
        cert.token_id = mint_result["token_id"]
        cert.contract_address = mint_result["contract_address"]
        cert.transaction_hash = mint_result["transaction_hash"]
        cert.blockchain_network = mint_result["network"]
        cert.status = 'minted'
        cert.updated_at = datetime.utcnow()
        
        session.add(cert)
        await session.commit()
        await session.refresh(cert)
        
        # Send notification
        await send_certificate_notification(
            current_user.id,
            title,
            "minted",
            session
        )
        
        return {
            "message": "Certificate minted successfully",
            "token_id": mint_result["token_id"],
            "transaction_hash": mint_result["transaction_hash"],
            "contract_address": mint_result["contract_address"]
        }
    except Exception as e:
        logger.error(f"Error minting certificate: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mint certificate: {str(e)}"
        )

@router.get("/", response_model=PaginatedResponse[CertificateResponse])
async def get_all_certificates(
    pagination: PaginationParams = Depends(),
    user_id: Optional[uuid.UUID] = Query(None),
    course_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to get all certificates"""
    # Base query for certificates
    query = select(
        Certificate, 
        Course.title.label("course_title"), 
        Course.thumbnail_url.label("course_thumbnail"),
        User.first_name, User.last_name, User.email
    ).join(Course, Course.id == Certificate.course_id).join(
        User, User.id == Certificate.user_id
    )
    
    # Filtering
    if user_id:
        query = query.where(Certificate.user_id == user_id)
    if course_id:
        query = query.where(Certificate.course_id == course_id)
    if status:
        query = query.where(Certificate.status == status)
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.exec(count_query)).one()
    
    # Get paginated results
    query = query.order_by(desc(Certificate.issued_at)).limit(pagination.size).offset((pagination.page - 1) * pagination.size)
    result = await session.exec(query)
    
    certificates_list = []
    for cert, title, thumb, f_name, l_name, email in result:
        c_dict = cert.model_dump()
        c_dict.update({
            "course_title": title,
            "course_thumbnail": thumb,
            "first_name": f_name,
            "last_name": l_name,
            "email": email
        })
        certificates_list.append(CertificateResponse(**c_dict))
    
    return PaginatedResponse(
        items=certificates_list,
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=(total + pagination.size - 1) // pagination.size
    )

@router.post("/", response_model=CertificateResponse)
async def create_certificate(
    certificate_in: CertificateCreate,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to manually create certificate"""
    # Check if user completed the course
    enrollment_query = select(Enrollment).where(
        Enrollment.user_id == certificate_in.user_id,
        Enrollment.course_id == certificate_in.course_id,
        Enrollment.status == 'completed'
    )
    enrollment = (await session.exec(enrollment_query)).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not completed this course"
        )
    
    # Check if certificate already exists
    existing_query = select(Certificate.id).where(
        Certificate.user_id == certificate_in.user_id,
        Certificate.course_id == certificate_in.course_id
    )
    existing = (await session.exec(existing_query)).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already exists for this user and course"
        )
    
    # Get course info
    course = await session.get(Course, certificate_in.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    new_cert = Certificate(
        id=uuid.uuid4(),
        user_id=certificate_in.user_id,
        course_id=certificate_in.course_id,
        title=certificate_in.title or f"Certificate of Completion - {course.title}",
        description=certificate_in.description or f"This certificate verifies completion of {course.title}",
        status='issued',
        blockchain_network='polygon',
        issued_at=datetime.utcnow()
    )
    
    session.add(new_cert)
    await session.commit()
    await session.refresh(new_cert)
    
    # Send notification
    await send_certificate_notification(
        certificate_in.user_id,
        course.title,
        "issued",
        session
    )
    
    # Reload with joins for response model
    return await get_certificate(new_cert.id, current_user, session)

@router.put("/{certificate_id}", response_model=CertificateResponse)
async def update_certificate(
    certificate_id: uuid.UUID,
    certificate_update: CertificateUpdate,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to update certificate"""
    cert = await session.get(Certificate, certificate_id)
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    update_data = certificate_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cert, key, value)
        
    cert.updated_at = datetime.utcnow()
    session.add(cert)
    await session.commit()
    await session.refresh(cert)
    
    return await get_certificate(certificate_id, current_user, session)

@router.delete("/{certificate_id}")
async def revoke_certificate(
    certificate_id: uuid.UUID,
    current_user = Depends(require_admin),
    session: AsyncSession = Depends(get_session)
):
    """Admin endpoint to revoke certificate"""
    query = select(
        Certificate, 
        Course.title.label("course_title")
    ).join(Course, Course.id == Certificate.course_id).where(
        Certificate.id == certificate_id
    )
    
    result = await session.exec(query)
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    cert, title = row
    cert.status = 'revoked'
    cert.updated_at = datetime.utcnow()
    session.add(cert)
    await session.commit()
    
    # Send notification
    await send_certificate_notification(
        cert.user_id,
        title,
        "revoked",
        session
    )
    
    return {"message": "Certificate revoked successfully"}
