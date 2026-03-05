from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, Integer, Numeric, String, create_engine
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import declarative_base, sessionmaker

from bot.constants import get_sync_db_url


Base = declarative_base()


class Driver(Base):
    __tablename__ = "driver_driver"

    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone_number = Column(String(15), nullable=False, unique=True)
    telegram_id = Column(BigInteger, unique=True)
    has_vehicle = Column(Boolean, default=False, nullable=False)
    is_active_driver = Column(Boolean, default=False, nullable=False)


class Vehicle(Base):
    __tablename__ = "vehicle_vehicle"

    id = Column(PG_UUID(as_uuid=True), primary_key=True)
    model = Column(String(50), nullable=False)
    manufacturer = Column(String(50), nullable=False)
    year = Column(Integer, nullable=False)
    cost = Column(Numeric(10, 2), nullable=False)
    vin_number = Column(String(17), nullable=False, unique=True)
    car_number = Column(String(10), nullable=False, unique=True)
    initial_km = Column(Integer, default=0, nullable=False)


class VehicleOwner(Base):
    __tablename__ = "vehicle_vehicleowner"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id = Column(PG_UUID(as_uuid=True), ForeignKey("vehicle_vehicle.id"), nullable=False, unique=True)
    driver_id = Column(PG_UUID(as_uuid=True), ForeignKey("driver_driver.id"), nullable=False)


class FleetVehicleRegulationSchema(Base):
    __tablename__ = "fleet_management_fleetvehicleregulationschema"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(155), nullable=False)
    title_pl = Column(String(155), default="")
    title_uk = Column(String(155), default="")
    is_default = Column(Boolean, default=False, nullable=False)


class FleetVehicleRegulationItem(Base):
    __tablename__ = "fleet_management_fleetvehicleregulationitem"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    schema_id = Column(BigInteger, ForeignKey("fleet_management_fleetvehicleregulationschema.id"), nullable=False)
    title = Column(String(155), nullable=False)
    title_pl = Column(String(155), default="")
    title_uk = Column(String(155), default="")
    every_km = Column(Integer, nullable=False)
    notify_before_km = Column(Integer, default=500, nullable=False)


class FleetVehicleRegulation(Base):
    __tablename__ = "fleet_management_fleetvehicleregulation"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vehicle_id = Column(PG_UUID(as_uuid=True), ForeignKey("vehicle_vehicle.id"), nullable=False)
    schema_id = Column(BigInteger, ForeignKey("fleet_management_fleetvehicleregulationschema.id"), nullable=False)


class FleetVehicleRegulationEntry(Base):
    __tablename__ = "fleet_management_fleetvehicleregulationentry"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    regulation_id = Column(BigInteger, ForeignKey("fleet_management_fleetvehicleregulation.id"), nullable=False)
    item_id = Column(BigInteger, ForeignKey("fleet_management_fleetvehicleregulationitem.id"), nullable=False)
    last_done_km = Column(Integer, default=0, nullable=False)


engine = create_engine(get_sync_db_url(), future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_driver_by_phone(phone_number: str) -> Optional[Driver]:
    with SessionLocal() as session:
        return (
            session.query(Driver)
            .filter(Driver.phone_number == phone_number)
            .one_or_none()
        )


def get_driver_by_telegram_id(telegram_id: int, active_only: bool = True) -> Optional[Driver]:
    with SessionLocal() as session:
        q = session.query(Driver).filter(Driver.telegram_id == telegram_id)
        if active_only:
            q = q.filter(Driver.is_active_driver.is_(True))
        return q.one_or_none()


def get_vehicles_for_driver(telegram_id: int) -> List[Vehicle]:
    with SessionLocal() as session:
        driver = (
            session.query(Driver)
            .filter(Driver.telegram_id == telegram_id)
            .one_or_none()
        )
        if driver is None:
            return []
        return (
            session.query(Vehicle)
            .join(VehicleOwner, VehicleOwner.vehicle_id == Vehicle.id)
            .filter(VehicleOwner.driver_id == driver.id)
            .all()
        )


def get_vehicle_current_km(vehicle_id: UUID) -> Optional[int]:
    """Returns current odometer (km) for the vehicle. Uses initial_km as current mileage."""
    with SessionLocal() as session:
        v = (
            session.query(Vehicle)
            .filter(Vehicle.id == vehicle_id)
            .one_or_none()
        )
        return int(v.initial_km) if v is not None else None


def activate_driver_for_telegram(
    *, phone_number: str, telegram_id: int
) -> Optional[Driver]:
    with SessionLocal() as session:
        driver: Optional[Driver] = (
            session.query(Driver)
            .filter(Driver.phone_number == phone_number)
            .one_or_none()
        )

        if driver is None:
            return None

        driver.telegram_id = telegram_id
        driver.is_active_driver = True
        session.commit()
        session.refresh(driver)

        return driver


def get_regulation_plan_for_vehicle(vehicle_id: UUID) -> List[dict]:
    """
    Returns list of regulation plan rows for the vehicle.
    Each dict: title, every_km, notify_before_km, last_done_km, next_due_km.
    If vehicle has no regulation assigned, returns default schema items with last_done_km/next_due_km None.
    """
    with SessionLocal() as session:
        reg = (
            session.query(FleetVehicleRegulation)
            .filter(FleetVehicleRegulation.vehicle_id == vehicle_id)
            .one_or_none()
        )

        if reg:
            entries = (
                session.query(FleetVehicleRegulationEntry, FleetVehicleRegulationItem)
                .join(
                    FleetVehicleRegulationItem,
                    FleetVehicleRegulationEntry.item_id == FleetVehicleRegulationItem.id,
                )
                .filter(FleetVehicleRegulationEntry.regulation_id == reg.id)
                .all()
            )
            result = []
            for entry, item in entries:
                title = (item.title_uk or item.title).strip() or item.title
                next_km = entry.last_done_km + item.every_km
                result.append({
                    "title": title,
                    "every_km": item.every_km,
                    "notify_before_km": item.notify_before_km,
                    "last_done_km": entry.last_done_km,
                    "next_due_km": next_km,
                })
            return result

        default_schema = (
            session.query(FleetVehicleRegulationSchema)
            .filter(FleetVehicleRegulationSchema.is_default.is_(True))
            .one_or_none()
        )
        if not default_schema:
            return []

        items = (
            session.query(FleetVehicleRegulationItem)
            .filter(FleetVehicleRegulationItem.schema_id == default_schema.id)
            .all()
        )
        return [
            {
                "title": (i.title_uk or i.title).strip() or i.title,
                "every_km": i.every_km,
                "notify_before_km": i.notify_before_km,
                "last_done_km": None,
                "next_due_km": None,
            }
            for i in items
        ]

