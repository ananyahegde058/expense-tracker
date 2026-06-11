import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, auth
from ..email_utils import send_verification_email, send_password_reset_email

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = auth.get_password_hash(user_in.password)

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    token_expires = datetime.utcnow() + timedelta(hours=24)

    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        is_verified=False,
        verification_token=verification_token,
        verification_token_expires=token_expires
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email (non-blocking — don't fail if email fails)
    send_verification_email(user_in.email, verification_token)

    return new_user


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(payload: schemas.EmailVerifyRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.verification_token == payload.token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user.verification_token_expires and datetime.utcnow() > user.verification_token_expires:
        raise HTTPException(status_code=400, detail="Verification token has expired. Please register again or request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()

    return {"message": "Email verified successfully! You can now log in."}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Always return success to avoid email enumeration
    if user and not user.is_verified:
        verification_token = secrets.token_urlsafe(32)
        user.verification_token = verification_token
        user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        send_verification_email(user.email, verification_token)

    return {"message": "If this email is registered and unverified, a new verification link has been sent."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Always return the same message to avoid email enumeration attacks
    if user:
        reset_token = secrets.token_urlsafe(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        send_password_reset_email(user.email, reset_token)

    return {"message": "If this email is registered, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.reset_token == payload.token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.reset_token_expires and datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    user.hashed_password = auth.get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully! You can now log in with your new password."}


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification link."
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
