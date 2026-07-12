from __future__ import annotations

from .contracts import ProductPersistenceUnavailable


class UnavailableProductRepository:
    """Mounted fail-closed adapter used when durable product storage is absent."""

    @staticmethod
    def _raise(*args, **kwargs):
        del args, kwargs
        raise ProductPersistenceUnavailable(
            "Product persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    list = _raise
    list_recent = _raise
    list_global = _raise
    get = _raise
    create_once = _raise
    update = _raise
    append_once = _raise
    get_capability_run = _raise
    record_capability_resolution = _raise
