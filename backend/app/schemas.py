from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# Authentication / User schemas


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str = Field(..., max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)


class User(UserBase):
    id: int
    is_active: bool
    person_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserInDB(UserBase):
    id: int
    hashed_password: str
    is_active: bool

    class Config:
        from_attributes = True


# Person / Driver schemas


class PersonBase(BaseModel):
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    address_line: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=50)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=10)
    birth_date: Optional[date] = None
    height: Optional[float] = Field(None, ge=0)
    weight: Optional[float] = Field(None, ge=0)
    eye_colour: Optional[str] = Field(None, max_length=20)


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    address_line: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=50)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=10)
    birth_date: Optional[date] = None
    height: Optional[float] = Field(None, ge=0)
    weight: Optional[float] = Field(None, ge=0)
    eye_colour: Optional[str] = Field(None, max_length=20)


class PersonOut(PersonBase):
    person_id: int

    class Config:
        from_attributes = True


# Driver self-registration


class DriverRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    birth_date: date
    licence_no: str = Field(..., min_length=4, max_length=20)
    email: str = Field(..., max_length=120)
    phone: str = Field(..., max_length=30)
    address: str = Field(..., max_length=200)

    # Vehicle registration details (assignment brief 1.2.1a).
    # Optional at the schema level so older clients still work, but the
    # frontend form requires them.
    vehicle_vin: Optional[str] = Field(None, max_length=17)
    vehicle_plate_no: Optional[str] = Field(None, max_length=10)
    vehicle_plate_state: Optional[str] = Field(None, max_length=2)
    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=50)
    vehicle_year: Optional[int] = Field(None, ge=1900, le=2100)


class ProfileUpdate(BaseModel):
    email: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    address_line: Optional[str] = Field(None, max_length=100)


