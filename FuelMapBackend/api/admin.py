import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import SessionLocal
import models
from auth_utils import create_access_token, decode_access_token
from presence import get_online_count
from rate_limit import check_rate_limit

security = HTTPBearer()

router = APIRouter()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Формат, в котором created_at хранится в БД как строка (см. main.py / auth.py)
VISIT_DATE_FORMAT = "%d.%m.%Y %H:%M"

# Ограничиваем размер страницы, чтобы админка случайно не запросила всю таблицу разом
MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20


class AdminLoginRequest(BaseModel):
    password: str


class StationCreateRequest(BaseModel):
    name: str
    address: str | None = None
    lat: float
    lng: float


def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None or not payload.get("admin"):
        raise HTTPException(status_code=403, detail="Доступ только для админа")

    return True


def paginate(page: int, page_size: int) -> tuple[int, int]:
    """Нормализует page/page_size и возвращает (offset, limit)."""
    page = max(1, page)
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    return (page - 1) * page_size, page_size


# ==============================================================
# ЛОГИН АДМИНА
# ==============================================================


@router.post("/admin/login")
def admin_login(data: AdminLoginRequest, request: Request):
    # Тот же лимитер, что и на /auth/login — не больше 5 попыток в минуту с одного IP,
    # иначе пароль админа можно было бы просто перебирать без ограничений.
    check_rate_limit(request, "admin_login")

    if not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=500, detail="ADMIN_PASSWORD не настроен на сервере"
        )

    if data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Неверный пароль")

    token = create_access_token({"admin": True})
    return {"token": token}


# ==============================================================
# ПОЛЬЗОВАТЕЛИ
# ==============================================================


@router.get("/admin/users")
def admin_get_users(
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    q: str | None = None,
    _: bool = Depends(get_current_admin),
):
    db = SessionLocal()

    query = db.query(models.User)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (models.User.email.ilike(like)) | (models.User.name.ilike(like))
        )

    total = query.count()

    offset, limit = paginate(page, page_size)
    users = query.order_by(models.User.id.desc()).offset(offset).limit(limit).all()

    items = [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "created_at": u.created_at,
            "last_login": u.last_login,
            "via_google": u.google_id is not None,
            "is_blocked": bool(u.is_blocked),
        }
        for u in users
    ]

    db.close()
    return {"total": total, "page": page, "page_size": limit, "items": items}


@router.get("/admin/users/{user_id}")
def admin_get_user(user_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        db.close()
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    reports_count = (
        db.query(models.Report).filter(models.Report.author == user.name).count()
    )

    result = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "via_google": user.google_id is not None,
        "is_blocked": bool(user.is_blocked),
        "reports_count": reports_count,
    }

    db.close()

    return result


