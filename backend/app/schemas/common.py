from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = "Operation successful"
    data: Optional[T] = None

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ApiErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
