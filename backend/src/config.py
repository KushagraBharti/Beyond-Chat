from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


_env_file = Path(__file__).parent.parent / "env"
load_dotenv(dotenv_path=_env_file)

APP_TITLE = "Beyond Chat"
APP_URL = "http://127.0.0.1:5173"
OPENROUTER_DEFAULT_MODEL = "openai/gpt-5.4-nano"
OPENROUTER_IMAGE_DEFAULT_MODEL = "google/gemini-2.5-flash-image"
OPENROUTER_TIMEOUT_SECONDS = 45.0
DEXTER_RUNNER_TIMEOUT_SECONDS = 900.0
DEXTER_RUNNER_URL: str | None = None
GOOGLE_REDIRECT_URI = "http://127.0.0.1:8000/api/integrations/google-calendar/callback"
SUPABASE_STORAGE_BUCKET = "artifacts"


@dataclass(frozen=True)
class Settings:
    app_title: str = APP_TITLE
    app_url: str = APP_URL
    openrouter_api_key: str | None = os.getenv("OPENROUTER_API_KEY")
    openrouter_http_referer: str = APP_URL
    openrouter_timeout_seconds: float = OPENROUTER_TIMEOUT_SECONDS
    openrouter_default_model: str = OPENROUTER_DEFAULT_MODEL
    openrouter_fast_model: str = OPENROUTER_DEFAULT_MODEL
    exasearch_api_key: str | None = os.getenv("EXASEARCH_API_KEY")
    financial_datasets_api_key: str | None = os.getenv("FINANCIAL_DATASETS_API_KEY")
    x_bearer_token: str | None = os.getenv("X_BEARER_TOKEN")
    dexter_runner_url: str | None = DEXTER_RUNNER_URL
    dexter_runner_shared_secret: str | None = os.getenv("DEXTER_RUNNER_SHARED_SECRET")
    dexter_runner_timeout_seconds: float = DEXTER_RUNNER_TIMEOUT_SECONDS
    google_client_id: str | None = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = GOOGLE_REDIRECT_URI
    supabase_url: str | None = os.getenv("SUPABASE_URL")
    supabase_anon_key: str | None = os.getenv("SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase_storage_bucket: str = SUPABASE_STORAGE_BUCKET
    openrouter_image_default_model: str = OPENROUTER_IMAGE_DEFAULT_MODEL


settings = Settings()
