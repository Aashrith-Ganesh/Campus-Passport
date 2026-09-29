from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class StudentSimpleResponse(ORMModel):
    id: str
    name: str
    class_name: str
    preferred_language: str
