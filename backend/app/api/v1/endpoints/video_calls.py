"""Video calling endpoints — LiveKit-backed group video conferencing.

Leaders can create rooms and invite their direct subordinates.
All calls are logged to Neo4j for audit / history.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import get_current_user
from app.domain.models.user import User
from app.infrastructure.db.neo4j_client import neo4j_client
from app.infrastructure.db.sqlite_client import get_session

router = APIRouter()

# ── Role hierarchy (same as broadcasts) ─────────────────────────────────
SUBORDINATE_ROLE = {
    "ELECTION_ADMIN": "STATE_ADMIN",
    "STATE_ADMIN": "DISTRICT_ADMIN",
    "DISTRICT_ADMIN": "CONSTITUENCY_MGR",
    "CONSTITUENCY_MGR": "MANDAL_MGR",
    "MANDAL_MGR": "BOOTH_PRESIDENT",
}


# ── Request / Response schemas ──────────────────────────────────────────
class CreateRoomRequest(BaseModel):
    participant_ids: list[int]


class JoinRoomRequest(BaseModel):
    room_name: str


class EndCallRequest(BaseModel):
    room_name: str


# ── Helpers ──────────────────────────────────────────────────────────────
def _generate_livekit_token(room_name: str, identity: str, name: str) -> str:
    """Generate a LiveKit JWT access token for a participant."""
    from livekit.api import AccessToken, VideoGrants

    token = AccessToken(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )
    token.with_identity(identity)
    token.with_name(name)
    token.with_grants(VideoGrants(
        room_join=True,
        room=room_name,
    ))
    return token.to_jwt()


def _get_subordinates(current_user: User, session: Session) -> list[User]:
    """Return the direct subordinates of the current user."""
    user_role = current_user.role.upper()
    target_role = SUBORDINATE_ROLE.get(user_role)
    if not target_role:
        return []

    query = select(User).where(User.role == target_role)

    if user_role == "ELECTION_ADMIN":
        pass  # all STATE_ADMINs
    elif user_role == "STATE_ADMIN":
        query = query.where(User.state_id == current_user.state_id)
    elif user_role == "DISTRICT_ADMIN":
        query = query.where(User.district_id == current_user.district_id)
    elif user_role == "CONSTITUENCY_MGR":
        query = query.where(User.constituency_id == current_user.constituency_id)
    elif user_role == "MANDAL_MGR":
        query = query.where(User.mandal_id == current_user.mandal_id)

    return list(session.exec(query.order_by(User.display_name, User.email)).all())


# ── Neo4j query helpers ─────────────────────────────────────────────────
_CALL_LOG_PROPS = """
    elementId(c) AS id,
    c.room_name AS room_name,
    c.initiator_id AS initiator_id,
    c.initiator_role AS initiator_role,
    c.initiator_name AS initiator_name,
    c.participant_ids AS participant_ids,
    c.participant_names AS participant_names,
    c.started_at AS started_at,
    c.ended_at AS ended_at,
    c.duration_seconds AS duration_seconds,
    c.status AS status
"""


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("/subordinates")
def get_callable_subordinates(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the list of subordinates this user can call."""
    subordinates = _get_subordinates(current_user, session)
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name or u.email,
            "role": u.role,
        }
        for u in subordinates
    ]


