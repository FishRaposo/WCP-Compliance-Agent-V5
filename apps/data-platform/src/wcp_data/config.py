from pydantic import field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://wcp:wcp_dev_password@localhost:5432/wcp_v5"
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"
    environment: str = "development"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    skip_db_startup: bool = False

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
                f"{info.field_name} must not point to localhost in production."
            )
        return v


settings = Settings()
