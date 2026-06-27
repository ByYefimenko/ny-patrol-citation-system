from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..dependencies import get_current_active_user, get_db, require_role
from ..serializers import notice_to_detail

router = APIRouter(prefix="/notices", tags=["notices"])


@router.get(
    "/me",
    response_model=List[schemas.NoticeDetail],
    summary="List notices that belong to the authenticated driver",
)
def list_my_notices(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    licence_no = crud.get_user_licence_no(db, current_user)
    if licence_no is None:
        return []
    notices = crud.list_notices_for_licence(db, licence_no)
    return [notice_to_detail(n) for n in notices]


@router.get(
    "",
    response_model=List[schemas.NoticeDetail],
    summary="List all notices (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def list_notices(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    notices = crud.list_notices(db, skip=skip, limit=limit)
    return [notice_to_detail(n) for n in notices]


@router.get(
    "/{notice_uid}",
    response_model=schemas.NoticeDetail,
    summary="Get a notice by UID",
    dependencies=[Depends(require_role("admin"))],
)
def get_notice(notice_uid: int, db: Session = Depends(get_db)):
    notice = crud.get_notice(db, notice_uid)
    if not notice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice '{notice_uid}' not found",
        )
    return notice_to_detail(notice)


@router.post(
    "",
    response_model=schemas.NoticeDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new notice (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def create_notice(payload: schemas.NoticeCreate, db: Session = Depends(get_db)):
    try:
        notice = crud.create_notice(db, payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notice with the same ticket number already exists or invalid foreign keys provided",
        )
    full = crud.get_notice(db, notice.notice_uid)
    return notice_to_detail(full)


@router.put(
    "/{notice_uid}",
    response_model=schemas.NoticeDetail,
    summary="Update an existing notice (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def update_notice(
    notice_uid: int,
    payload: schemas.NoticeUpdate,
    db: Session = Depends(get_db),
):
    try:
        notice = crud.update_notice(db, notice_uid, payload)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed due to invalid data or constraint violation",
        )
    if not notice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice '{notice_uid}' not found",
        )
    full = crud.get_notice(db, notice_uid)
    return notice_to_detail(full)


@router.delete(
    "/{notice_uid}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notice (admin only)",
    dependencies=[Depends(require_role("admin"))],
)
def delete_notice(notice_uid: int, db: Session = Depends(get_db)):
    try:
        ok = crud.delete_notice(db, notice_uid)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete notice due to related data",
        )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notice '{notice_uid}' not found",
        )
