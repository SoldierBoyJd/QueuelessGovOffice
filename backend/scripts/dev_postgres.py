"""Start a throw-away local PostgreSQL (bundled via `pgserver`) when you have no Neon/Postgres handy.

    python scripts/dev_postgres.py

Prints a DATABASE_URL to put in .env and keeps the server running until you press Ctrl+C.
The data directory (backend/.pgdata) is git-ignored. For anything shared, use a real PostgreSQL / Neon.
"""
import pathlib
import time

import pgserver

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / ".pgdata"


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    server = pgserver.get_server(DATA_DIR, cleanup_mode="stop")
    uri = server.get_uri()
    if "/postgres" in uri and not uri.endswith("/skiptheline"):
        # use a dedicated database inside the bundled server
        server.psql("SELECT 'CREATE DATABASE skiptheline' WHERE NOT EXISTS "
                    "(SELECT FROM pg_database WHERE datname='skiptheline')\\gexec")
        uri = uri.rsplit("/", 1)[0] + "/skiptheline"
    print("PostgreSQL is running. Put this in backend/.env:\n")
    print(f"DATABASE_URL={uri}\n")
    print("Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
