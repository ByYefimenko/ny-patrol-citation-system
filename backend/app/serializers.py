# Flatten joined ORM rows into the response shape the frontend expects.
# Keeps the routers tidy.

from typing import Optional

from . import models, schemas


def notice_to_detail(notice: models.Notice) -> schemas.NoticeDetail:
    officer_name: Optional[str] = None
    officer_badge: Optional[str] = None
    if notice.officer is not None:
        officer_name = f"{notice.officer.first_name} {notice.officer.last_name}"
        officer_badge = notice.officer.badge_no

    driver_name: Optional[str] = None
    if notice.driver_license is not None and notice.driver_license.person is not None:
        person = notice.driver_license.person
        driver_name = f"{person.first_name} {person.last_name}"

    vehicle_make = vehicle_model = vehicle_plate = None
    if notice.vehicle is not None:
        vehicle_make = notice.vehicle.make
        vehicle_model = notice.vehicle.model
        vehicle_plate = notice.vehicle.plate_no

    loc = notice.location
    location_description = loc.description if loc else None
    location_road = loc.road if loc else None
    location_city = loc.city if loc else None
    location_state = loc.state if loc else None

    district_name = notice.district.name if notice.district is not None else None
    detachment_name = notice.detachment.name if notice.detachment is not None else None

    violations = [
        schemas.NoticeViolation(violation_code=nv.violation_code, narrative=nv.narrative)
        for nv in (notice.notice_violations or [])
    ]

    return schemas.NoticeDetail(
        notice_uid=notice.notice_uid,
        ticket_no=notice.ticket_no,
        notice_timestamp=notice.notice_timestamp,
        is_warning=notice.is_warning,
        notes=notice.notes,
        officer_signature=notice.officer_signature,
        driver_signature=notice.driver_signature,
        officer_id=notice.officer_id,
        officer_name=officer_name,
        officer_badge_no=officer_badge,
        licence_no=notice.licence_no,
        driver_name=driver_name,
        vin=notice.vin,
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        vehicle_plate_no=vehicle_plate,
        location_id=notice.location_id,
        location_description=location_description,
        location_road=location_road,
        location_city=location_city,
        location_state=location_state,
        district_id=notice.district_id,
        district_name=district_name,
        detachment_id=notice.detachment_id,
        detachment_name=detachment_name,
        violations=violations,
    )
