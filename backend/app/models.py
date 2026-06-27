from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    DECIMAL,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class Person(Base):
    __tablename__ = "Person"

    person_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    last_name = Column(String(50), nullable=False, index=True)
    first_name = Column(String(50), nullable=False)
    address_line = Column(String(100))
    city = Column(String(50))
    state = Column(String(2), index=True)
    zip_code = Column(String(10))
    birth_date = Column(Date)
    height = Column(Numeric(5, 2))
    weight = Column(Numeric(5, 2))
    eye_colour = Column(String(20))

    driver_licenses = relationship("DriverLicense", back_populates="person")
    vehicles = relationship("Vehicle", back_populates="registered_owner")
    user_accounts = relationship("UserAccount", back_populates="person")


class DriverLicense(Base):
    __tablename__ = "DriverLicense"

    licence_no = Column(String(20), primary_key=True, index=True)
    state = Column(String(2), nullable=False, index=True)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("Person.person_id"), nullable=False, index=True)

    person = relationship("Person", back_populates="driver_licenses")


class Vehicle(Base):
    __tablename__ = "Vehicle"

    vin = Column(String(17), primary_key=True, index=True)
    plate_no = Column(String(10), nullable=False)
    plate_state = Column(String(2), nullable=False)
    colour = Column(String(30))
    make = Column(String(50))
    model = Column(String(50))
    vehicle_year = Column(Integer)
    vehicle_type = Column(String(30))
    registered_owner_person_id = Column(
        Integer, ForeignKey("Person.person_id"), nullable=False, index=True
    )
    registered_address = Column(String(100))

    registered_owner = relationship("Person", back_populates="vehicles")
    notices = relationship("Notice", back_populates="vehicle")


class District(Base):
    __tablename__ = "District"

    district_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)

    detachments = relationship("Detachment", back_populates="district")
    officers = relationship("Officer", back_populates="district")
    notices = relationship("Notice", back_populates="district")


class Detachment(Base):
    __tablename__ = "Detachment"

    detachment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(10), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    district_id = Column(Integer, ForeignKey("District.district_id"), nullable=False)

    district = relationship("District", back_populates="detachments")
    officers = relationship("Officer", back_populates="detachment")
    notices = relationship("Notice", back_populates="detachment")

    __table_args__ = (
        UniqueConstraint("code", "district_id", name="unique_code_district"),
    )


class Officer(Base):
    __tablename__ = "Officer"

    officer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    badge_no = Column(String(20), nullable=False, unique=True, index=True)
    district_id = Column(Integer, ForeignKey("District.district_id"), nullable=False)
    detachment_id = Column(Integer, ForeignKey("Detachment.detachment_id"), nullable=False)

    district = relationship("District", back_populates="officers")
    detachment = relationship("Detachment", back_populates="officers")
    notices = relationship("Notice", back_populates="officer")


class Location(Base):
    __tablename__ = "Location"

    location_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    description = Column(String(200))
    road = Column(String(100))
    mile_marker = Column(DECIMAL(8, 2))
    city = Column(String(50))
    state = Column(String(2))

    notices = relationship("Notice", back_populates="location")


class ViolationType(Base):
    __tablename__ = "ViolationType"

    violation_code = Column(String(20), primary_key=True, index=True)
    description = Column(String(255), nullable=False)

    notice_violations = relationship("NoticeViolation", back_populates="violation_type")


class Notice(Base):
    __tablename__ = "Notice"

    notice_uid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_no = Column(String(20), nullable=False, unique=True, index=True)
    notice_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text)
    is_warning = Column(Boolean, default=False, nullable=False)
    officer_signature = Column(String(100))
    driver_signature = Column(String(100))
    officer_id = Column(Integer, ForeignKey("Officer.officer_id"), nullable=False)
    licence_no = Column(String(20), ForeignKey("DriverLicense.licence_no"), nullable=False)
    vin = Column(String(17), ForeignKey("Vehicle.vin"), nullable=False)
    location_id = Column(Integer, ForeignKey("Location.location_id"), nullable=False)
    district_id = Column(Integer, ForeignKey("District.district_id"), nullable=False)
    detachment_id = Column(Integer, ForeignKey("Detachment.detachment_id"), nullable=False)

    officer = relationship("Officer", back_populates="notices")
    driver_license = relationship("DriverLicense")
    vehicle = relationship("Vehicle", back_populates="notices")
    location = relationship("Location", back_populates="notices")
    district = relationship("District", back_populates="notices")
    detachment = relationship("Detachment", back_populates="notices")
    notice_violations = relationship("NoticeViolation", back_populates="notice")


class NoticeViolation(Base):
    __tablename__ = "NoticeViolation"

    notice_uid = Column(
        Integer, ForeignKey("Notice.notice_uid"), primary_key=True, nullable=False
    )
    violation_code = Column(
        String(20),
        ForeignKey("ViolationType.violation_code"),
        primary_key=True,
        nullable=False,
    )
    narrative = Column(Text)

    notice = relationship("Notice", back_populates="notice_violations")
    violation_type = relationship("ViolationType", back_populates="notice_violations")


class UserAccount(Base):
    __tablename__ = "UserAccount"

    username = Column(String(50), primary_key=True, index=True)
    role = Column(String(30), nullable=False, index=True)
    person_id = Column(Integer, ForeignKey("Person.person_id"), nullable=False, index=True)

    person = relationship("Person", back_populates="user_accounts")


class User(Base):
    # Application-level login table. Kept separate from the domain
    # UserAccount table so we don't have to retrofit hashed_password etc.
    __tablename__ = "app_users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    role = Column(String(30), default="driver", nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email = Column(String(120), index=True)
    phone = Column(String(30))
    person_id = Column(Integer, ForeignKey("Person.person_id"), nullable=True, index=True)

    person = relationship("Person")

