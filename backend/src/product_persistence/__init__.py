"""Persistence contracts and adapters for the Phase 5-12 product surface."""

from .contracts import (
    ConflictError,
    NotFoundError,
    ProductPersistenceUnavailable,
    ProductRecord,
    ProductRepository,
    Scope,
)
from .in_memory import InMemoryProductRepository
from .manifest import APPEND_ONLY_KINDS, PRODUCT_KINDS, SCHEMA_MANIFEST, schema_manifest
from .supabase import SupabaseProductRepository
from .unavailable import UnavailableProductRepository

__all__ = [
    "ConflictError",
    "APPEND_ONLY_KINDS",
    "InMemoryProductRepository",
    "NotFoundError",
    "ProductRecord",
    "ProductPersistenceUnavailable",
    "PRODUCT_KINDS",
    "ProductRepository",
    "SCHEMA_MANIFEST",
    "Scope",
    "SupabaseProductRepository",
    "UnavailableProductRepository",
    "schema_manifest",
]
