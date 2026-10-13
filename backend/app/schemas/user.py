from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from backend.app.models.user import UserRole
from backend.app.models.host import HostType, VerificationStatus

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=6)
    role: Optional[UserRole] = UserRole.CUSTOMER

class HostRegister(UserBase):
    password: str = Field(..., min_length=6)
    host_type: HostType = HostType.VILLA_OWNER
    business_name: str
    bio: Optional[str] = None
    payout_details: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class HostProfileResponse(BaseModel):
    id: int
    host_type: HostType
    business_name: str
    bio: Optional[str]
    verification_status: VerificationStatus
    verification_notes: Optional[str]
    phone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    host_profile: Optional[HostProfileResponse] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6)

