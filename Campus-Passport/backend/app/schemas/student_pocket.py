from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


PurposeType = Literal["ACADEMIC", "CAMPUS"]
TransactionTypeLiteral = Literal[
    "REWARD", "DEDUCTION", "PURCHASE", "MANUAL_ADJUSTMENT"
]
StatusLiteral = Literal["COMPLETED", "REJECTED"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# STUDENT BASIC SCHEMAS
# ---------------------------------------------------------

class StudentSimpleResponse(ORMModel):
    id: str
    name: str
    class_name: str
    preferred_language: str


# ---------------------------------------------------------
# REWARD & DEDUCTION SCHEMAS
# ---------------------------------------------------------

class RewardCategoryInfo(BaseModel):
    category: str
    title: str
    description: str
    default_purpose: PurposeType
    recommended_min_points: int
    recommended_max_points: int


class RewardCreateRequest(BaseModel):
    student_id: str = Field(min_length=1)
    category: str = Field(min_length=1)
    amount: int = Field(gt=0, description="Points amount must be greater than 0")
    reason: str = Field(min_length=1)
    action_event_id: Optional[str] = None
    purpose: Optional[PurposeType] = None
    issued_by: Optional[str] = "Teacher"
    metadata: Optional[Dict[str, Any]] = None
    actor_role: Optional[str] = None


class DeductionCreateRequest(BaseModel):
    student_id: str = Field(min_length=1)
    category: str = "RESPONSIBILITY_POSITIVE_CONDUCT"
    amount: int = Field(gt=0, description="Deduction amount must be positive (will be recorded as debit)")
    reason: str = Field(min_length=1)
    action_event_id: Optional[str] = None
    issued_by: Optional[str] = "Teacher"
    actor_role: Optional[str] = None


# ---------------------------------------------------------
# ACHIEVEMENT CREATION SCHEMA
# ---------------------------------------------------------

class StudentAchievementCreateRequest(BaseModel):
    type: str = Field(default="EXTRACURRICULAR", description="EXTRACURRICULAR, LEARNING, or CONTRIBUTION")
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    evidence: Optional[str] = "Teacher verified"
    points: Optional[int] = Field(default=0, ge=0)
    action_event_id: Optional[str] = None
    actor_role: Optional[str] = None


# Alias for compatibility
ExtracurricularAchievementCreateRequest = StudentAchievementCreateRequest



class StudentAchievementResponse(BaseModel):
    id: int
    student_id: str
    type: str
    title: str
    description: str
    source: str
    evidence: Optional[str] = None
    points_awarded: int = 0
    ledger_transaction_id: Optional[int] = None
    timestamp: datetime


# ---------------------------------------------------------
# NFC SCHEMAS
# ---------------------------------------------------------

class NFCCardCreateRequest(BaseModel):
    student_id: str
    card_id: Optional[str] = None
    card_uid: Optional[str] = None
    token: Optional[str] = None


class NFCCardResponse(ORMModel):
    id: int
    card_id: str
    card_uid: str
    token: str
    student_id: str
    status: str
    issued_at: datetime
    deactivated_at: Optional[datetime] = None


class NFCTapRequest(BaseModel):
    token: str
    merchant_id: Optional[str] = "MERCHANT001"
    amount: Optional[int] = None
    description: Optional[str] = None
    idempotency_key: Optional[str] = None
    actor_role: Optional[str] = None


class NFCTapResponse(BaseModel):
    status: str
    student_id: str
    student_name: str
    card_id: str
    campus_balance: int
    available_campus_spending_balance: int
    purchase_result: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------
# PURCHASE SCHEMAS
# ---------------------------------------------------------

class PurchaseCreateRequest(BaseModel):
    student_id: Optional[str] = None
    token: Optional[str] = None
    merchant_id: str = "MERCHANT001"
    amount: int = Field(gt=0, description="Purchase amount must be positive")
    description: Optional[str] = "Campus Purchase"
    idempotency_key: Optional[str] = None
    actor_role: Optional[str] = None


class PurchaseResponse(BaseModel):
    success: bool
    student_id: str
    student_name: str
    purchase_amount: int
    new_balance: int
    total_balance: int
    transaction_id: int
    message: Optional[str] = "Purchase completed successfully"


# ---------------------------------------------------------
# LEDGER & BALANCE SCHEMAS
# ---------------------------------------------------------

class LedgerTransactionCreate(BaseModel):
    student_id: str = Field(min_length=1)
    amount: int
    purpose: PurposeType
    transaction_type: TransactionTypeLiteral
    category: Optional[str] = None
    reason: str = Field(min_length=1)
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    issued_by: Optional[str] = None
    approved_by: Optional[str] = None
    status: StatusLiteral = "COMPLETED"
    metadata_json: Optional[str] = None
    idempotency_key: Optional[str] = None


class LedgerTransactionResponse(ORMModel):
    id: int
    student_id: str
    amount: int
    purpose: str
    transaction_type: str
    category: Optional[str]
    reason: str
    source_type: Optional[str]
    source_id: Optional[str]
    issued_by: Optional[str]
    approved_by: Optional[str]
    status: str
    metadata_json: Optional[str]
    idempotency_key: Optional[str]
    created_at: datetime
    updated_at: datetime


class StudentBalanceResponse(BaseModel):
    student_id: str
    total_balance: int
    academic_balance: int
    campus_balance: int
    effective_negative_limit: int
    available_campus_spending_balance: int


class StudentPocketConfigCreate(BaseModel):
    student_id: Optional[str] = None
    negative_limit: int = -500


class StudentPocketConfigResponse(ORMModel):
    id: int
    student_id: Optional[str]
    negative_limit: int
    created_at: datetime
    updated_at: datetime
