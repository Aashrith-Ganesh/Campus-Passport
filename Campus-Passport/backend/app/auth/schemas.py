from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserContext(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    username: str
    role: str  # "STUDENT", "TEACHER", "ADMIN", "MERCHANT"
    student_id: Optional[str] = None
