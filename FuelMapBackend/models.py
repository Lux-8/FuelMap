from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import Boolean
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from database import Base


from database import Base

class Visit(Base):

    __tablename__ = "visits"


    id = Column(
        Integer,
        primary_key=True
    )


    user_id = Column(
        Integer,
        nullable=True
    )


    ip = Column(
        String,
        nullable=True
    )


    browser = Column(
        String,
        nullable=True
    )


    device = Column(
        String,
        nullable=True
    )


    created_at = Column(
        String
    )

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    address = Column(String, nullable=True)
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String)
    text = Column(String)
    a92 = Column(Boolean)
    a95 = Column(Boolean)
    a98 = Column(Boolean)
    diesel = Column(Boolean)
    gas = Column(Boolean)
    old_a92 = Column(Boolean)
    old_a95 = Column(Boolean)
    old_a98 = Column(Boolean)
    old_diesel = Column(Boolean)
    old_gas = Column(Boolean)
    old_status = Column(String)
    old_text = Column(String)	
    ai_summary = Column(String, nullable=True)
    price_a92 = Column(Float, nullable=True)
    price_a95 = Column(Float, nullable=True)
    price_a98 = Column(Float, nullable=True)
    price_diesel = Column(Float, nullable=True)
    price_gas = Column(Float, nullable=True)
    has_queue = Column(Boolean, nullable=True)
    queue_rating = Column(Integer, nullable=True)

    updated_at = Column(
    DateTime,
    default=datetime.utcnow,
    onupdate=datetime.utcnow
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    password_hash = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    created_at = Column(String)
    is_blocked = Column(Boolean, default=False)
    last_login = Column(String, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)

    station_id = Column(Integer, ForeignKey("stations.id"))

    # Новое состояние из репорта
    a92 = Column(Boolean)
    a95 = Column(Boolean)
    a98 = Column(Boolean)
    diesel = Column(Boolean)
    gas = Column(Boolean)

    # Цены из репорта
    price_a92 = Column(Float, nullable=True)
    price_a95 = Column(Float, nullable=True)
    price_a98 = Column(Float, nullable=True)
    price_diesel = Column(Float, nullable=True)
    price_gas = Column(Float, nullable=True)

    has_queue = Column(Boolean, nullable=True)
    queue_rating = Column(Integer, nullable=True)

    # Старое состояние станции до репорта
    old_a92 = Column(Boolean)
    old_a95 = Column(Boolean)
    old_a98 = Column(Boolean)
    old_diesel = Column(Boolean)
    old_gas = Column(Boolean)

    old_status = Column(String)
    old_text = Column(String)

    author = Column(String, default="Аноним")
    comment = Column(String)
    created_at = Column(String)

    station = relationship("Station")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"))

    author = Column(String, default="Аноним")
    text = Column(String)
    created_at = Column(String)

    report = relationship("Report")


class EasterEgg(Base):
    __tablename__ = "easter_egg"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, nullable=True)

    status = Column(String, nullable=True)

    claimed_at = Column(
        DateTime,
        default=datetime.utcnow
    )
