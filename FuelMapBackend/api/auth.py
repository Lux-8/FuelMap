import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from authlib.integrations.starlette_client import OAuth

from database import SessionLocal
import models
from auth_utils import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL")

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Не авторизован")

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")

    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    db.close()

    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    return user


def get_current_user_optional(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)

    if payload is None:
        return None

    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == payload["sub"]).first()
    db.close()

    return user


@router.post("/auth/register")
def register(data: RegisterRequest):
    db = SessionLocal()

    email = data.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == email).first()

    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Этот email уже занят")

    if len(data.password) < 6:
        db.close()
        raise HTTPException(status_code=400, detail="Пароль должен быть не короче 6 символов")

    user = models.User(
        email=email,
        name=data.name.strip() or email.split("@")[0],
        password_hash=hash_password(data.password),
        created_at=datetime.now().strftime("%d.%m.%Y %H:%M")
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    db.close()

    return {"token": token, "name": user.name, "email": user.email}


@router.post("/auth/login")
def login(data: LoginRequest):
    db = SessionLocal()
    email = data.email.strip().lower()

    user = db.query(models.User).filter(models.User.email == email).first()

    if user is None or user.password_hash is None or not verify_password(data.password, user.password_hash):
        db.close()
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_access_token({"sub": str(user.id)})
    db.close()

    return {"token": token, "name": user.name, "email": user.email}


@router.get("/auth/me")
def me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email}


@router.get("/auth/google/login")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")

    if userinfo is None:
        raise HTTPException(status_code=400, detail="Google не вернул данные пользователя")

    db = SessionLocal()

    user = db.query(models.User).filter(models.User.google_id == userinfo["sub"]).first()

    if user is None:
        user = db.query(models.User).filter(models.User.email == userinfo["email"]).first()

        if user is None:
            user = models.User(
                email=userinfo["email"],
                name=userinfo.get("name", userinfo["email"].split("@")[0]),
                google_id=userinfo["sub"],
                created_at=datetime.now().strftime("%d.%m.%Y %H:%M")
            )
            db.add(user)
        else:
            user.google_id = userinfo["sub"]

        db.commit()
        db.refresh(user)

    jwt_token = create_access_token({"sub": str(user.id)})
    db.close()

    return RedirectResponse(f"{FRONTEND_URL}?token={jwt_token}")