@router.put("/admin/users/{user_id}/block")
def block_user(user_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        db.close()
        raise HTTPException(404, "Пользователь не найден")

    user.is_blocked = True

    db.commit()
    db.close()

    return {"success": True}


@router.put("/admin/users/{user_id}/unblock")
def unblock_user(user_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        db.close()
        raise HTTPException(404, "Пользователь не найден")

    user.is_blocked = False
    db.commit()
    db.close()

    return {"success": True}


@router.delete("/admin/users/{user_id}")
def delete_user(user_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    user = db.query(models.User).filter(models.User.id == user_id).first()

    if not user:
        db.close()
        raise HTTPException(404, "Нет пользователя")

    db.delete(user)
    db.commit()
    db.close()

    return {"success": True}


# ==============================================================
# КОММЕНТАРИИ / ОТВЕТЫ ПОД РЕПОРТАМИ
# ==============================================================


@router.get("/admin/comments")
def admin_comments(_: bool = Depends(get_current_admin)):
    db = SessionLocal()

    reports = db.query(models.Report).order_by(models.Report.id.desc()).limit(10).all()

    result = [
        {"author": r.author or "Аноним", "comment": r.comment, "date": r.created_at}
        for r in reports
    ]

    db.close()

    return result


@router.delete("/admin/comments/{comment_id}")
def admin_delete_comment(comment_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    try:
        comment = (
            db.query(models.Comment).filter(models.Comment.id == comment_id).first()
        )

        if comment is None:
            raise HTTPException(status_code=404, detail="Комментарий не найден")

        db.delete(comment)
        db.commit()

        return {"success": True}

    finally:
        db.close()


@router.get("/admin/reports/{report_id}/comments")
def admin_get_report_comments(report_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    comments = (
        db.query(models.Comment)
        .filter(models.Comment.report_id == report_id)
        .order_by(models.Comment.id.asc())
        .all()
    )

    result = [
        {"id": c.id, "author": c.author, "text": c.text, "created_at": c.created_at}
        for c in comments
    ]

    db.close()
    return result


# ==============================================================
# СТАТИСТИКА / АНАЛИТИКА
# ==============================================================


@router.get("/admin/stats")
def admin_stats(_: bool = Depends(get_current_admin)):
    db = SessionLocal()

    users_count = db.query(models.User).count()
    reports_count = db.query(models.Report).count()
    stations_count = db.query(models.Station).count()
    blocked_count = db.query(models.User).filter(models.User.is_blocked == True).count()

    db.close()

    return {
        "users": users_count,
        "reports": reports_count,
        "stations": stations_count,
        "online": get_online_count(),
        "blocked_users": blocked_count,
    }


@router.get("/admin/analytics")
def admin_analytics(_: bool = Depends(get_current_admin)):
    """Реальная аналитика посещений по дням, вместо трёх одинаковых нулей."""
    db = SessionLocal()

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # created_at хранится как строка "%d.%m.%Y %H:%M" — парсим на лету.
    # Для очень больших таблиц это стоило бы переделать на нормальный DateTime
    # столбец с индексом, но для текущего объёма данных этого достаточно.
    visits = db.query(models.Visit.created_at).all()

    today_count = 0
    week_count = 0
    month_count = 0
    by_day: dict[str, int] = {}

    for (created_at,) in visits:
        if not created_at:
            continue
        try:
            dt = datetime.strptime(created_at, VISIT_DATE_FORMAT)
        except ValueError:
            continue

        day_key = dt.strftime("%d.%m.%Y")
        by_day[day_key] = by_day.get(day_key, 0) + 1

        if dt >= today_start:
            today_count += 1
        if dt >= week_start:
            week_count += 1
        if dt >= month_start:
            month_count += 1

    # последние 7 дней с посещениями, для маленького графика
    last_days = sorted(
        by_day.items(),
        key=lambda kv: datetime.strptime(kv[0], "%d.%m.%Y"),
        reverse=True,
    )[:7]
    last_days.reverse()

    db.close()

    return {
        "today": today_count,
        "week": week_count,
        "month": month_count,
        "total": len(visits),
        "last_days": [{"date": d, "count": c} for d, c in last_days],
    }


@router.get("/admin/visits")
def admin_visits(
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    _: bool = Depends(get_current_admin),
):
    db = SessionLocal()

    total = db.query(models.Visit).count()

    offset, limit = paginate(page, page_size)
    visits = (
        db.query(models.Visit)
        .order_by(models.Visit.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        {
            "ip": v.ip,
            "browser": v.browser,
            "device": v.device,
            "created_at": v.created_at,
        }
        for v in visits
    ]

    db.close()

    return {"total": total, "page": page, "page_size": limit, "items": items}


# ==============================================================
# РЕПОРТЫ
# ==============================================================


@router.get("/admin/reports")
def admin_get_reports(
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    _: bool = Depends(get_current_admin),
):
    db = SessionLocal()

    query = db.query(models.Report)
    total = query.count()

    offset, limit = paginate(page, page_size)
    reports = query.order_by(models.Report.id.desc()).offset(offset).limit(limit).all()

    items = [
        {
            "id": r.id,
            "station_id": r.station_id,
            "station_name": r.station.name if r.station else "АЗС удалена",
            "author": r.author or "Аноним",
            "comment": r.comment or "",
            "created_at": r.created_at,
            "has_queue": r.has_queue,
            "queue_rating": r.queue_rating,
        }
        for r in reports
    ]

    db.close()
    return {"total": total, "page": page, "page_size": limit, "items": items}


@router.delete("/admin/reports/{report_id}")
def admin_delete_report(report_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    try:
        report = db.query(models.Report).filter(models.Report.id == report_id).first()

        if report is None:
            raise HTTPException(status_code=404, detail="Репорт не найден")

        # Запоминаем АЗС до удаления
        station_id = report.station_id

        # Удаляем комментарии этого репорта, чтобы они не "осиротели"
        # и не привязались случайно к будущему репорту с тем же id
        db.query(models.Comment).filter(models.Comment.report_id == report_id).delete()

        db.delete(report)
        db.flush()

        # Ищем последний оставшийся репорт этой АЗС
        last_report = (
            db.query(models.Report)
            .filter(models.Report.station_id == station_id)
            .order_by(models.Report.id.desc())
            .first()
        )

        station = (
            db.query(models.Station).filter(models.Station.id == station_id).first()
        )

        if station:
            if last_report:
                # Применяем последний активный репорт
                station.a92 = last_report.a92
                station.a95 = last_report.a95
                station.a98 = last_report.a98
                station.diesel = last_report.diesel
                station.gas = last_report.gas

                if last_report.price_a92 is not None:
                    station.price_a92 = last_report.price_a92

                if last_report.price_a95 is not None:
                    station.price_a95 = last_report.price_a95

                if last_report.price_a98 is not None:
                    station.price_a98 = last_report.price_a98

                if last_report.price_diesel is not None:
                    station.price_diesel = last_report.price_diesel

                if last_report.price_gas is not None:
                    station.price_gas = last_report.price_gas

                if last_report.has_queue is not None:
                    station.has_queue = last_report.has_queue

                if last_report.queue_rating is not None:
                    station.queue_rating = max(1, min(5, last_report.queue_rating))

            else:
                # Репортов больше нет — возвращаем состояние по умолчанию
                station.a92 = False
                station.a95 = False
                station.a98 = False
                station.diesel = False
                station.gas = False

                station.has_queue = False
                station.queue_rating = None

            # Обновляем статус
            has_any_fuel = any(
                [station.a92, station.a95, station.a98, station.diesel, station.gas]
            )

            if has_any_fuel:
                station.status = "green"
                station.text = "Топливо есть"

            elif station.has_queue:
                station.status = "orange"
                station.text = "Топлива нет, но есть очередь"

            else:
                station.status = "gray"
                station.text = "Топлива нет"

        db.commit()

        return {"success": True}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()

@router.get("/admin/users")
def admin_get_users(page: int = 1, page_size: int = 20, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    # Считаем общее количество для пагинации фронтенда
    total_count = db.query(models.User).count()

    # Считаем, сколько записей нужно пропустить
    offset = (page - 1) * page_size

    # Запрашиваем только нужную страницу с сортировкой
    users = db.query(models.User).order_by(models.User.id.desc()).offset(offset).limit(page_size).all()


# ==============================================================
# ЗАПРАВКИ
# ==============================================================

    db.close()
    
    # Возвращаем структуру для фронтенда
    return {
    "items": result,
    "total": total_count,
    "page": page,
    "page_size": page_size
}


@router.get("/admin/stations")
def admin_get_stations(
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
    q: str | None = None,
    status: str | None = None,
    _: bool = Depends(get_current_admin),
):
    db = SessionLocal()

    query = db.query(models.Station)

    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (models.Station.name.ilike(like)) | (models.Station.address.ilike(like))
        )

    if status:
        query = query.filter(models.Station.status == status)

    total = query.count()

    offset, limit = paginate(page, page_size)
    stations = (
        query.order_by(models.Station.id.desc()).offset(offset).limit(limit).all()
    )

    items = [
        {
            "id": s.id,
            "name": s.name,
            "address": s.address,
            "lat": s.lat,
            "lng": s.lng,
            "status": getattr(s, "status", "active"),
            "fuel": {
                "a92": bool(s.a92),
                "a95": bool(s.a95),
                "a98": bool(s.a98),
                "diesel": bool(s.diesel),
                "gas": bool(s.gas),
            },
            "prices": {
                "a92": s.price_a92,
                "a95": s.price_a95,
                "a98": s.price_a98,
                "diesel": s.price_diesel,
                "gas": s.price_gas,
            },
            "has_queue": s.has_queue,
            "queue_rating": s.queue_rating,
            "updated_at": (
                s.updated_at.strftime("%d.%m.%Y %H:%M") if s.updated_at else None
            ),
        }
        for s in stations
    ]

    db.close()

    return {"total": total, "page": page, "page_size": limit, "items": items}


@router.post("/admin/stations")
def admin_create_station(
    data: StationCreateRequest, _: bool = Depends(get_current_admin)
):
    db = SessionLocal()

    station = models.Station(
        name=data.name,
        address=data.address,
        lat=data.lat,
        lng=data.lng,
        status="gray",
        text="Топлива нет",
        a92=False,
        a95=False,
        a98=False,
        diesel=False,
        gas=False,
        has_queue=False,
    )

    db.add(station)
    db.commit()
    db.refresh(station)
    db.close()

    return {"success": True, "id": station.id}


@router.delete("/admin/stations/{station_id}")
def admin_delete_station(station_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    station = db.query(models.Station).filter(models.Station.id == station_id).first()

    if station is None:
        db.close()
        raise HTTPException(status_code=404, detail="Заправка не найдена")

    db.delete(station)
    db.commit()
    db.close()

    return {"success": True}
