import sqlite3

DATABASE = "fuelmap.db"


conn = sqlite3.connect(DATABASE)

cursor = conn.cursor()


try:
    cursor.execute("""
    ALTER TABLE users
    ADD COLUMN is_blocked BOOLEAN DEFAULT 0
    """)

    print("Добавлено: is_blocked")

except Exception as e:
    print("is_blocked:", e)



try:
    cursor.execute("""
    ALTER TABLE users
    ADD COLUMN last_login TEXT
    """)

    print("Добавлено: last_login")

except Exception as e:
    print("last_login:", e)



conn.commit()
conn.close()

print("Миграция завершена")