@router.post("/create-room")
def create_room(
    req: CreateRoomRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a video call room, log it, and return token for the initiator."""
    if settings.LIVEKIT_ENABLED.lower() not in ("true", "1", "yes"):
        raise HTTPException(status_code=503, detail="Video calling is not enabled")

    user_role = current_user.role.upper()
    target_role = SUBORDINATE_ROLE.get(user_role)
    if not target_role:
        raise HTTPException(status_code=403, detail="Your role cannot initiate video calls")

    if not req.participant_ids:
        raise HTTPException(status_code=400, detail="Select at least one participant")

    # Validate participants are actual subordinates
    participants = session.exec(
        select(User).where(User.id.in_(req.participant_ids))
    ).all()

    if len(participants) != len(req.participant_ids):
        raise HTTPException(status_code=400, detail="One or more participant IDs are invalid")

    for p in participants:
        if p.role != target_role:
            raise HTTPException(
                status_code=400,
                detail=f"User {p.email} is not a {target_role}",
            )

    # Generate room name
    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d_%H%M%S")
    room_name = f"aakar_{user_role.lower()}_{current_user.id}_{ts}"

    # Generate token for initiator
    initiator_name = current_user.display_name or current_user.email
    token = _generate_livekit_token(
        room_name=room_name,
        identity=str(current_user.id),
        name=initiator_name,
    )

    # Log call to Neo4j
    participant_ids_str = ",".join(str(p.id) for p in participants)
    participant_names_str = ",".join(
        (p.display_name or p.email) for p in participants
    )

    neo4j_client.run_query(
        """
        CREATE (c:CallLog {
            room_name: $room_name,
            initiator_id: $initiator_id,
            initiator_role: $initiator_role,
            initiator_name: $initiator_name,
            participant_ids: $participant_ids,
            participant_names: $participant_names,
            started_at: $started_at,
            ended_at: '',
            duration_seconds: 0,
            status: 'active'
        })
        """,
        {
            "room_name": room_name,
            "initiator_id": current_user.id,
            "initiator_role": user_role,
            "initiator_name": initiator_name,
            "participant_ids": participant_ids_str,
            "participant_names": participant_names_str,
            "started_at": now.isoformat(),
        },
    )

    return {
        "room_name": room_name,
        "token": token,
        "livekit_url": settings.LIVEKIT_URL,
        "participants": [
            {"id": p.id, "name": p.display_name or p.email, "role": p.role}
            for p in participants
        ],
    }


@router.post("/token")
def get_join_token(
    req: JoinRoomRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a LiveKit token for joining an existing room."""
    if settings.LIVEKIT_ENABLED.lower() not in ("true", "1", "yes"):
        raise HTTPException(status_code=503, detail="Video calling is not enabled")

    participant_name = current_user.display_name or current_user.email
    token = _generate_livekit_token(
        room_name=req.room_name,
        identity=str(current_user.id),
        name=participant_name,
    )

    return {
        "token": token,
        "livekit_url": settings.LIVEKIT_URL,
        "room_name": req.room_name,
    }


@router.get("/active")
def get_active_calls(current_user: User = Depends(get_current_user)):
    """Return active calls this user is invited to or initiated."""
    try:
        result = neo4j_client.run_query(
            f"""
            MATCH (c:CallLog)
            WHERE c.status = 'active'
              AND $user_id_str IN split(c.participant_ids, ',')
            RETURN {_CALL_LOG_PROPS}
            ORDER BY c.started_at DESC
            """,
            {"user_id": current_user.id, "user_id_str": str(current_user.id)},
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
def end_call(
    req: EndCallRequest,
    current_user: User = Depends(get_current_user),
):
    """End an active call and update duration."""
    try:
        now = datetime.now(timezone.utc)
        result = neo4j_client.run_query(
            """
            MATCH (c:CallLog {room_name: $room_name, status: 'active'})
            WHERE c.initiator_id = $user_id
            SET c.status = 'ended',
                c.ended_at = $ended_at,
                c.duration_seconds = duration.between(datetime(c.started_at), datetime($ended_at)).seconds
            RETURN elementId(c) AS id
            """,
            {
                "room_name": req.room_name,
                "user_id": current_user.id,
                "ended_at": now.isoformat(),
            },
        )
        if not result:
            raise HTTPException(status_code=404, detail="Call not found or already ended")
        return {"status": "ended", "room_name": req.room_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_call_history(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
):
    """Return past calls for the current user (as initiator or participant), paginated."""
    try:
        # Total count
        count_result = neo4j_client.run_query(
            """
            MATCH (c:CallLog)
            WHERE c.initiator_id = $user_id
               OR $user_id_str IN split(c.participant_ids, ',')
            RETURN count(c) AS total
            """,
            {
                "user_id": current_user.id,
                "user_id_str": str(current_user.id),
            },
        )
        total = count_result[0]["total"] if count_result else 0
        pages = max(1, (total + page_size - 1) // page_size)
        page = max(1, min(page, pages))
        skip = (page - 1) * page_size

        # Paginated results
        result = neo4j_client.run_query(
            f"""
            MATCH (c:CallLog)
            WHERE c.initiator_id = $user_id
               OR $user_id_str IN split(c.participant_ids, ',')
            RETURN {_CALL_LOG_PROPS}
            ORDER BY c.started_at DESC
            SKIP $skip
            LIMIT $page_size
            """,
            {
                "user_id": current_user.id,
                "user_id_str": str(current_user.id),
                "skip": skip,
                "page_size": page_size,
            },
        )
        return {
            "items": result,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history")
def delete_call_history(current_user: User = Depends(get_current_user)):
    """Delete all call history for the current user."""
    try:
        neo4j_client.run_query(
            """
            MATCH (c:CallLog)
            WHERE c.initiator_id = $user_id
               OR $user_id_str IN split(c.participant_ids, ',')
            DELETE c
            """,
            {
                "user_id": current_user.id,
                "user_id_str": str(current_user.id),
            },
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
