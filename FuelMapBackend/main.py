from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

from database import Base, engine, SessionLocal
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FuelMap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReportRequest(BaseModel):
    station_id: int
    a92: bool
    a95: bool
    a98: bool
    diesel: bool
    gas: bool
    comment: str
    author: str = "Аноним"

@app.get("/")
def root():
    return {"status": "FuelMap Backend"}

@app.get("/station/{station_id}")
def get_station(station_id: int):
    db = SessionLocal()
    station = db.query(models.Station).filter(models.Station.id == station_id).first()
    db.close()

    if station is None:
        return {"error": "Станция не найдена"}

    return {
        "id": station.id,
        "name": station.name,
        "lat": station.lat,
        "lng": station.lng,
        "status": station.status,
        "text": station.text,
        "fuel": {
            "a92": station.a92,
            "a95": station.a95,
            "a98": station.a98,
            "diesel": station.diesel,
            "gas": station.gas
        }
    }

@app.get("/stations")
def get_stations():
    db = SessionLocal()
    stations = db.query(models.Station).all()

    result = [{
        "id": s.id,
        "name": s.name,
        "lat": s.lat,
        "lng": s.lng,
        "status": s.status,
        "text": s.text,
        "fuel": {
            "a92": s.a92,
            "a95": s.a95,
            "a98": s.a98,
            "diesel": s.diesel,
            "gas": s.gas
        }
    } for s in stations]

    db.close()
    return result

@app.get("/reports/recent")
def get_recent_reports(limit: int = 20):
    db = SessionLocal()

    # берём с запасом — часть репортов отсеется из-за пустых комментов
    reports = (
        db.query(models.Report)
        .order_by(models.Report.id.desc())
        .limit(100)
        .all()
    )

    result = []

    for r in reports:
        comment = (r.comment or "").strip()

        if not comment:
            continue  # без комментария в "Недавнее" не попадает

        result.append({
            "id": r.id,
            "station_name": r.station.name if r.station else "АЗС",
            "author": r.author or "Аноним",
            "comment": comment,
            "created_at": r.created_at
        })

        if len(result) >= limit:
            break

    db.close()
    return result

@app.post("/report")
def create_report(data: ReportRequest):
    db = SessionLocal()
    station = db.query(models.Station).filter(models.Station.id == data.station_id).first()

    if station is None:
        db.close()
        return {"error": "Станция не найдена"}

    report = models.Report(
        station_id=data.station_id,
        a92=data.a92,
        a95=data.a95,
        a98=data.a98,
        diesel=data.diesel,
        gas=data.gas,
        author=data.author.strip() or "Аноним",
        comment=data.comment,
        created_at=datetime.now().strftime("%d.%m.%Y %H:%M")
    )

    db.add(report)

    station.a92 = data.a92
    station.a95 = data.a95
    station.a98 = data.a98
    station.diesel = data.diesel
    station.gas = data.gas

    count = sum([data.a92, data.a95, data.a98, data.diesel, data.gas])

    if count >= 4:
        station.status = "green"
        station.text = "Топливо есть"
    elif count >= 2:
        station.status = "orange"
        station.text = "Есть не всё топливо"
    else:
        station.status = "red"
        station.text = "Почти пусто"

    db.commit()
    db.close()

    return {"success": True}