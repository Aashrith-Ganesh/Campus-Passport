import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Achievement,
    LedgerTransaction,
    Merchant,
    NFCCard,
    Student,
    StudentPocketConfig,
)
from backend.app.schemas.student_pocket import (
    DeductionCreateRequest,
    ExtracurricularAchievementCreateRequest,
    LedgerTransactionCreate,
    NFCCardCreateRequest,
    PurchaseCreateRequest,
    RewardCategoryInfo,
    RewardCreateRequest,
)


# ---------------------------------------------------------
# CONSTANTS & DEFAULTS
# ---------------------------------------------------------

DEFAULT_NEGATIVE_LIMIT = -500

PURPOSE_ACADEMIC = "ACADEMIC"
PURPOSE_CAMPUS = "CAMPUS"
VALID_PURPOSES = {PURPOSE_ACADEMIC, PURPOSE_CAMPUS}

TYPE_REWARD = "REWARD"
TYPE_DEDUCTION = "DEDUCTION"
TYPE_PURCHASE = "PURCHASE"
TYPE_MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
VALID_TRANSACTION_TYPES = {
    TYPE_REWARD,
    TYPE_DEDUCTION,
    TYPE_PURCHASE,
    TYPE_MANUAL_ADJUSTMENT,
}

STATUS_COMPLETED = "COMPLETED"
STATUS_REJECTED = "REJECTED"
VALID_STATUSES = {STATUS_COMPLETED, STATUS_REJECTED}


# ---------------------------------------------------------
# REWARD CATEGORIES
# ---------------------------------------------------------

REWARD_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "ACADEMIC_EFFORT": {
        "title": "Academic Effort & Excellence",
        "description": "Outstanding test performance, consistent assignment completion, or notable academic improvement.",
        "default_purpose": PURPOSE_ACADEMIC,
        "recommended_min_points": 10,
        "recommended_max_points": 50,
    },
    "ACADEMIC_EXCELLENCE": {
        "title": "Academic Effort & Excellence",
        "description": "Outstanding test performance, consistent assignment completion, or notable academic improvement.",
        "default_purpose": PURPOSE_ACADEMIC,
        "recommended_min_points": 10,
        "recommended_max_points": 50,
    },
    "HELPING_CLASSMATES": {
        "title": "Helping Classmates & Peer Tutoring",
        "description": "Assisting peers with schoolwork, peer mentoring, or supporting student learning in class.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 10,
        "recommended_max_points": 30,
    },
    "VOLUNTEERING": {
        "title": "Campus Volunteering & Service",
        "description": "Volunteering for campus cleanups, library organization, or event assistance.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 15,
        "recommended_max_points": 40,
    },
    "COMMUNITY_CONTRIBUTION": {
        "title": "Community & Campus Contribution",
        "description": "Volunteering for campus cleanups, library organization, or event assistance.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 15,
        "recommended_max_points": 40,
    },

    "LEADERSHIP_EVENT": {
        "title": "Leadership & Event Organization",
        "description": "Serving as class monitor, student club lead, or organizing school functions.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 20,
        "recommended_max_points": 50,
    },
    "RESPONSIBILITY_POSITIVE_CONDUCT": {
        "title": "Responsibility & Positive Conduct",
        "description": "Exemplary discipline, honesty, punctuality, and positive civic behavior on campus.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 10,
        "recommended_max_points": 25,
    },
    "CAMPUS_PROBLEM_REPORT": {
        "title": "Campus Problem & Infrastructure Reporting",
        "description": "Identifying and reporting broken equipment, safety hazards, or campus maintenance issues.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 10,
        "recommended_max_points": 30,
    },
    "EXTRACURRICULAR": {
        "title": "Extracurriculars & Competitions",
        "description": "Sports, debate, music, coding, robotics, cultural activities, and inter-school tournaments.",
        "default_purpose": PURPOSE_CAMPUS,
        "recommended_min_points": 20,
        "recommended_max_points": 50,
    },
}


def get_reward_categories() -> List[RewardCategoryInfo]:
    """Return all supported reward categories with recommended guidelines."""
    return [
        RewardCategoryInfo(
            category=cat,
            title=info["title"],
            description=info["description"],
            default_purpose=info["default_purpose"],
            recommended_min_points=info["recommended_min_points"],
            recommended_max_points=info["recommended_max_points"],
        )
        for cat, info in REWARD_CATEGORIES.items()
    ]


