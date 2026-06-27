from datetime import date, datetime, timedelta
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from . import models, schemas


# User / auth CRUD


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(
    db: Session,
    username: str,
    hashed_password: str,
    full_name: Optional[str] = None,
    role: str = "driver",
    email: Optional[str] = None,
    phone: Optional[str] = None,
    person_id: Optional[int] = None,
) -> models.User:
    user = models.User(
        username=username,
        hashed_password=hashed_password,
        full_name=full_name,
        is_active=True,
        role=role,
        email=email,
        phone=phone,
        person_id=person_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_contact(
    db: Session, user: models.User, payload: schemas.ProfileUpdate
) -> models.User:
    # Update email/phone on the user and address on the linked Person.
    if payload.email is not None:
        user.email = payload.email
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.address_line is not None and user.person is not None:
        user.person.address_line = payload.address_line

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(user)
    return user


def register_driver(
    db: Session, payload: schemas.DriverRegister, hashed_password: str
) -> models.User:
    # Create Person + DriverLicense + (optional) Vehicle + User in one transaction.
    # Licence defaults to NY with a 5-year expiry; the brief doesn't ask the
    # user to pick those, so we set sensible defaults here.
    person = models.Person(
        first_name=payload.first_name,
        last_name=payload.last_name,
        birth_date=payload.birth_date,
        address_line=payload.address,
    )
    db.add(person)
    db.flush()

    today = date.today()
    licence = models.DriverLicense(
        licence_no=payload.licence_no,
        state="NY",
        issue_date=today,
        expiry_date=today + timedelta(days=365 * 5),
        person_id=person.person_id,
    )
    db.add(licence)

    # Vehicle row is only created when the frontend collected the details.
    # Skipping it silently keeps the registration flow forwards-compatible.
    if payload.vehicle_vin and payload.vehicle_plate_no and payload.vehicle_plate_state:
        vehicle = models.Vehicle(
            vin=payload.vehicle_vin.upper().strip(),
            plate_no=payload.vehicle_plate_no.upper().strip(),
            plate_state=payload.vehicle_plate_state.upper().strip(),
            make=payload.vehicle_make,
            model=payload.vehicle_model,
            vehicle_year=payload.vehicle_year,
            registered_owner_person_id=person.person_id,
            registered_address=payload.address,
        )
        db.add(vehicle)

    user = models.User(
        username=payload.username,
        hashed_password=hashed_password,
        full_name=f"{payload.first_name} {payload.last_name}",
        role="driver",
        email=payload.email,
        phone=payload.phone,
        is_active=True,
        person_id=person.person_id,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(user)
    return user


def get_user_licence_no(db: Session, user: models.User) -> Optional[str]:
    if user.person_id is None:
        return None
    licence = (
        db.query(models.DriverLicense)
        .filter(models.DriverLicense.person_id == user.person_id)
        .first()
    )
    return licence.licence_no if licence else None


# Driver CRUD (Person + DriverLicense)


def get_drivers(db: Session) -> List[models.DriverLicense]:
    return (
        db.query(models.DriverLicense)
        .options(joinedload(models.DriverLicense.person))
        .all()
    )


def get_driver_by_licence(db: Session, licence_no: str) -> Optional[models.DriverLicense]:
    return (
        db.query(models.DriverLicense)
        .options(joinedload(models.DriverLicense.person))
        .filter(models.DriverLicense.licence_no == licence_no)
        .first()
    )


def create_driver(db: Session, driver_in: schemas.DriverCreate) -> models.DriverLicense:
    person_data = driver_in.person
    licence_data = driver_in.licence

    person = models.Person(**person_data.dict())
    db.add(person)
    db.flush()  # get person_id without committing yet

    driver_license = models.DriverLicense(
        licence_no=licence_data.licence_no,
        state=licence_data.state,
        issue_date=licence_data.issue_date,
        expiry_date=licence_data.expiry_date,
        person_id=person.person_id,
    )
    db.add(driver_license)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(driver_license)
    return driver_license


def update_driver(
    db: Session, licence_no: str, driver_update: schemas.DriverUpdate
) -> Optional[models.DriverLicense]:
    driver_license = (
        db.query(models.DriverLicense)
        .options(joinedload(models.DriverLicense.person))
        .filter(models.DriverLicense.licence_no == licence_no)
        .first()
    )
    if not driver_license:
        return None

    # Update person
    if driver_update.person is not None:
        for field, value in driver_update.person.dict(exclude_unset=True).items():
            setattr(driver_license.person, field, value)

    # Update licence
    if driver_update.licence is not None:
        for field, value in driver_update.licence.dict(exclude_unset=True).items():
            setattr(driver_license, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(driver_license)
    return driver_license


def delete_driver(db: Session, licence_no: str) -> bool:
    driver_license = (
        db.query(models.DriverLicense)
        .options(joinedload(models.DriverLicense.person))
        .filter(models.DriverLicense.licence_no == licence_no)
        .first()
    )
    if not driver_license:
        return False

    # Delete the person record which will cascade delete the licence if configured,
    # but we explicitly delete both for clarity.
    person = driver_license.person
    db.delete(driver_license)
    if person:
        db.delete(person)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    return True


# Vehicle CRUD


def get_vehicles(db: Session, skip: int = 0, limit: int = 100) -> List[models.Vehicle]:
    return (
        db.query(models.Vehicle)
        .options(joinedload(models.Vehicle.registered_owner))
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_vehicle(db: Session, vin: str) -> Optional[models.Vehicle]:
    return (
        db.query(models.Vehicle)
        .options(joinedload(models.Vehicle.registered_owner))
        .filter(models.Vehicle.vin == vin)
        .first()
    )


def create_vehicle(db: Session, vehicle_in: schemas.VehicleCreate) -> models.Vehicle:
    vehicle = models.Vehicle(**vehicle_in.dict())
    db.add(vehicle)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(vehicle)
    return vehicle


def update_vehicle(
    db: Session, vin: str, vehicle_update: schemas.VehicleUpdate
) -> Optional[models.Vehicle]:
    vehicle = (
        db.query(models.Vehicle)
        .options(joinedload(models.Vehicle.registered_owner))
        .filter(models.Vehicle.vin == vin)
        .first()
    )
    if not vehicle:
        return None

    for field, value in vehicle_update.dict(exclude_unset=True).items():
        setattr(vehicle, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(vehicle)
    return vehicle


def delete_vehicle(db: Session, vin: str) -> bool:
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vin == vin).first()
    if not vehicle:
        return False

    db.delete(vehicle)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    return True


# Notice CRUD


def _notice_query(db: Session):
    return (
        db.query(models.Notice)
        .options(
            joinedload(models.Notice.officer),
            joinedload(models.Notice.driver_license).joinedload(
                models.DriverLicense.person
            ),
            joinedload(models.Notice.vehicle),
            joinedload(models.Notice.location),
            joinedload(models.Notice.district),
            joinedload(models.Notice.detachment),
            joinedload(models.Notice.notice_violations),
        )
    )


def list_notices(
    db: Session, skip: int = 0, limit: int = 200
) -> List[models.Notice]:
    return (
        _notice_query(db)
        .order_by(models.Notice.notice_timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_notices_for_licence(db: Session, licence_no: str) -> List[models.Notice]:
    return (
        _notice_query(db)
        .filter(models.Notice.licence_no == licence_no)
        .order_by(models.Notice.notice_timestamp.desc())
        .all()
    )


def get_notice(db: Session, notice_uid: int) -> Optional[models.Notice]:
    return _notice_query(db).filter(models.Notice.notice_uid == notice_uid).first()


def create_notice(db: Session, payload: schemas.NoticeCreate) -> models.Notice:
    notice = models.Notice(
        ticket_no=payload.ticket_no,
        notice_timestamp=payload.notice_timestamp,
        notes=payload.notes,
        is_warning=payload.is_warning,
        officer_signature=payload.officer_signature,
        driver_signature=payload.driver_signature,
        officer_id=payload.officer_id,
        licence_no=payload.licence_no,
        vin=payload.vin,
        location_id=payload.location_id,
        district_id=payload.district_id,
        detachment_id=payload.detachment_id,
    )
    db.add(notice)
    db.flush()

    for v in payload.violations:
        db.add(
            models.NoticeViolation(
                notice_uid=notice.notice_uid,
                violation_code=v.violation_code,
                narrative=v.narrative,
            )
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(notice)
    return notice


def update_notice(
    db: Session, notice_uid: int, payload: schemas.NoticeUpdate
) -> Optional[models.Notice]:
    notice = (
        db.query(models.Notice)
        .filter(models.Notice.notice_uid == notice_uid)
        .first()
    )
    if not notice:
        return None

    data = payload.dict(exclude_unset=True)
    violations = data.pop("violations", None)
    for field, value in data.items():
        setattr(notice, field, value)

    if violations is not None:
        db.query(models.NoticeViolation).filter(
            models.NoticeViolation.notice_uid == notice_uid
        ).delete(synchronize_session=False)
        for v in violations:
            db.add(
                models.NoticeViolation(
                    notice_uid=notice_uid,
                    violation_code=v["violation_code"],
                    narrative=v.get("narrative"),
                )
            )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(notice)
    return notice


def delete_notice(db: Session, notice_uid: int) -> bool:
    notice = (
        db.query(models.Notice)
        .filter(models.Notice.notice_uid == notice_uid)
        .first()
    )
    if not notice:
        return False

    db.query(models.NoticeViolation).filter(
        models.NoticeViolation.notice_uid == notice_uid
    ).delete(synchronize_session=False)
    db.delete(notice)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    return True


# Lookups for admin forms


def list_violation_types(db: Session) -> List[models.ViolationType]:
    return db.query(models.ViolationType).order_by(models.ViolationType.violation_code).all()


def list_officers(db: Session) -> List[models.Officer]:
    return db.query(models.Officer).order_by(models.Officer.last_name).all()


def list_districts(db: Session) -> List[models.District]:
    return db.query(models.District).order_by(models.District.name).all()


def list_detachments(db: Session) -> List[models.Detachment]:
    return db.query(models.Detachment).order_by(models.Detachment.name).all()


def list_locations(db: Session) -> List[models.Location]:
    return db.query(models.Location).order_by(models.Location.location_id).all()


# Admin dashboard aggregates


def stats_summary(db: Session) -> dict:
    total_citations = (
        db.query(func.count(models.Notice.notice_uid))
        .filter(models.Notice.is_warning == False)  # noqa: E712
        .scalar()
        or 0
    )
    total_warnings = (
        db.query(func.count(models.Notice.notice_uid))
        .filter(models.Notice.is_warning == True)  # noqa: E712
        .scalar()
        or 0
    )
    total_drivers = db.query(func.count(models.DriverLicense.licence_no)).scalar() or 0
    total_vehicles = db.query(func.count(models.Vehicle.vin)).scalar() or 0

    by_violation_rows = (
        db.query(
            models.ViolationType.description.label("label"),
            func.count(models.NoticeViolation.notice_uid).label("count"),
        )
        .join(
            models.NoticeViolation,
            models.ViolationType.violation_code == models.NoticeViolation.violation_code,
        )
        .group_by(models.ViolationType.violation_code, models.ViolationType.description)
        .order_by(func.count(models.NoticeViolation.notice_uid).desc())
        .all()
    )

    by_district_rows = (
        db.query(
            models.District.name.label("label"),
            func.count(models.Notice.notice_uid).label("count"),
        )
        .join(models.Notice, models.District.district_id == models.Notice.district_id)
        .group_by(models.District.district_id, models.District.name)
        .order_by(func.count(models.Notice.notice_uid).desc())
        .all()
    )

    recent = (
        _notice_query(db)
        .order_by(models.Notice.notice_timestamp.desc())
        .limit(5)
        .all()
    )

    return {
        "total_citations": int(total_citations),
        "total_warnings": int(total_warnings),
        "total_drivers": int(total_drivers),
        "total_vehicles": int(total_vehicles),
        "by_violation_type": [{"label": r.label, "count": int(r.count)} for r in by_violation_rows],
        "by_district": [{"label": r.label, "count": int(r.count)} for r in by_district_rows],
        "recent_activity": recent,
    }

