from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_PLACEHOLDER_SECRETS = {"replace-with-a-long-random-secret", "changeme", "secret"}


class Settings(BaseSettings):
    app_name: str = "skiptheline-api"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    app_version: str = "0.1.0"

    database_url: str
    db_pool_size: int = 10
    db_max_overflow: int = 20

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "skiptheline-api"
    access_token_expire_minutes: int = 30

    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    enable_docs: bool = True

    # Queue / ETA policy
    enforce_office_hours: bool = True
    arrival_buffer_minutes: int = 10
    turn_approaching_threshold: int = 3
    eta_ml_enabled: bool = True  # use the trained wait-time model when its artifact is present
    eta_min_samples: int = 5
    eta_history_days: int = 14
    eta_lower_factor: float = 0.75
    eta_upper_factor: float = 1.5
    eta_min_spread_minutes: int = 2
    congestion_busy_per_counter: float = 5.0
    congestion_high_per_counter: float = 10.0

    rate_limit_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        # Neon/Heroku style URLs use the bare "postgresql://" scheme; pin the psycopg v3 driver.
        if v.startswith("postgres://"):
            v = "postgresql://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            v = "postgresql+psycopg://" + v[len("postgresql://"):]
        if not v.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must be a PostgreSQL URL")
        return v

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        if self.app_env.lower() not in {"development", "test"}:
            if len(self.jwt_secret_key) < 32 or self.jwt_secret_key.lower() in _PLACEHOLDER_SECRETS:
                raise ValueError("JWT_SECRET_KEY must be a unique random value of at least 32 characters")
            if self.cors_origins.strip() in {"*", ""}:
                raise ValueError("CORS_ORIGINS must list explicit origins outside development")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() in {"development", "test"}


settings = Settings()
