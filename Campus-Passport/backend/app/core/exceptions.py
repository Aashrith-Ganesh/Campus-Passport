import logging
from typing import Any, Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("campus_passport")


class CampusPassportException(Exception):
    """Base application exception for Campus Passport."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail: str = "An unexpected error occurred."

    def __init__(self, detail: Optional[str] = None, status_code: Optional[int] = None):
        self.detail = detail or self.default_detail
        if status_code is not None:
            self.status_code = status_code
        super().__init__(self.detail)


class EntityNotFoundException(CampusPassportException):
    """Raised when a requested resource is not found."""
    status_code: int = status.HTTP_404_NOT_FOUND
    default_detail: str = "Resource not found."


class DomainValidationError(CampusPassportException):
    """Raised when domain business rules or input validations fail."""
    status_code: int = status.HTTP_400_BAD_REQUEST
    default_detail: str = "Validation failed."


class ForbiddenException(CampusPassportException):
    """Raised when access is forbidden or unauthorized for the requested action."""
    status_code: int = status.HTTP_403_FORBIDDEN
    default_detail: str = "Access forbidden."


class DuplicateResourceException(DomainValidationError):
    """Raised when attempting to create an already existing or duplicate resource."""
    status_code: int = status.HTTP_400_BAD_REQUEST
    default_detail: str = "Resource already exists."


class ServiceUnavailableException(CampusPassportException):
    """Raised when an external service or provider is temporarily unavailable."""
    status_code: int = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail: str = "Service temporarily unavailable."


async def campus_passport_exception_handler(
    request: Request, exc: CampusPassportException
) -> JSONResponse:
    """Translate known application exceptions into consistent JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Preserve existing HTTPException behavior while maintaining consistent JSON shape."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch unhandled exceptions and return a safe generic 500 without leaking internals."""
    logger.error("Unhandled exception processing request %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register application-level exception handlers on the FastAPI app."""
    app.add_exception_handler(CampusPassportException, campus_passport_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
