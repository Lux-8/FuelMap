import time
from collections import defaultdict

from fastapi import HTTPException, Request

# --- Простой rate limiter в памяти процесса ---
# Не переживает рестарт сервера и не работает между несколькими воркерами,
# но этого достаточно, чтобы остановить примитивный брутфорс на одном инстансе.
# Для серьёзного продакшена с несколькими воркерами лучше заменить на slowapi + Redis.
_attempts: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60


def check_rate_limit(
    request: Request,
    bucket: str,
    max_attempts: int = RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
):
    """Разрешает не больше max_attempts попыток за window_seconds с одного IP."""
    key = f"{bucket}:{request.client.host}"
    now = time.time()

    # оставляем только попытки внутри текущего окна
    _attempts[key] = [t for t in _attempts[key] if now - t < window_seconds]

    if len(_attempts[key]) >= max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Слишком много попыток. Подождите минуту и попробуйте снова.",
        )

    _attempts[key].append(now)
