import json

from database import SessionLocal
from models import Station

db = SessionLocal()

with open("stations.json", encoding="utf-8") as f:
    stations = json.load(f)

added = 0

for s in stations:

    exists = db.query(Station).filter(
        Station.lat == s["lat"],
        Station.lng == s["lng"]
    ).first()

    if exists:
        continue

    fuel = s.get("fuel", {})

    station = Station(
        name=s["name"],
        address=s.get("address", ""),
        lat=s["lat"],
        lng=s["lng"],
        status="gray",
        text="Нет данных",
        a92=fuel.get("a92", False),
        a95=fuel.get("a95", False),
        a98=fuel.get("a98", False),
        diesel=fuel.get("diesel", False),
        gas=fuel.get("gas", False)
    )

    db.add(station)
    added += 1

db.commit()

print(f"Добавлено {added} заправок")
