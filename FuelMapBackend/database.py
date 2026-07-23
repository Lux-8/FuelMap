import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# На Railway задаём переменную окружения DB_PATH=/data/fuelmap.db —
# /data это постоянный Volume, переживает деплои.
# Локально при разработке переменной нет — используется файл рядом со скриптом.
DB_PATH = os.getenv("DB_PATH", "fuelmap.db")

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
