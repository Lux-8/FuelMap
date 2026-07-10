"""
Запуск: python update_station_locations.py

Дополняет название каждой заправки местоположением (город/трасса), используя
Nominatim (сервис OpenStreetMap) — обратное геокодирование по координатам.

ВАЖНО: Nominatim — бесплатный сервис на волонтёрских серверах, у него жёсткая
политика использования: не более 1 запроса в секунду, обязателен свой
User-Agent. Скрипт это соблюдает намеренно — не увеличивай скорость запросов
и не убирай задержку, иначе сервис забанит твой IP.

Скрипт идемпотентный: уже обработанные станции (в названии есть " — ") при
повторном запуске пропускаются — можно спокойно прерывать и запускать заново.
"""

import time
import requests

from database import SessionLocal
import models

HEADERS = {
    "User-Agent": "FuelMap-personal-student-project/1.0 (contact: none, non-commercial hobby project)"
}

REQUEST_DELAY = 1.1  # секунда + запас, чтобы точно не превысить лимит


def reverse_geocode(lat: float, lng: float) -> str | None:
    """Возвращает короткое описание места (дорога или город) для координат."""
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "json",
        "lat": lat,
        "lon": lng,
        "zoom": 16,
        "addressdetails": 1
    }

    try:
        response = requests.get(url, params=params, headers=HEADERS, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"  [ошибка запроса] {e}")
        return None

    address = data.get("address", {})

    # приоритет: трасса/шоссе > город/посёлок > район
    road = address.get("road")
    town = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
    )

    if road and town:
        return f"{town}, {road}"
    elif town:
        return town
    elif road:
        return road

    return None


def main():
    db = SessionLocal()
    stations = db.query(models.Station).all()

    total = len(stations)
    updated = 0
    skipped = 0

    print(f"Всего станций в базе: {total}")

    for i, station in enumerate(stations, 1):
        if " — " in station.name:
            skipped += 1
            continue

        print(f"[{i}/{total}] {station.name} ({station.lat}, {station.lng})...", end=" ")

        location = reverse_geocode(station.lat, station.lng)

        if location:
            new_name = f"{station.name} — {location}"
            station.name = new_name
            db.commit()
            updated += 1
            print(f"-> {new_name}")
        else:
            print("местоположение не определено, пропуск")

        time.sleep(REQUEST_DELAY)

    db.close()

    print(f"\n=== ИТОГО: обновлено — {updated}, пропущено (уже обработаны) — {skipped} ===")


if __name__ == "__main__":
    main()
