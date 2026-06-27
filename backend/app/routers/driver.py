from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..dependencies import get_current_active_user, get_db

router = APIRouter(
    prefix="/drivers",
    tags=["drivers"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get(
    "",
    response_model=List[schemas.Driver],
    summary="List all drivers",
)
def list_drivers(db: Session = Depends(get_db)):
    drivers = crud.get_drivers(db)
    return drivers


@router.get(
    "/{licence_no}",
    response_model=schemas.Driver,
    summary="Get a driver by licence number",
)
def get_driver_by_licence_no(
    licence_no: str,
    db: Session = Depends(get_db),
):
    driver = crud.get_driver_by_licence(db, licence_no=licence_no)
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with licence '{licence_no}' not found",
        )
    return driver


@router.post(
    "",
    response_model=schemas.Driver,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new driver",
)
def create_driver(
    driver_in: schemas.DriverCreate,
    db: Session = Depends(get_db),
):
    try:
        driver = crud.create_driver(db, driver_in)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver with the same licence already exists or invalid data provided",
        )
    return driver


@router.put(
    "/{licence_no}",
    response_model=schemas.Driver,
    summary="Update an existing driver",
)
def update_driver(
    licence_no: str,
    driver_update: schemas.DriverUpdate,
    db: Session = Depends(get_db),
):
    try:
        driver = crud.update_driver(db, licence_no, driver_update)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed due to invalid data or constraint violation",
        )

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with licence '{licence_no}' not found",
        )
    return driver


@router.delete(
    "/{licence_no}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a driver by licence number",
)
def delete_driver(
    licence_no: str,
    db: Session = Depends(get_db),
):
    try:
        deleted = crud.delete_driver(db, licence_no)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete driver due to related data",
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Driver with licence '{licence_no}' not found",
        )

