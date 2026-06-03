from pydantic import ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://wcp:wcp@localhost:5432/wcp"
    redis_url: str = "redis://localhost:6379"
    data_platform_url: str = "http://localhost:8001"
    log_level: str = "INFO"
    environment: str = "development"
    skip_db_startup: bool = False
    internal_service_token: str = ""

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    trust_score_high_band: float = 0.85
    trust_score_medium_band: float = 0.60

    @field_validator("environment", "log_level", mode="before")
    @classmethod
    def _strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v

    @field_validator("skip_db_startup", mode="before")
    @classmethod
    def _parse_bool_stripped(cls, v: object) -> bool:
        if isinstance(v, str):
            return v.strip().lower() in ("true", "1", "yes")
        return bool(v)

    @field_validator("database_url", "redis_url")
    @classmethod
    def _validate_not_placeholder_in_production(cls, v: str, info: ValidationInfo) -> str:
        if info.data.get("environment") == "production" and "localhost" in v:
            raise ValueError(
                f"{info.field_name} must not point to localhost in production. "
                "Set the environment variable to a real service URL."
            )
        return v


settings = Settings()
