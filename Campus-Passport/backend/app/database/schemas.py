from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


AchievementType = Literal["LEARNING", "CONTRIBUTION"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class StudentCreate(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    class_name: str = Field(min_length=1)
    preferred_language: str = Field(min_length=1)


class StudentResponse(ORMModel):
    id: str
    name: str
    class_name: str
    preferred_language: str
    created_at: datetime


class AchievementCreate(BaseModel):
    student_id: str
    type: AchievementType
    title: str
    description: str
    source: str
    evidence: Optional[str] = None


class AchievementResponse(ORMModel):
    id: int
    student_id: str
    type: AchievementType
    title: str
    description: str
    source: str
    evidence: Optional[str]
    timestamp: datetime


class OpportunityCreate(BaseModel):
    id: str
    title: str
    description: str
    amount: int
    category: str
    active: bool = True


class OpportunityResponse(ORMModel):
    id: str
    title: str
    description: str
    amount: int
    category: str
    active: bool
    created_at: datetime


class OpportunityApplicationCreate(BaseModel):
    id: str
    student_id: str
    opportunity_id: str
    status: str
    amount: int


class OpportunityApplicationResponse(ORMModel):
    id: str
    student_id: str
    opportunity_id: str
    status: str
    amount: int
    created_at: datetime


class PointTransactionCreate(BaseModel):
    student_id: str
    achievement_id: Optional[int] = None
    points: int
    reason: str
    source: str


class PointTransactionResponse(ORMModel):
    id: int
    student_id: str
    achievement_id: Optional[int]
    points: int
    reason: str
    source: str
    created_at: datetime


class SchoolIssueCreate(BaseModel):
    id: str
    student_id: str
    title: str
    description: str
    category: str
    location: Optional[str] = None
    status: str


class SchoolIssueResponse(ORMModel):
    id: str
    student_id: str
    title: str
    description: str
    category: str
    location: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class IssueInterviewCreate(BaseModel):
    issue_id: str
    participant_type: str
    participant_name: str
    response: str


class IssueInterviewResponse(ORMModel):
    id: int
    issue_id: str
    participant_type: str
    participant_name: str
    response: str
    created_at: datetime
