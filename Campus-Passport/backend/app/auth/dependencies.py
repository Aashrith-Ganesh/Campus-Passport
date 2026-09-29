from typing import List, Optional
from fastapi import Depends, Header, HTTPException, Query, status

from backend.app.auth.schemas import UserContext


def verify_actor_role(
    allowed_roles: List[str],
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
    body_role: Optional[str] = None,
) -> str:
    """
    Enforces prototype actor roles: TEACHER, ADMIN, MERCHANT, STUDENT.
    Reads role from Header 'X-Actor-Role', Query param 'actor_role', or body.
    Preserves backwards compatibility with prototype endpoints and tests.
    """
    role = (x_actor_role or actor_role or body_role or "").strip().upper()

    # If explicitly passed as unauthorized role (e.g. STUDENT trying to reward), reject immediately
    if role and role not in [r.upper() for r in allowed_roles]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Actor role '{role}' is not authorized for this operation. Required: {allowed_roles}.",
        )
    return role or allowed_roles[0]


async def get_current_user(
    x_actor_role: Optional[str] = Header(None, alias="X-Actor-Role"),
    actor_role: Optional[str] = Query(None),
) -> UserContext:
    """
    Boundary dependency for actor identification.
    Currently resolves actor context from prototype header/query parameter.
    Sidharth will replace the extraction body with real token decoding/verification.
    """
    role = (x_actor_role or actor_role or "STUDENT").strip().upper()
    return UserContext(
        user_id=f"demo_{role.lower()}",
        username=role.lower(),
        role=role,
        student_id="STU001" if role == "STUDENT" else None,
    )


def require_role(allowed_roles: List[str]):
    """
    Returns a FastAPI dependency checking if user.role is in allowed_roles.
    """
    async def _role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if user.role not in [r.upper() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Role '{user.role}' not permitted. Required: {allowed_roles}.",
            )
        return user
    return _role_checker
