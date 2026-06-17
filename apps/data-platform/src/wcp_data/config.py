from pydantic import ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://wcp:wcp_dev_password@localhost:5432/wcp_v5"
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"
    environment: str = "development"

    internal_service_token: str = ""

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    skip_db_startup: bool = False

    sam_gov_api_key: str = ""
    sam_gov_base_url: str = "https://api.sam.gov"

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

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.environment == "production" and not self.internal_service_token:
            raise ValueError("internal_service_token is required in production.")
        return self


settings = Settings()
