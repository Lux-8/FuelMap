"""
Запусти: python check_setup.py
Проверяет пакеты, .env и файлы проекта. Ничего не запускает и не меняет.
"""

import importlib.util
import os

print("=" * 50)
print("FUELMAP BACKEND — ПРОВЕРКА КОНФИГУРАЦИИ")
print("=" * 50)

ok = True

# 1. Проверка пакетов
print("\n[1] Пакеты Python:")
packages = ["fastapi", "uvicorn", "sqlalchemy", "jwt", "passlib",
            "authlib", "itsdangerous", "multipart", "dotenv"]

for pkg in packages:
    found = importlib.util.find_spec(pkg) is not None
    status = "OK" if found else "ОТСУТСТВУЕТ"
    if not found:
        ok = False
    print(f"    {pkg:15s} — {status}")

# 2. Проверка .env
print("\n[2] Переменные окружения (.env):")

if not os.path.exists(".env"):
    print("    .env файл НЕ НАЙДЕН в текущей папке")
    ok = False
else:
    from dotenv import load_dotenv
    load_dotenv()

    required_vars = ["JWT_SECRET", "SESSION_SECRET", "FRONTEND_URL"]
    optional_vars = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]

    for var in required_vars:
        value = os.getenv(var)
        if not value:
            print(f"    {var:20s} — ПУСТО (обязательно нужно заполнить)")
            ok = False
        else:
            print(f"    {var:20s} — заполнено")

    for var in optional_vars:
        value = os.getenv(var)
        if not value:
            print(f"    {var:20s} — пусто (Google-вход не будет работать, email/пароль будет)")
        else:
            print(f"    {var:20s} — заполнено")

# 3. Проверка файлов проекта на наличие ключевых меток
print("\n[3] Файлы проекта:")

checks = [
    ("models.py", "class User"),
    ("main.py", "include_router"),
    ("api/auth.py", "def register"),
    ("auth_utils.py", "def create_access_token"),
]

for filename, marker in checks:
    if not os.path.exists(filename):
        print(f"    {filename:20s} — ФАЙЛ НЕ НАЙДЕН")
        ok = False
        continue

    with open(filename, encoding="utf-8") as f:
        content = f.read()

    if marker in content:
        print(f"    {filename:20s} — OK")
    else:
        print(f"    {filename:20s} — файл есть, но нет '{marker}' (старая версия?)")
        ok = False

print("\n" + "=" * 50)
if ok:
    print("ВСЁ ГОТОВО. Можно запускать: uvicorn main:app --reload")
else:
    print("ЕСТЬ ПРОБЛЕМЫ ВЫШЕ — исправь их перед запуском backend.")
print("=" * 50)