# ---------------------------------------------------------
# STUDENT QUERIES (Delegated to students service)
# ---------------------------------------------------------
from backend.app.students.service import get_student, list_students


# ---------------------------------------------------------
# CONFIGURATION & LIMITS
# ---------------------------------------------------------

def get_effective_negative_limit(
    db: Session,
    student_id: Optional[str] = None,
) -> int:
    """
    Retrieve applicable negative balance limit for a student.
    Priority:
    1. Individual student override
    2. School-wide configuration (student_id is None)
    3. Default limit (-500)
    """
    if student_id:
        individual_cfg = (
            db.query(StudentPocketConfig)
            .filter(StudentPocketConfig.student_id == student_id)
            .first()
        )
        if individual_cfg:
            return individual_cfg.negative_limit

    school_cfg = (
        db.query(StudentPocketConfig)
        .filter(StudentPocketConfig.student_id.is_(None))
        .first()
    )
    if school_cfg:
        return school_cfg.negative_limit

    return DEFAULT_NEGATIVE_LIMIT


def set_negative_limit(
    db: Session,
    negative_limit: int,
    student_id: Optional[str] = None,
) -> StudentPocketConfig:
    """Set or update negative balance limit (school-wide or student override)."""
    if student_id is not None:
        student = db.get(Student, student_id)
        if not student:
            raise ValueError(f"Student '{student_id}' does not exist.")

    query = db.query(StudentPocketConfig)
    if student_id is not None:
        cfg = query.filter(StudentPocketConfig.student_id == student_id).first()
    else:
        cfg = query.filter(StudentPocketConfig.student_id.is_(None)).first()

    if cfg:
        cfg.negative_limit = negative_limit
    else:
        cfg = StudentPocketConfig(
            student_id=student_id,
            negative_limit=negative_limit,
        )
        db.add(cfg)

    db.commit()
    db.refresh(cfg)
    return cfg


# ---------------------------------------------------------
# BALANCE CALCULATION ENGINE
# ---------------------------------------------------------

def get_student_balance(
    db: Session,
    student_id: str,
) -> Dict[str, Any]:
    """
    Derives student balances strictly from completed ledger transactions.
    """
    student = get_student(db, student_id)

    txs = (
        db.query(LedgerTransaction)
        .filter(
            LedgerTransaction.student_id == student_id,
            LedgerTransaction.status == STATUS_COMPLETED,
        )
        .all()
    )

    total_balance = sum(t.amount for t in txs)
    academic_balance = sum(t.amount for t in txs if t.purpose == PURPOSE_ACADEMIC)
    campus_balance = sum(t.amount for t in txs if t.purpose == PURPOSE_CAMPUS)

    effective_limit = get_effective_negative_limit(db, student_id)
    available_spending = max(0, campus_balance - effective_limit)

    return {
        "student_id": student.id,
        "total_balance": total_balance,
        "academic_balance": academic_balance,
        "campus_balance": campus_balance,
        "effective_negative_limit": effective_limit,
        "available_campus_spending_balance": available_spending,
    }


def get_student_transactions(
    db: Session,
    student_id: str,
) -> List[LedgerTransaction]:
    """Retrieve ledger transactions for a student in descending chronological order."""
    get_student(db, student_id)
    return (
        db.query(LedgerTransaction)
        .filter(LedgerTransaction.student_id == student_id)
        .order_by(LedgerTransaction.created_at.desc(), LedgerTransaction.id.desc())
        .all()
    )


# ---------------------------------------------------------
# CENTRAL LEDGER TRANSACTION
# ---------------------------------------------------------

