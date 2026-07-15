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


const online =
document.getElementById("statOnline");


if(online)
    online.textContent =
    data.online ?? 0;

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
def admin_delete_report(report_id: int, _: bool = Depends(get_current_admin)):
    db = SessionLocal()

    report = db.query(models.Report).filter(models.Report.id == report_id).first()

    if report is None:
        db.close()
        raise HTTPException(status_code=404, detail="Репорт не найден")

    db.delete(report)
    db.commit()
    db.close()

    return {"success": True}


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
