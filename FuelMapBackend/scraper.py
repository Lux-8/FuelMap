"""
Два режима работы:

1. АВТОМАТИЧЕСКИЙ — тянет посты напрямую с t.me/s/<канал>. Требует, чтобы
   Python имел прямой сетевой доступ к Telegram (не заблокирован провайдером).

2. РУЧНОЙ (fallback) — если автоматический недоступен (блокировка сети),
   создай файл posts.txt рядом со скриптом, вставь туда тексты постов из
   Telegram (по одному посту, разделяя пустой строкой с "---" между ними),
   скрипт прочитает их из файла вместо скачивания.

Запуск: python scraper.py
Требует GROQ_API_KEY в .env.
"""

import os
import json
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from difflib import SequenceMatcher

load_dotenv()

from database import SessionLocal
import models
from openai import OpenAI

# ==== НАСТРОЙКИ ====

CHANNELS = [
    "torzhokobh",
]

MANUAL_POSTS_FILE = "posts.txt"

MATCH_THRESHOLD = 0.6

# ==== ИИ-КЛИЕНТ (Groq, OpenAI-совместимый) ====

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1"
)


def fetch_telegram_posts(channel: str, limit: int = 20) -> list:
    url = f"https://t.me/s/{channel}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[Автоматическая загрузка недоступна: {channel}] {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    messages = soup.select(".tgme_widget_message_text")

    posts = [m.get_text(separator=" ", strip=True) for m in messages]
    return posts[-limit:]


def load_manual_posts(filepath: str) -> list:
    if not os.path.exists(filepath):
        return []

    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    posts = [p.strip() for p in content.split("---") if p.strip()]
    return posts


def extract_fuel_info(post_text: str) -> dict | None:
    prompt = f"""Вот пост из паблика про заправки:

"{post_text}"

Если в посте ЕСТЬ конкретная информация про конкретную заправку (название/адрес,
наличие топлива, цена) — верни JSON СТРОГО в этом формате, без пояснений:

{{
  "station_name": "название или адрес заправки как написано в посте",
  "a92": true/false/null,
  "a95": true/false/null,
  "a98": true/false/null,
  "diesel": true/false/null,
  "gas": true/false/null,
  "price_a92": число или null,
  "price_a95": число или null,
  "price_a98": число или null,
  "price_diesel": число или null,
  "price_gas": число или null
}}

null — если про этот вид топлива в посте ничего не сказано.
Если пост НЕ содержит конкретной информации про конкретную заправку (общие
новости, реклама, обсуждения) — верни просто: null

Отвечай ТОЛЬКО JSON или null, без markdown-разметки, без пояснений."""

    raw = None
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1,
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        if raw.lower() == "null" or not raw:
            return None

        return json.loads(raw)

    except json.JSONDecodeError as e:
        print(f"[Ошибка разбора JSON от ИИ] {e} — сырой ответ: {raw}")
        return None
    except Exception as e:
        print(f"[Ошибка запроса к ИИ] {e}")
        return None


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def find_matching_station(db, station_name_from_post: str):
    all_stations = db.query(models.Station).all()

    best_match = None
    best_score = 0.0

    for s in all_stations:
        score = similarity(station_name_from_post, s.name)
        if score > best_score:
            best_score = score
            best_match = s

    if best_score >= MATCH_THRESHOLD:
        return best_match, best_score

    return None, best_score


def apply_update(db, station, data: dict):
    changed = False

    fuel_fields = ["a92", "a95", "a98", "diesel", "gas"]
    price_fields = ["price_a92", "price_a95", "price_a98", "price_diesel", "price_gas"]

    for field in fuel_fields:
        value = data.get(field)
        if value is not None:
            setattr(station, field, value)
            changed = True

    for field in price_fields:
        value = data.get(field)
        if value is not None:
            setattr(station, field, value)
            changed = True

    if changed:
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

    return changed


def process_posts(posts: list, source_label: str):
    db = SessionLocal()
    updated_count = 0
    skipped_count = 0

    for post_text in posts:
        if len(post_text) < 15:
            continue

        info = extract_fuel_info(post_text)

        if info is None:
            continue

        station_name = info.get("station_name", "")
        if not station_name:
            continue

        match, score = find_matching_station(db, station_name)

        if match is None:
            print(
                f"[{source_label}] Не найдено совпадение для '{station_name}' (лучший score: {score:.2f}) — пропущено"
            )
            skipped_count += 1
            continue

        changed = apply_update(db, match, info)

        if changed:
            print(
                f"[{source_label}] Обновлено: '{match.name}' <- пост про '{station_name}' (совпадение {score:.2f})"
            )
            updated_count += 1

    db.close()
    return updated_count, skipped_count


def main():
    if not os.getenv("GROQ_API_KEY"):
        print(
            "ОШИБКА: GROQ_API_KEY не найден в .env — без него ИИ не сможет разбирать посты."
        )
        return

    total_updated = 0
    total_skipped = 0
    any_posts_found = False

    # Пробуем автоматически
    for channel in CHANNELS:
        print(f"\n=== Читаю Telegram-канал (авто): {channel} ===")
        posts = fetch_telegram_posts(channel)
        print(f"Найдено постов: {len(posts)}")

        if posts:
            any_posts_found = True
            print(f"Пример первого поста:\n---\n{posts[0][:300]}\n---")
            updated, skipped = process_posts(posts, f"tg:{channel}")
            total_updated += updated
            total_skipped += skipped

    # Если авто не сработало — пробуем ручной файл
    if not any_posts_found:
        print(f"\n=== Авто-загрузка не дала постов. Проверяю {MANUAL_POSTS_FILE} ===")
        manual_posts = load_manual_posts(MANUAL_POSTS_FILE)

        if not manual_posts:
            print(
                f"Файл {MANUAL_POSTS_FILE} не найден или пуст.\n"
                f"Создай его рядом со scraper.py, вставь туда тексты постов из Telegram,\n"
                f"разделяя посты строкой '---' на отдельной строке, и запусти скрипт снова."
            )
        else:
            print(f"Найдено постов в файле: {len(manual_posts)}")
            updated, skipped = process_posts(manual_posts, "ручной ввод")
            total_updated += updated
            total_skipped += skipped

    print(
        f"\n=== ИТОГО: обновлено станций — {total_updated}, пропущено (не сопоставлено) — {total_skipped} ==="
    )


if __name__ == "__main__":
    main()
