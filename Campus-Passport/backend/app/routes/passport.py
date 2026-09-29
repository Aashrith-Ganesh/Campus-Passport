"""
Legacy compatibility re-export for passport routes.
Canonical location is backend.app.passport.routes.
"""
from backend.app.passport.routes import (
    get_achievements,
    get_passport,
    get_points,
    router,
)

__all__ = [
    "router",
    "get_achievements",
    "get_points",
    "get_passport",
]
