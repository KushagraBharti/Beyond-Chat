"""Aggregate, admission-gated API surface for product phases 5 through 12."""

from .router import ProductApiDependencies, create_product_router

__all__ = ["ProductApiDependencies", "create_product_router"]
