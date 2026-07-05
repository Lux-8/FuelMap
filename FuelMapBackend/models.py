from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import Boolean
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String)
    text = Column(String)
    a92 = Column(Boolean)
    a95 = Column(Boolean)
    a98 = Column(Boolean)
    diesel = Column(Boolean)
    gas = Column(Boolean)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("stations.id"))

    a92 = Column(Boolean)
    a95 = Column(Boolean)
    a98 = Column(Boolean)
    diesel = Column(Boolean)
    gas = Column(Boolean)

    author = Column(String, default="Аноним")
    comment = Column(String)
    created_at = Column(String)

    station = relationship("Station")