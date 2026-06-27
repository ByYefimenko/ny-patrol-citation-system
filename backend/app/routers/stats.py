from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..dependencies import get_db, require_role
from ..serializers import notice_to_detail

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get(
    "/summary",
    response_model=schemas.StatsSummary,
    summary="Aggregate statistics for the admin dashboard",
)
def stats_summary(db: Session = Depends(get_db)):
    data = crud.stats_summary(db)
    data["recent_activity"] = [notice_to_detail(n) for n in data["recent_activity"]]
    return data
