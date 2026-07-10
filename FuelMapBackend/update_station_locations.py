"""
Запуск:
python update_station_locations.py

Добавляет адрес (город/дорога) каждой заправке через Nominatim
(OpenStreetMap reverse geocoding).

Соблюдает лимит Nominatim: ~1 запрос в секунду.
"""

import time
import requests

from database import SessionLocal
import models


HEADERS = {
    "User-Agent": "FuelMap-personal-student-project/1.0"
}

REQUEST_DELAY = 1.1


def reverse_geocode(lat: float, lng: float) -> str | None:
    """
    Получает адрес по координатам.
    """

    url = "https://nominatim.openstreetmap.org/reverse"

    params = {
        "format": "json",
        "lat": lat,
        "lon": lng,
        "zoom": 16,
        "addressdetails": 1
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=HEADERS,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

    except requests.RequestException as e:
        print(f"[ошибка запроса] {e}")
        return None


    address = data.get("address", {})


    road = address.get("road")

    town = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
    )


    if road and town:
        return f"{town}, {road}"

    if town:
        return town

    if road:
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

        # уже есть адрес
        if getattr(station, "address", None):
            skipped += 1
            continue


        print(
            f"[{i}/{total}] {station.name} "
            f"({station.lat}, {station.lng})...",
            end=" "
        )


        location = reverse_geocode(
            station.lat,
            station.lng
        )


        if location:

            station.address = location

            db.commit()

            updated += 1

            print(f"-> {location}")


        else:

            print(
                "местоположение не определено, пропуск"
            )


        time.sleep(REQUEST_DELAY)


    db.close()


    print(
        f"\n=== ИТОГО: обновлено — {updated}, "
        f"пропущено — {skipped} ==="
    )



if __name__ == "__main__":
    main()
