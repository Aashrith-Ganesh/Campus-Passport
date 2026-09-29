from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.schemas.student_pocket import (
    DeductionCreateRequest,
    ExtracurricularAchievementCreateRequest,
    LedgerTransactionResponse,
    NFCCardCreateRequest,
    NFCCardResponse,
    NFCTapRequest,
    NFCTapResponse,
    PurchaseCreateRequest,
    PurchaseResponse,
    RewardCategoryInfo,
    RewardCreateRequest,
    StudentAchievementResponse,
    StudentBalanceResponse,
    StudentSimpleResponse,
)
from backend.app.services import student_pocket_service

router = APIRouter(
    tags=["Student Pocket"],
)


# ---------------------------------------------------------
# ACTOR / ROLE ENFORCEMENT DEPENDENCY (Delegated to Auth Boundary)
# ---------------------------------------------------------
from backend.app.auth.dependencies import verify_actor_role


# ---------------------------------------------------------
# 1. STUDENT DIRECTORY (Delegated to students feature module)
# ---------------------------------------------------------
from backend.app.students.routes import get_student, list_students


# ---------------------------------------------------------
# 2. BALANCE & LEDGER TRANSACTION HISTORY
# ---------------------------------------------------------

@router.get(
    "/api/student/{student_id}/balance",
    response_model=StudentBalanceResponse,
    summary="Get universal student balance and purpose breakdown",
)
def get_balance(
    student_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve universal student balance, academic points, campus points,
    negative balance limit, and available campus spending balance.
    """
    try:
        return student_pocket_service.get_student_balance(db, student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/api/student/{student_id}/transactions",
    response_model=List[LedgerTransactionResponse],
    summary="Get student ledger transaction history",
)
def get_transactions(
    student_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve complete chronological ledger transactions for a student."""
    try:
        return student_pocket_service.get_student_transactions(db, student_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


# ---------------------------------------------------------
# 3. TEACHER DASHBOARD & REWARDS
# ---------------------------------------------------------

@router.get(
    "/api/teacher/rewards/categories",
    response_model=List[RewardCategoryInfo],
    summary="List supported reward categories and guidelines",
)
def get_categories():
    """Retrieve reward categories, point ranges, and purposes for teacher dashboard."""
    return student_pocket_service.get_reward_categories()


@router.post(
    "/api/rewards",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Allocate a teacher reward to a student",
)
def create_reward(
    payload: RewardCreateRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Allocate points to a student as a teacher reward.
    Authorized for TEACHER or ADMIN. Students cannot award points.
    """
    verify_actor_role(
        allowed_roles=["TEACHER", "ADMIN"],
        x_actor_role=x_actor_role,
        actor_role=actor_role,
        body_role=payload.actor_role,
    )

    try:
        return student_pocket_service.award_teacher_reward(db, payload)
    except ValueError as exc:
        err = str(exc)
        if "not exist" in err.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)


@router.post(
    "/api/deductions",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue a disciplinary or conduct deduction",
)
def create_deduction(
    payload: DeductionCreateRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Apply a deduction against a student's balance.
    Authorized for TEACHER or ADMIN.
    """
    verify_actor_role(
        allowed_roles=["TEACHER", "ADMIN"],
        x_actor_role=x_actor_role,
        actor_role=actor_role,
        body_role=payload.actor_role,
    )

    try:
        return student_pocket_service.create_student_deduction(db, payload)
    except ValueError as exc:
        err = str(exc)
        if "not exist" in err.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)


@router.post(
    "/api/student/{student_id}/achievements",
    response_model=StudentAchievementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record extracurricular or custom student achievement",
)
def record_achievement(
    student_id: str,
    payload: ExtracurricularAchievementCreateRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Record an extracurricular or verified achievement for a student.
    Atomically awards points and creates a ledger REWARD transaction if points > 0.
    Authorized for TEACHER or ADMIN.
    """
    verify_actor_role(
        allowed_roles=["TEACHER", "ADMIN"],
        x_actor_role=x_actor_role,
        actor_role=actor_role,
        body_role=payload.actor_role,
    )

    try:
        return student_pocket_service.record_student_achievement(
            db=db,
            student_id=student_id,
            payload=payload,
        )
    except ValueError as exc:
        err = str(exc)
        if "not exist" in err.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)


# ---------------------------------------------------------
# 4. NFC SIMULATION & PURCHASES
# ---------------------------------------------------------

@router.post(
    "/api/nfc/cards",
    response_model=NFCCardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new NFC card mapping",
)
def register_card(
    payload: NFCCardCreateRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Register an NFC card mapping to a student."""
    verify_actor_role(
        allowed_roles=["ADMIN", "TEACHER"],
        x_actor_role=x_actor_role,
        actor_role=actor_role,
    )
    try:
        return student_pocket_service.register_nfc_card(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "/api/student/{student_id}/cards",
    response_model=List[NFCCardResponse],
    summary="List all NFC cards for a student",
)
def get_student_cards(
    student_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all cards mapped to a student."""
    try:
        return student_pocket_service.get_student_nfc_cards(db, student_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/api/nfc/tap",
    response_model=NFCTapResponse,
    summary="Simulate an NFC tap (and optional quick purchase)",
)
def nfc_tap(
    payload: NFCTapRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Simulate an NFC card tap:
    Validates active token, identifies student, calculates campus balance,
    and executes purchase if amount is provided.
    """
    if payload.amount and payload.amount > 0:
        verify_actor_role(
            allowed_roles=["MERCHANT", "ADMIN"],
            x_actor_role=x_actor_role,
            actor_role=actor_role,
            body_role=payload.actor_role,
        )

    try:
        return student_pocket_service.process_nfc_tap(
            db=db,
            token=payload.token,
            merchant_id=payload.merchant_id,
            purchase_amount=payload.amount,
            description=payload.description,
            idempotency_key=payload.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/api/purchases",
    response_model=PurchaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Process a campus purchase",
)
def process_purchase(
    payload: PurchaseCreateRequest,
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Process a campus purchase:
    Validates merchant, active NFC card / student identity,
    checks campus balance against negative limit, and records PURCHASE ledger transaction.
    Authorized for MERCHANT or ADMIN.
    """
    verify_actor_role(
        allowed_roles=["MERCHANT", "ADMIN"],
        x_actor_role=x_actor_role,
        actor_role=actor_role,
        body_role=payload.actor_role,
    )

    try:
        return student_pocket_service.process_campus_purchase(db, payload)
    except ValueError as exc:
        err = str(exc)
        if "not recognized" in err.lower() or "not exist" in err.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)
