import os
from user_agents import parse
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import Base, engine, SessionLocal
import models
from api import auth as auth_router
from api import admin as admin_router
from api.auth import get_current_user_optional
from ai_utils import generate_station_summary

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FuelMap")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fuelmap-4cx.pages.dev",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from database import SessionLocal
from models import Station
import subprocess


db = SessionLocal()

count = db.query(Station).count()

if count == 0:
    subprocess.run(["python", "import_stations.py"])
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "https://fuelmap-production.up.railway.app",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SESSION_SECRET", "dev-fallback-secret"))

app.include_router(auth_router.router)
app.include_router(admin_router.router)

@app.middleware("http")
async def track_visits(request: Request, call_next):

    response = await call_next(request)


    if request.url.path.startswith("/admin"):
        return response


    db = SessionLocal()


    user_agent = request.headers.get(
        "user-agent",
        ""
    )


    ua = parse(user_agent)


    visit = models.Visit(

        ip=request.client.host,

        browser=ua.browser.family,

        device=
        ua.device.family
        if ua.device.family
        else "Desktop",

        created_at=datetime.now()
        .strftime(
            "%d.%m.%Y %H:%M"
        )

    )


    db.add(visit)

    db.commit()

    db.close()


    return response

class ReportRequest(BaseModel):
    station_id: int
    a92: bool
    a95: bool
    a98: bool
    diesel: bool
    gas: bool
    comment: str
    price_a92: float | None = None
    price_a95: float | None = None
    price_a98: float | None = None
    price_diesel: float | None = None
    price_gas: float | None = None
    has_queue: bool | None = None
    queue_rating: int | None = None


def update_station_ai_summary(station_id: int):
    """Выполняется в фоне после ответа пользователю — не блокирует /report."""
    db = SessionLocal()
    station = db.query(models.Station).filter(models.Station.id == station_id).first()

    if station is None:
        db.close()
        return

    recent_reports = (
        db.query(models.Report)
        .filter(models.Report.station_id == station_id)
        .order_by(models.Report.id.desc())
        .limit(5)
        .all()
    )

    comments = [r.comment.strip() for r in recent_reports if r.comment and r.comment.strip()]

    if comments:
        summary = generate_station_summary(station.name, comments)
        if summary:
            station.ai_summary = summary
            db.commit()

    db.close()


def station_to_dict(s):
    return {
        "id": s.id,
        "name": s.name,
        "lat": s.lat,
        "lng": s.lng,
        "status": s.status,
        "text": s.text,
        "ai_summary": s.ai_summary,
        "has_queue": s.has_queue,
        "queue_rating": s.queue_rating,
        "price_a92": s.price_a92,
        "price_a95": s.price_a95,
        "price_a98": s.price_a98,
        "price_diesel": s.price_diesel,
        "price_gas": s.price_gas,
        "fuel": {
            "a92": s.a92,
            "a95": s.a95,
            "a98": s.a98,
            "diesel": s.diesel,
            "gas": s.gas
        }
    }


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

    return station_to_dict(station)


@app.get("/stations")
def get_stations():
    db = SessionLocal()
    stations = db.query(models.Station).all()
    result = [station_to_dict(s) for s in stations]
    db.close()
    return result


@app.get("/reports/recent")
def get_recent_reports(limit: int = 20):
    db = SessionLocal()

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
            continue

        comment_count = db.query(models.Comment).filter(models.Comment.report_id == r.id).count()

        result.append({
            "id": r.id,
            "station_name": r.station.name if r.station else "АЗС",
            "author": r.author or "Аноним",
            "comment": comment,
            "created_at": r.created_at,
            "comment_count": comment_count
        })

        if len(result) >= limit:
            break

    db.close()
    return result


class CommentRequest(BaseModel):
    text: str


@app.get("/reports/{report_id}/comments")
def get_comments(report_id: int):
    db = SessionLocal()

    comments = (
        db.query(models.Comment)
        .filter(models.Comment.report_id == report_id)
        .order_by(models.Comment.id.asc())
        .all()
    )

    result = [{
        "id": c.id,
        "author": c.author,
        "text": c.text,
        "created_at": c.created_at
    } for c in comments]

    db.close()
    return result


@app.post("/reports/{report_id}/comments")
def create_comment(report_id: int, data: CommentRequest, request: Request):
    db = SessionLocal()

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report is None:
        db.close()
        raise HTTPException(status_code=404, detail="Репорт не найден")

    text = data.text.strip()
    if not text:
        db.close()
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")

    user = get_current_user_optional(request)
    author = user.name if user else "Аноним"

    comment = models.Comment(
        report_id=report_id,
        author=author,
        text=text,
        created_at=datetime.now().strftime("%d.%m.%Y %H:%M")
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)
    db.close()

    return {"id": comment.id, "author": comment.author, "text": comment.text, "created_at": comment.created_at}


@app.post("/report")
def create_report(data: ReportRequest, request: Request, background_tasks: BackgroundTasks):
    db = SessionLocal()
    station = db.query(models.Station).filter(models.Station.id == data.station_id).first()

    if station is None:
        db.close()
        return {"error": "Станция не найдена"}

    user = get_current_user_optional(request)
    author = user.name if user else "Аноним"

    report = models.Report(
        station_id=data.station_id,
        a92=data.a92,
        a95=data.a95,
        a98=data.a98,
        diesel=data.diesel,
        gas=data.gas,
        author=author,
        comment=data.comment,
        created_at=datetime.now().strftime("%d.%m.%Y %H:%M")
    )

    db.add(report)

    station.a92 = data.a92
    station.a95 = data.a95
    station.a98 = data.a98
    station.diesel = data.diesel
    station.gas = data.gas

    # цену обновляем, только если её реально прислали — иначе не затираем старую нулём
    if data.price_a92 is not None:
        station.price_a92 = data.price_a92
    if data.price_a95 is not None:
        station.price_a95 = data.price_a95
    if data.price_a98 is not None:
        station.price_a98 = data.price_a98
    if data.price_diesel is not None:
        station.price_diesel = data.price_diesel
    if data.price_gas is not None:
        station.price_gas = data.price_gas

    if data.has_queue is not None:
        station.has_queue = data.has_queue

    if data.queue_rating is not None:
        # защита от мусорных значений с фронта — сервер не доверяет клиенту границы диапазона
        station.queue_rating = max(1, min(5, data.queue_rating))

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

    # ИИ-сводка считается ПОСЛЕ ответа пользователю — не задерживает его
    if data.comment and data.comment.strip():
        background_tasks.add_task(update_station_ai_summary, data.station_id)

    return {"success": True}
