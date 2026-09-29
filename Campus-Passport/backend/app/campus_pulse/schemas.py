from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class IssueCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    category: str = Field(min_length=1)
    location: Optional[str] = None
    student_id: str = "STU001"
    id: Optional[str] = None


class InterviewCreateRequest(BaseModel):
    participant_type: str = Field(min_length=1, description="e.g. Student, Teacher, Staff")
    participant_name: str = Field(min_length=1)
    response: str = Field(min_length=1)


class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    issue_id: str
    participant_type: str
    participant_name: str
    response: str
    created_at: datetime


class IssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    title: str
    description: str
    category: str
    location: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    interviews: List[InterviewResponse] = []


class ResearchResponse(BaseModel):
    issue_id: str
    title: str
    status: str
    interview_count: int
    minimum_required: int = 3
    is_ready_for_verification: bool
    interviews: List[InterviewResponse]
