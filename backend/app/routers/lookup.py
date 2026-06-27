from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..dependencies import get_db, require_role

router = APIRouter(
    prefix="/lookups",
    tags=["lookups"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get(
    "/violation-types",
    response_model=List[schemas.ViolationType],
    summary="List all violation types",
)
def list_violation_types(db: Session = Depends(get_db)):
    return crud.list_violation_types(db)


@router.get(
    "/officers",
    response_model=List[schemas.OfficerOut],
    summary="List all officers",
)
def list_officers(db: Session = Depends(get_db)):
    return crud.list_officers(db)


@router.get(
    "/districts",
    response_model=List[schemas.DistrictOut],
    summary="List all districts",
)
def list_districts(db: Session = Depends(get_db)):
    return crud.list_districts(db)


@router.get(
    "/detachments",
    response_model=List[schemas.DetachmentOut],
    summary="List all detachments",
)
def list_detachments(db: Session = Depends(get_db)):
    return crud.list_detachments(db)


@router.get(
    "/locations",
    response_model=List[schemas.LocationOut],
    summary="List all locations",
)
def list_locations(db: Session = Depends(get_db)):
    return crud.list_locations(db)
