import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.models.host import Host, HostType, VerificationStatus
from backend.app.models.notification import Notification
from backend.app.models.password_reset import PasswordResetToken
from backend.app.schemas.user import (
    UserRegister, HostRegister, UserLogin, UserResponse, TokenResponse, UserUpdate,
    ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest
)
from backend.app.schemas.common import ApiResponse
from backend.app.auth.security import hash_password, verify_password, create_access_token
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=ApiResponse[TokenResponse])
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # For general registration, role is CUSTOMER unless explicitly ADMIN for seed
    role = UserRole.CUSTOMER
    if user_in.role == UserRole.ADMIN:
        # Check if first user in DB
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
        if admin_count == 0:
            role = UserRole.ADMIN

    user = User(
        email=user_in.email.lower().strip(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        phone=user_in.phone,
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return ApiResponse(
        success=True,
        message="Account registered successfully",
        data=TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    )

@router.post("/register-host", response_model=ApiResponse[TokenResponse])
def register_host(host_in: HostRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == host_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user = User(
        email=host_in.email.lower().strip(),
        hashed_password=hash_password(host_in.password),
        full_name=host_in.full_name.strip(),
        phone=host_in.phone,
        role=UserRole.HOST,
        is_active=True
    )
    db.add(user)
    db.flush()

    host_profile = Host(
        user_id=user.id,
        host_type=host_in.host_type,
        business_name=host_in.business_name.strip(),
        bio=host_in.bio,
        phone=host_in.phone,
        verification_status=VerificationStatus.PENDING,
        payout_details=host_in.payout_details
    )
    db.add(host_profile)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return ApiResponse(
        success=True,
        message="Host registration submitted. Verification is pending approval by administrator.",
        data=TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    )

@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower().strip()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or deactivated. Please contact support."
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    return ApiResponse(
        success=True,
        message="Login successful",
        data=TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    )

@router.get("/me", response_model=ApiResponse[UserResponse])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user)
    )

@router.put("/me", response_model=ApiResponse[UserResponse])
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url

    db.commit()
    db.refresh(current_user)
    return ApiResponse(
        success=True,
        message="Profile updated successfully",
        data=UserResponse.model_validate(current_user)
    )

@router.post("/forgot-password", response_model=ApiResponse[dict])
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support."
        )

    # Invalidate previous unused codes
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.used == False
    ).update({"used": True})

    # Generate 6-digit code and token
    code = f"{secrets.randbelow(900000) + 100000}"
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    reset_record = PasswordResetToken(
        email=email_clean,
        code=code,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset_record)

    # In-app notification
    notification = Notification(
        user_id=user.id,
        title="Password Reset Verification Code",
        message=f"Your password reset verification code is {code}. It expires in 15 minutes.",
        link="/auth/forgot-password"
    )
    db.add(notification)

    db.commit()

    return ApiResponse(
        success=True,
        message=f"Verification code successfully sent to {email_clean}.",
        data={
            "email": email_clean,
            "reset_token": token,
            "code_preview": code,
            "expires_in_minutes": 15
        }
    )

@router.post("/verify-reset-code", response_model=ApiResponse[dict])
def verify_reset_code(req: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    code_clean = req.code.strip()

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.code == code_clean,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one."
        )

    return ApiResponse(
        success=True,
        message="Verification code is valid.",
        data={"valid": True, "email": email_clean}
    )

@router.post("/reset-password", response_model=ApiResponse[dict])
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    email_clean = req.email.lower().strip()
    code_clean = req.code.strip()

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.code == code_clean,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one."
        )

    # Update password and invalidate code
    user.hashed_password = hash_password(req.new_password)
    record.used = True

    # Invalidate any other tokens for this email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == email_clean,
        PasswordResetToken.used == False
    ).update({"used": True})

    # Confirmation notification
    notification = Notification(
        user_id=user.id,
        title="Password Successfully Updated",
        message="Your account password was updated successfully. If you didn't do this, contact support immediately.",
        link="/auth/login"
    )
    db.add(notification)

    db.commit()

    return ApiResponse(
        success=True,
        message="Password has been reset successfully. You can now sign in with your new password.",
        data={"email": email_clean}
    )