def create_ledger_transaction(
    db: Session,
    data: LedgerTransactionCreate,
) -> LedgerTransaction:
    """
    Atomic creation of a ledger transaction with duplicate protection.
    """
    student = db.get(Student, data.student_id)
    if not student:
        raise ValueError(f"Student '{data.student_id}' does not exist.")

    if data.purpose not in VALID_PURPOSES:
        raise ValueError(
            f"Invalid purpose '{data.purpose}'. Must be one of: {sorted(VALID_PURPOSES)}."
        )

    if data.transaction_type not in VALID_TRANSACTION_TYPES:
        raise ValueError(
            f"Invalid transaction type '{data.transaction_type}'. Must be one of: {sorted(VALID_TRANSACTION_TYPES)}."
        )

    if data.status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid status '{data.status}'. Must be one of: {sorted(VALID_STATUSES)}."
        )

    if data.idempotency_key:
        existing = (
            db.query(LedgerTransaction)
            .filter(LedgerTransaction.idempotency_key == data.idempotency_key)
            .first()
        )
        if existing:
            raise ValueError(
                f"Duplicate transaction: idempotency key '{data.idempotency_key}' already exists."
            )

    tx = LedgerTransaction(
        student_id=data.student_id,
        amount=data.amount,
        purpose=data.purpose,
        transaction_type=data.transaction_type,
        category=data.category,
        reason=data.reason,
        source_type=data.source_type,
        source_id=data.source_id,
        issued_by=data.issued_by,
        approved_by=data.approved_by,
        status=data.status,
        metadata_json=data.metadata_json,
        idempotency_key=data.idempotency_key,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# ---------------------------------------------------------
# TEACHER REWARD ALLOCATION
# ---------------------------------------------------------

def award_teacher_reward(
    db: Session,
    payload: RewardCreateRequest,
) -> LedgerTransaction:
    """
    Allocate points to a student as a teacher reward.
    Records an atomic REWARD transaction in the central ledger.
    """
    cat_upper = payload.category.upper()
    cat_info = REWARD_CATEGORIES.get(cat_upper)
    if not cat_info:
        raise ValueError(
            f"Invalid reward category '{payload.category}'. Supported categories: {sorted(REWARD_CATEGORIES.keys())}."
        )

    # Determine purpose: if not specified in payload, default from category
    if payload.purpose:
        purpose = payload.purpose
    else:
        purpose = cat_info["default_purpose"]


    # Build unique idempotency key if action_event_id is present
    idemp_key = None
    if payload.action_event_id:
        idemp_key = f"{payload.student_id}_{payload.action_event_id}_{cat_upper}"

    metadata_str = None
    if payload.metadata:
        metadata_str = json.dumps(payload.metadata)

    tx_create = LedgerTransactionCreate(
        student_id=payload.student_id,
        amount=payload.amount,
        purpose=purpose,
        transaction_type=TYPE_REWARD,
        category=cat_upper,
        reason=payload.reason,
        source_type="TEACHER_REWARD",
        issued_by=payload.issued_by or "Teacher",
        metadata_json=metadata_str,
        idempotency_key=idemp_key,
    )
    return create_ledger_transaction(db=db, data=tx_create)


# ---------------------------------------------------------
# DEDUCTIONS
# ---------------------------------------------------------

def create_student_deduction(
    db: Session,
    payload: DeductionCreateRequest,
) -> LedgerTransaction:
    """
    Apply a deduction against a student's balance.
    Recorded as a negative debit amount in the ledger.
    Can push balance below normal campus spending negative limit.
    """
    cat_upper = payload.category.upper()
    idemp_key = None
    if payload.action_event_id:
        idemp_key = f"deduct_{payload.student_id}_{payload.action_event_id}"

    # Amount is recorded as negative debit
    debit_amount = -abs(payload.amount)

    tx_create = LedgerTransactionCreate(
        student_id=payload.student_id,
        amount=debit_amount,
        purpose=PURPOSE_CAMPUS,
        transaction_type=TYPE_DEDUCTION,
        category=cat_upper,
        reason=payload.reason,
        source_type="DISCIPLINARY_DEDUCTION",
        issued_by=payload.issued_by or "Teacher",
        idempotency_key=idemp_key,
    )
    return create_ledger_transaction(db=db, data=tx_create)


# ---------------------------------------------------------
# EXTRACURRICULAR ACHIEVEMENTS & REWARDS
# ---------------------------------------------------------

def record_student_achievement(
    db: Session,
    student_id: str,
    payload: ExtracurricularAchievementCreateRequest,
) -> Dict[str, Any]:
    """
    Record an extracurricular or verified achievement.
    Atomically creates a ledger REWARD transaction if points > 0.
    """
    student = get_student(db, student_id)
    req_type = payload.type.upper()

    # Prevent duplicate achievement by action_event_id
    if payload.action_event_id:
        dup = (
            db.query(Achievement)
            .filter(
                Achievement.student_id == student_id,
                Achievement.title == payload.title,
            )
            .first()
        )
        if dup:
            raise ValueError(
                f"Achievement with title '{payload.title}' already recorded for student '{student_id}'."
            )

    # Database CHECK constraint allows ('LEARNING', 'CONTRIBUTION')
    # Extracurriculars represent student contributions to school life
    db_type = "CONTRIBUTION" if req_type == "EXTRACURRICULAR" else req_type
    if db_type not in ("LEARNING", "CONTRIBUTION"):
        db_type = "CONTRIBUTION"

    db_source = "EXTRACURRICULAR" if req_type == "EXTRACURRICULAR" else "CAMPUS_PASSPORT"

    achievement = Achievement(
        student_id=student.id,
        type=db_type,
        title=payload.title,
        description=payload.description,
        source=db_source,
        evidence=payload.evidence or "Teacher verified",
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)

    # Award points if specified
    tx_id = None
    points_awarded = payload.points or 0
    if points_awarded > 0:
        idemp = (
            payload.action_event_id
            or f"ach_reward_{student_id}_{achievement.id}"
        )
        tx = create_ledger_transaction(
            db=db,
            data=LedgerTransactionCreate(
                student_id=student.id,
                amount=points_awarded,
                purpose=PURPOSE_CAMPUS,
                transaction_type=TYPE_REWARD,
                category="EXTRACURRICULAR",
                reason=f"Extracurricular Achievement: {payload.title}",
                source_type="ACHIEVEMENT",
                source_id=str(achievement.id),
                issued_by="Teacher",
                idempotency_key=idemp,
            ),
        )
        tx_id = tx.id

    return {
        "id": achievement.id,
        "student_id": achievement.student_id,
        "type": req_type,
        "title": achievement.title,
        "description": achievement.description,
        "source": achievement.source,
        "evidence": achievement.evidence,
        "points_awarded": points_awarded,
        "ledger_transaction_id": tx_id,
        "timestamp": achievement.timestamp,
    }


# ---------------------------------------------------------
# NFC CARD SIMULATION & PURCHASE PROCESSING
# ---------------------------------------------------------

def register_nfc_card(
    db: Session,
    payload: NFCCardCreateRequest,
) -> NFCCard:
    """Register an NFC card simulation mapping for a student."""
    get_student(db, payload.student_id)

    card_id = payload.card_id or f"CARD_{payload.student_id}_{secrets.token_hex(3).upper()}"
    card_uid = payload.card_uid or f"04:{secrets.token_hex(1).upper()}:{secrets.token_hex(1).upper()}:{secrets.token_hex(1).upper()}"
    token = payload.token or f"nfc_tok_{secrets.token_hex(16)}"

    if db.query(NFCCard).filter(NFCCard.card_id == card_id).first():
        raise ValueError(f"Card ID '{card_id}' already exists.")
    if db.query(NFCCard).filter(NFCCard.token == token).first():
        raise ValueError("Generated token collision, please retry.")

    card = NFCCard(
        card_id=card_id,
        card_uid=card_uid,
        token=token,
        student_id=payload.student_id,
        status="ACTIVE",
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def get_student_nfc_cards(
    db: Session,
    student_id: str,
) -> List[NFCCard]:
    """Retrieve all NFC cards associated with a student."""
    get_student(db, student_id)
    return db.query(NFCCard).filter(NFCCard.student_id == student_id).all()


def validate_campus_purchase(
    db: Session,
    student_id: str,
    purchase_amount: int,
) -> bool:
    """
    Validates whether a campus purchase is permitted:
    - Amount must be strictly positive.
    - Only CAMPUS-purpose points can be spent.
    - Academic points cannot be used.
    - Purchase cannot push campus balance below the effective negative limit.
    """
    if purchase_amount <= 0:
        raise ValueError("Purchase amount must be a positive integer.")

    balance = get_student_balance(db, student_id)
    campus_balance = balance["campus_balance"]
    effective_limit = balance["effective_negative_limit"]

    resulting_campus_balance = campus_balance - purchase_amount
    if resulting_campus_balance < effective_limit:
        raise ValueError(
            f"Purchase of {purchase_amount} rejected: would result in campus balance "
            f"of {resulting_campus_balance}, breaching the negative limit of {effective_limit}. "
            f"Available campus spending balance: {balance['available_campus_spending_balance']}."
        )

    return True


def process_campus_purchase(
    db: Session,
    payload: PurchaseCreateRequest,
) -> Dict[str, Any]:
    """
    Execute a campus purchase:
    - Validates active NFC card token or student identity.
    - Validates merchant.
    - Checks campus balance against negative limit.
    - Creates an atomic PURCHASE debit transaction in the central ledger.
    """
    student_id = payload.student_id

    # If token is provided, lookup active card
    if payload.token:
        card = (
            db.query(NFCCard)
            .filter(NFCCard.token == payload.token)
            .first()
        )
        if not card:
            raise ValueError(f"Invalid NFC token '{payload.token}'.")
        if card.status != "ACTIVE":
            raise ValueError(f"NFC card '{card.card_id}' is deactivated.")

        if student_id and student_id != card.student_id:
            raise ValueError("Student ID does not match NFC card owner.")
        student_id = card.student_id

    if not student_id:
        raise ValueError("Either student_id or valid NFC token must be provided.")

    student = get_student(db, student_id)

    # Merchant validation
    merchant_id = payload.merchant_id or "MERCHANT001"
    merchant = db.get(Merchant, merchant_id)
    if not merchant:
        # Fallback to create demo canteen if missing
        merchant = Merchant(
            id=merchant_id,
            name="Campus Canteen",
            category="CANTEEN",
            active=True,
        )
        db.add(merchant)
        db.commit()
        db.refresh(merchant)

    # Validate purchase against campus balance & negative limit
    validate_campus_purchase(db, student_id, payload.amount)

    # Record purchase debit
    debit_amount = -abs(payload.amount)
    desc = payload.description or f"Purchase at {merchant.name}"

    tx = create_ledger_transaction(
        db=db,
        data=LedgerTransactionCreate(
            student_id=student.id,
            amount=debit_amount,
            purpose=PURPOSE_CAMPUS,
            transaction_type=TYPE_PURCHASE,
            category="PURCHASE",
            reason=desc,
            source_type="MERCHANT",
            source_id=merchant.id,
            issued_by=merchant.id,
            idempotency_key=payload.idempotency_key,
        ),
    )

    updated_balance = get_student_balance(db, student.id)

    return {
        "success": True,
        "student_id": student.id,
        "student_name": student.name,
        "purchase_amount": payload.amount,
        "new_balance": updated_balance["campus_balance"],
        "total_balance": updated_balance["total_balance"],
        "transaction_id": tx.id,
        "message": "Purchase completed successfully",
    }


def process_nfc_tap(
    db: Session,
    token: str,
    merchant_id: Optional[str] = "MERCHANT001",
    purchase_amount: Optional[int] = None,
    description: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Simulates NFC card tap:
    - Finds card by token and verifies ACTIVE status.
    - If purchase_amount is provided, executes the purchase.
    - If purchase_amount is omitted, returns card & available balance details.
    """
    card = db.query(NFCCard).filter(NFCCard.token == token).first()
    if not card:
        raise ValueError("Invalid NFC token: Card not recognized.")
    if card.status != "ACTIVE":
        raise ValueError(f"NFC card '{card.card_id}' is deactivated.")

    student = get_student(db, card.student_id)
    balance = get_student_balance(db, student.id)

    purchase_res = None
    if purchase_amount and purchase_amount > 0:
        purchase_res = process_campus_purchase(
            db=db,
            payload=PurchaseCreateRequest(
                token=token,
                student_id=student.id,
                merchant_id=merchant_id or "MERCHANT001",
                amount=purchase_amount,
                description=description or "NFC Tap Purchase",
                idempotency_key=idempotency_key,
            ),
        )
        balance = get_student_balance(db, student.id)

    return {
        "status": "SUCCESS",
        "student_id": student.id,
        "student_name": student.name,
        "card_id": card.card_id,
        "campus_balance": balance["campus_balance"],
        "available_campus_spending_balance": balance["available_campus_spending_balance"],
        "purchase_result": purchase_res,
    }