class Profile(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    person: Optional[PersonOut] = None
    licence_no: Optional[str] = None

    class Config:
        from_attributes = True


class DriverLicenseBase(BaseModel):
    licence_no: str = Field(..., max_length=20)
    state: str = Field(..., max_length=2)
    issue_date: date
    expiry_date: date


class DriverLicenseCreate(DriverLicenseBase):
    pass


class DriverLicenseUpdate(BaseModel):
    state: Optional[str] = Field(None, max_length=2)
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None


class Driver(BaseModel):
    licence_no: str
    state: str
    issue_date: date
    expiry_date: date
    person: PersonOut

    class Config:
        from_attributes = True


class DriverCreate(BaseModel):
    person: PersonCreate
    licence: DriverLicenseCreate


class DriverUpdate(BaseModel):
    person: Optional[PersonUpdate] = None
    licence: Optional[DriverLicenseUpdate] = None


# Vehicle schemas


class VehicleBase(BaseModel):
    plate_no: str = Field(..., max_length=10)
    plate_state: str = Field(..., max_length=2)
    colour: Optional[str] = Field(None, max_length=30)
    make: Optional[str] = Field(None, max_length=50)
    model: Optional[str] = Field(None, max_length=50)
    vehicle_year: Optional[int] = Field(None, ge=1900, le=2100)
    vehicle_type: Optional[str] = Field(None, max_length=30)
    registered_owner_person_id: int
    registered_address: Optional[str] = Field(None, max_length=100)


class VehicleCreate(VehicleBase):
    vin: str = Field(..., max_length=17)


class VehicleUpdate(BaseModel):
    plate_no: Optional[str] = Field(None, max_length=10)
    plate_state: Optional[str] = Field(None, max_length=2)
    colour: Optional[str] = Field(None, max_length=30)
    make: Optional[str] = Field(None, max_length=50)
    model: Optional[str] = Field(None, max_length=50)
    vehicle_year: Optional[int] = Field(None, ge=1900, le=2100)
    vehicle_type: Optional[str] = Field(None, max_length=30)
    registered_owner_person_id: Optional[int] = None
    registered_address: Optional[str] = Field(None, max_length=100)


class Vehicle(VehicleBase):
    vin: str

    class Config:
        from_attributes = True


class VehicleWithOwner(Vehicle):
    registered_owner: Optional[PersonOut] = None


# Simple notice / violation schemas (for potential extension)


class ViolationType(BaseModel):
    violation_code: str
    description: str

    class Config:
        from_attributes = True


class NoticeViolation(BaseModel):
    violation_code: str
    narrative: Optional[str] = None

    class Config:
        from_attributes = True


class Notice(BaseModel):
    notice_uid: int
    ticket_no: str
    notice_timestamp: datetime
    is_warning: bool
    notes: Optional[str] = None
    officer_id: int
    licence_no: str
    vin: str
    location_id: int
    district_id: int
    detachment_id: int
    violations: List[NoticeViolation] = []

    class Config:
        from_attributes = True


# Detailed notice view used by dashboards


class NoticeDetail(BaseModel):
    notice_uid: int
    ticket_no: str
    notice_timestamp: datetime
    is_warning: bool
    notes: Optional[str] = None
    officer_signature: Optional[str] = None
    driver_signature: Optional[str] = None

    officer_id: int
    officer_name: Optional[str] = None
    officer_badge_no: Optional[str] = None

    licence_no: str
    driver_name: Optional[str] = None

    vin: str
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate_no: Optional[str] = None

    location_id: int
    location_description: Optional[str] = None
    location_road: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None

    district_id: int
    district_name: Optional[str] = None
    detachment_id: int
    detachment_name: Optional[str] = None

    violations: List[NoticeViolation] = []


class NoticeViolationIn(BaseModel):
    violation_code: str = Field(..., max_length=20)
    narrative: Optional[str] = None


class NoticeCreate(BaseModel):
    ticket_no: str = Field(..., max_length=20)
    notice_timestamp: datetime
    notes: Optional[str] = None
    is_warning: bool = False
    officer_signature: Optional[str] = Field(None, max_length=100)
    driver_signature: Optional[str] = Field(None, max_length=100)
    officer_id: int
    licence_no: str = Field(..., max_length=20)
    vin: str = Field(..., max_length=17)
    location_id: int
    district_id: int
    detachment_id: int
    violations: List[NoticeViolationIn] = []


class NoticeUpdate(BaseModel):
    ticket_no: Optional[str] = Field(None, max_length=20)
    notice_timestamp: Optional[datetime] = None
    notes: Optional[str] = None
    is_warning: Optional[bool] = None
    officer_signature: Optional[str] = Field(None, max_length=100)
    driver_signature: Optional[str] = Field(None, max_length=100)
    officer_id: Optional[int] = None
    licence_no: Optional[str] = Field(None, max_length=20)
    vin: Optional[str] = Field(None, max_length=17)
    location_id: Optional[int] = None
    district_id: Optional[int] = None
    detachment_id: Optional[int] = None
    violations: Optional[List[NoticeViolationIn]] = None


# Lookups for admin forms


class OfficerOut(BaseModel):
    officer_id: int
    first_name: str
    last_name: str
    badge_no: str
    district_id: int
    detachment_id: int

    class Config:
        from_attributes = True


class DistrictOut(BaseModel):
    district_id: int
    name: str

    class Config:
        from_attributes = True


class DetachmentOut(BaseModel):
    detachment_id: int
    code: str
    name: str
    district_id: int

    class Config:
        from_attributes = True


class LocationOut(BaseModel):
    location_id: int
    description: Optional[str] = None
    road: Optional[str] = None
    mile_marker: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None

    class Config:
        from_attributes = True


# Admin dashboard aggregates


class CountByLabel(BaseModel):
    label: str
    count: int


class StatsSummary(BaseModel):
    total_citations: int
    total_warnings: int
    total_drivers: int
    total_vehicles: int
    by_violation_type: List[CountByLabel]
    by_district: List[CountByLabel]
    recent_activity: List[NoticeDetail]

