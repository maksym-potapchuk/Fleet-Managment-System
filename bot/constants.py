import os

from dotenv import load_dotenv


load_dotenv()


BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Типи сервісу з дефолтного регламенту (РЕГЛАМЕНТ ОБСЛУГОВУВАННЯ)
SERVICE_TYPES = [
    "Заміна моторного масла та масляного фільтра",
    "Заміна фільтра газової системи",
    "Заміна повітряного фільтра двигуна",
    "Заміна салонного фільтра",
    "Перевірка стану підвіски",
    "Заміна гальмівної рідини",
    "Заміна гальмівних колодок",
    "Перевірка електросистеми та компонентів двигуна",
    "Заміна рідини гідропідсилювача керма",
    "Заміна охолоджуючої рідини",
    "Заміна насоса охолодження",
    "Заміна масла коробки передач",
    "Заміна паливного фільтра",
]


def get_sync_db_url() -> str:
    """
    Build a sync SQLAlchemy URL to the same Postgres database
    that Django uses (based on POSTGRES_* environment variables).
    """
    db_name = os.getenv("POSTGRES_DB")
    db_user = os.getenv("POSTGRES_USER")
    db_password = os.getenv("POSTGRES_PASSWORD")
    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = os.getenv("POSTGRES_PORT", "5432")

    if not all([db_name, db_user, db_password]):
        raise RuntimeError(
            "Database env vars are not fully set. "
            "Please define POSTGRES_DB, POSTGRES_USER and POSTGRES_PASSWORD."
        )

    ssl_suffix = ""
    if "neon.tech" in db_host:
        ssl_suffix = "?sslmode=require"

    return (
        f"postgresql+psycopg2://{db_user}:{db_password}"
        f"@{db_host}:{db_port}/{db_name}{ssl_suffix}"
    )

