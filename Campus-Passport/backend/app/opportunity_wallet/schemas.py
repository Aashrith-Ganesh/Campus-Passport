from typing import List
from pydantic import BaseModel, Field


class Opportunity(BaseModel):
    id: str
    title: str
    description: str
    amount: int = Field(gt=0)
    category: str


class EligibilityResponse(BaseModel):
    student_id: str
    opportunity_id: str
    eligible: bool
    reasons: List[str]
    missing_requirements: List[str]


class ApplicationResponse(BaseModel):
    application_id: str
    student_id: str
    opportunity_id: str
    status: str
    amount: int
