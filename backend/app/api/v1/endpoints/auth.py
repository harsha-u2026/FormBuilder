from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.form import Form
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserRead,
    Token,
    UserProfileUpdate,
    UserPasswordChange,
)

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account and return an access token."""
    normalized_email = user_in.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Check if this will be the first user
    is_first_user = db.query(User).count() == 0

    new_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip() if user_in.full_name else None,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # If first user, link any existing unassigned forms to preserve existing data seamlessly
    if is_first_user:
        db.query(Form).filter(Form.owner_id.is_(None)).update({"owner_id": new_user.id})

    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(new_user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(new_user),
    )


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials and return an access token."""
    normalized_email = user_in.email.strip().lower()

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user account is inactive.",
        )

    access_token = create_access_token(user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details for the currently authenticated user."""
    return UserRead.model_validate(current_user)


@router.put("/profile", response_model=UserRead)
def update_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's profile information (e.g. display name)."""
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip() or None

    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)


@router.put("/change-password")
def change_password(
    pass_in: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password securely."""
    if not verify_password(pass_in.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if len(pass_in.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 6 characters.",
        )

    current_user.hashed_password = get_password_hash(pass_in.new_password)
    db.commit()
    return {"message": "Password updated successfully."}
