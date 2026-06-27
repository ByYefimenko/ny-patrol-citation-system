from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..dependencies import get_current_active_user, get_db

router = APIRouter(
    prefix="/vehicles",
    tags=["vehicles"],
    dependencies=[Depends(get_current_active_user)],
)


@router.get(
    "",
    response_model=List[schemas.Vehicle],
    summary="Get all vehicles with optional pagination",
)
def list_vehicles(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
):
    vehicles = crud.get_vehicles(db, skip=skip, limit=limit)
    return vehicles


@router.post(
    "",
    response_model=schemas.Vehicle,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new vehicle",
)
def create_vehicle(
    vehicle_in: schemas.VehicleCreate,
    db: Session = Depends(get_db),
):
    try:
        vehicle = crud.create_vehicle(db, vehicle_in)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle with the same VIN already exists or invalid data provided",
        )
    return vehicle


@router.put(
    "/{vin}",
    response_model=schemas.Vehicle,
    summary="Update an existing vehicle",
)
def update_vehicle(
    vin: str,
    vehicle_update: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
):
    try:
        vehicle = crud.update_vehicle(db, vin, vehicle_update)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed due to invalid data or constraint violation",
        )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with VIN '{vin}' not found",
        )
    return vehicle


@router.delete(
    "/{vin}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vehicle by VIN",
)
def delete_vehicle(
    vin: str,
    db: Session = Depends(get_db),
):
    try:
        deleted = crud.delete_vehicle(db, vin)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete vehicle due to related data",
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with VIN '{vin}' not found",
        )

