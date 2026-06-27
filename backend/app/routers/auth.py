from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import auth, crud, models, schemas
from ..dependencies import get_current_active_user, get_db

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=schemas.Token, summary="Authenticate and get JWT")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/auth/register",
    response_model=schemas.Profile,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new driver account",
)
def register_driver(
    payload: schemas.DriverRegister,
    db: Session = Depends(get_db),
):
    existing = crud.get_user_by_username(db, payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    hashed_pw = auth.get_password_hash(payload.password)
    try:
        user = crud.register_driver(db, payload, hashed_pw)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver licence number already exists or invalid data provided",
        )

    return _user_to_profile(db, user)


@router.get(
    "/auth/me",
    response_model=schemas.Profile,
    summary="Get the authenticated user's profile",
)
def read_profile(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _user_to_profile(db, current_user)


@router.put(
    "/auth/me",
    response_model=schemas.Profile,
    summary="Update contact details for the authenticated user",
)
def update_profile(
    payload: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        updated = crud.update_user_contact(db, current_user, payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update profile due to invalid data",
        )
    return _user_to_profile(db, updated)


def _user_to_profile(db: Session, user: models.User) -> schemas.Profile:
    # Build the Profile response from a User row + linked Person + licence.
    licence_no = crud.get_user_licence_no(db, user)
    person_out = (
        schemas.PersonOut.model_validate(user.person) if user.person is not None else None
    )
    return schemas.Profile(
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        email=user.email,
        phone=user.phone,
        person=person_out,
        licence_no=licence_no,
    )
