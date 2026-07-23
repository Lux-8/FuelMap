import time

# session_id -> unix-время последнего пинга
active_sessions: dict[str, float] = {}

ONLINE_TIMEOUT_SECONDS = 60  # считаем "онлайн", если пинг был за последние 60 сек


def register_ping(session_id: str):
    active_sessions[session_id] = time.time()


def get_online_count() -> int:
    now = time.time()

    # заодно чистим устаревшие записи
    expired = [
        sid
        for sid, last_seen in active_sessions.items()
        if now - last_seen > ONLINE_TIMEOUT_SECONDS
    ]
    for sid in expired:
        del active_sessions[sid]

    return len(active_sessions)
