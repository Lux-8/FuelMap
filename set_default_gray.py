"""
Запуск: python set_default_gray.py

Разово приводит УЖЕ СУЩЕСТВУЮЩИЕ станции в базе к статусу "нет данных"
(серый) — только те, по которым ещё не было ни одного реального репорта
от людей. Станции с историей репортов не трогает.
"""

from database import SessionLocal
import models

db = SessionLocal()

stations = db.query(models.Station).all()

updated = 0
skipped = 0

for station in stations:
    has_reports = db.query(models.Report).filter(
        models.Report.station_id == station.id
    ).first() is not None

    if has_reports:
        skipped += 1
        continue

    station.status = "gray"
    station.text = "Нет данных"
    station.a92 = False
    station.a95 = False
    station.a98 = False
    station.diesel = False
    station.gas = False

    updated += 1

db.commit()
db.close()

print(f"Переведено в 'нет данных': {updated}, пропущено (есть история репортов): {skipped}")
