import os
from openai import OpenAI

_client = None


def get_client():
    global _client

    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        _client = OpenAI(api_key=api_key)

    return _client


def generate_station_summary(station_name: str, comments: list) -> str | None:
    client = get_client()

    if client is None or not comments:
        return None

    joined = "\n".join(f"- {c}" for c in comments[:5])

    prompt = (
        f"Заправка: {station_name}\n"
        f"Последние комментарии водителей:\n{joined}\n\n"
        "Составь ОДНО короткое предложение на русском (не больше 15 слов), "
        "обобщающее текущую ситуацию с топливом на этой заправке. "
        "Без вступлений и оценок, только суть по комментариям."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.3
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        # ошибка ИИ никогда не должна ронять весь запрос — просто логируем
        print(f"[AI summary error] {e}")
        return None