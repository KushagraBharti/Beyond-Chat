from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_title: str = os.getenv("OPENROUTER_APP_TITLE", "Beyond Chat MVP")
    app_url: str = os.getenv("APP_URL", "http://127.0.0.1:5173")
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openrouter_http_referer: str = os.getenv("OPENROUTER_HTTP_REFERER", "http://127.0.0.1:5173")
    openrouter_timeout_seconds: float = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "45"))
    openrouter_default_model: str = os.getenv("OPENROUTER_DEFAULT_MODEL", "openai/gpt-4o-mini")
    tavily_api_key: str | None = os.getenv("TAVILY_API_KEY")
    google_client_id: str | None = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://127.0.0.1:8000/api/integrations/google-calendar/callback",
    )
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_secret: str | None = os.getenv("SUPABASE_JWT_SECRET")
    local_workspace_id: str = os.getenv("LOCAL_WORKSPACE_ID", "local-workspace")
    local_workspace_name: str = os.getenv("LOCAL_WORKSPACE_NAME", "Beyond Chat Local")


settings = Settings()
