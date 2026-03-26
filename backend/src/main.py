import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

from src.routers.compare import router as compare_router

load_dotenv()  # loads backend/.env into environment variables

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
        "Create backend/.env with those values (do not commit it)."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="Beyond Chat API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://beyond-chat-wheat.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(compare_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "beyond-chat-backend", "status": "ok"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "message": "Backend is reachable"}


@app.get("/api/supabase-check")
def supabase_check() -> dict:
    """
    Connectivity check: call Supabase Auth Admin API.
    Success = we can reach Supabase + authenticate with service role.
    We intentionally keep the response parsing version-agnostic.
    """
    try:
        resp = supabase.auth.admin.list_users(page=1, per_page=1)

        # Different client versions may return different response shapes.
        if isinstance(resp, dict):
            return {"ok": True, "type": "dict", "keys": list(resp.keys())}

        if isinstance(resp, list):
            return {"ok": True, "type": "list", "length": len(resp)}

        # Fallback: stringify a small portion
        return {"ok": True, "type": str(type(resp)), "preview": str(resp)[:200]}

    except Exception as e:
        return {"ok": False, "error": str(e)}