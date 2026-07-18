import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import SessionLocal
import models
from auth_utils import create_access_token, decode_access_token

security = HTTPBearer()

router = APIRouter()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


class AdminLoginRequest(BaseModel):
    password: str


class StationCreateRequest(BaseModel):
    name: str
    address: str | None = None
    lat: float
    lng: float


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None or not payload.get("admin"):
        raise HTTPException(
            status_code=403,
            detail="Доступ только для админа"
        )

    return True

@router.get("/admin/users/{user_id}")
def admin_get_user(
    user_id: int,
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if user is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден"
        )

    result = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": user.created_at,
        "via_google": user.google_id is not None,
        "is_blocked": getattr(user, "is_blocked", False)
    }

    db.close()

    return result

@router.post("/admin/login")
def admin_login(data: AdminLoginRequest):
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD не настроен на сервере")

    if data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Неверный пароль")

    token = create_access_token({"admin": True})
    return {"token": token}

@router.put("/admin/users/{user_id}/block")
def block_user(
    user_id:int,
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()

    user = (
        db.query(models.User)
        .filter(models.User.id==user_id)
        .first()
    )


    if not user:
        raise HTTPException(
            404,
            "Пользователь не найден"
        )


    user.is_blocked = True

    db.commit()
    db.close()


    return {
        "success":True
    }

@router.put("/admin/users/{user_id}/unblock")
def unblock_user(
    user_id: int,
    _: bool = Depends(get_current_admin)
):
    db = SessionLocal()

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user:
        db.close()
        raise HTTPException(404, "Пользователь не найден")

    user.is_blocked = False
    db.commit()
    db.close()

    return {"success": True}


@router.delete("/admin/users/{user_id}")
def delete_user(
    user_id:int,
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()


    user = (
        db.query(models.User)
        .filter(models.User.id==user_id)
        .first()
    )


    if not user:
        raise HTTPException(
            404,
            "Нет пользователя"
        )


    db.delete(user)

    db.commit()

    db.close()


    return {
        "success":True
    }

@router.get("/admin/comments")
def admin_comments(
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()


    reports = (
        db.query(models.Report)
        .order_by(
            models.Report.id.desc()
        )
        .limit(10)
        .all()
    )


    result=[]


    for r in reports:

        result.append({

            "author":
            r.author or "Аноним",

            "comment":
            r.comment,

 "date":
            r.created_at

        })


    db.close()


    return result


# ==============================================================
# УДАЛЕНИЕ ОТДЕЛЬНОГО КОММЕНТАРИЯ (ответа в треде под репортом)
# ==============================================================

@router.delete("/admin/comments/{comment_id}")
def admin_delete_comment(
    comment_id: int,
    _: bool = Depends(get_current_admin)
):
    db = SessionLocal()

    try:
        comment = (
            db.query(models.Comment)
            .filter(models.Comment.id == comment_id)
            .first()
        )

        if comment is None:
            raise HTTPException(status_code=404, detail="Комментарий не найден")

        db.delete(comment)
        db.commit()

        return {"success": True}

    finally:
        db.close()


# ==============================================================
# СПИСОК КОММЕНТАРИЕВ КОНКРЕТНОГО РЕПОРТА (для админки)
# ==============================================================

@router.get("/admin/reports/{report_id}/comments")
def admin_get_report_comments(
    report_id: int,
    _: bool = Depends(get_current_admin)
):
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


@router.get("/admin/stats")
def admin_stats(_: bool = Depends(get_current_admin)):

    db = SessionLocal()

    users_count = db.query(models.User).count()
    reports_count = db.query(models.Report).count()
    stations_count = db.query(models.Station).count()

    db.close()

    return {
        "users": users_count,
        "reports": reports_count,
        "stations": stations_count,
        "online": 0
    }

@router.get("/admin/visits")
def admin_visits(
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()


    total = db.query(
        models.Visit
    ).count()


    visits = (
        db.query(models.Visit)
        .order_by(
            models.Visit.id.desc()
        )
        .limit(50)
        .all()
    )


    result=[]


    for v in visits:

        result.append({

            "ip":v.ip,

            "browser":v.browser,

            "device":v.device,

            "created_at":v.created_at

        })


    db.close()


    return {

        "total":total,

        "visits":result

    }

@router.get("/admin/reports")
def admin_get_reports(_: bool = Depends(get_current_admin)):
    db = SessionLocal()

    reports = (
        db.query(models.Report)
        .order_by(models.Report.id.desc())
        .limit(200)
        .all()
    )

    result = [{
        "id": r.id,
        "station_name": r.station.name if r.station else "АЗС удалена",
        "author": r.author or "Аноним",
        "comment": r.comment or "",
        "created_at": r.created_at
    } for r in reports]

    db.close()
    return result

@router.delete("/admin/reports/{report_id}")
def admin_delete_report(
    report_id: int,
    _: bool = Depends(get_current_admin)
):
    db = SessionLocal()

    try:
        report = (
            db.query(models.Report)
            .filter(models.Report.id == report_id)
            .first()
        )

        if report is None:
            raise HTTPException(
                status_code=404,
                detail="Репорт не найден"
            )

        # Запоминаем АЗС до удаления
        station_id = report.station_id

        # Удаляем комментарии этого репорта, чтобы они не "осиротели"
        # и не привязались случайно к будущему репорту с тем же id
        db.query(models.Comment).filter(
            models.Comment.report_id == report_id
        ).delete()

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
            db.query(models.Station)
            .filter(models.Station.id == station_id)
            .first()
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
                    station.queue_rating = max(
                        1,
                        min(5, last_report.queue_rating)
                    )

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
            has_any_fuel = any([
                station.a92,
                station.a95,
                station.a98,
                station.diesel,
                station.gas
            ])

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

        return {
            "success": True
        }


    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.close()
@router.get("/admin/users")
def admin_get_users(_: bool = Depends(get_current_admin)):
    db = SessionLocal()

    users = db.query(models.User).order_by(models.User.id.desc()).all()

    result = [{
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "created_at": u.created_at,
        "via_google": u.google_id is not None
    } for u in users]

    db.close()
    return result

@router.get("/admin/stations")
def admin_get_stations(_: bool = Depends(get_current_admin)):
    db = SessionLocal()

    stations = (
        db.query(models.Station)
        .order_by(models.Station.id.desc())
        .all()
    )

    result = []

    for s in stations:
        result.append({
            "id": s.id,
            "name": s.name,
            "lat": s.lat,
            "lng": s.lng,
            "status": getattr(s, "status", "active")
        })

    db.close()

    return result


# ==============================================================
# ДОБАВЛЕНИЕ ЗАПРАВКИ ВРУЧНУЮ
# ==============================================================

@router.post("/admin/stations")
def admin_create_station(
    data: StationCreateRequest,
    _: bool = Depends(get_current_admin)
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
        has_queue=False
    )

    db.add(station)
    db.commit()
    db.refresh(station)
    db.close()

    return {"success": True, "id": station.id}


@router.delete("/admin/stations/{station_id}")
def admin_delete_station(
    station_id: int,
    _: bool = Depends(get_current_admin)
):

    db = SessionLocal()

    station = (
        db.query(models.Station)
        .filter(models.Station.id == station_id)
        .first()
    )


    if station is None:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Заправка не найдена"
        )


    db.delete(station)
    db.commit()

    db.close()


    return {
        "success": True
    }
