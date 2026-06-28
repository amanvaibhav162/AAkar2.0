"""Volunteer, Task, and ConversationState models for SQLite-backed storage."""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class Volunteer(SQLModel, table=True):
    """Represents a registered volunteer (WhatsApp + campaign)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)  # e.g. "919876543210"
    name: Optional[str] = None
    booth_id: Optional[str] = None
    status: str = Field(default="pending")  # "pending" | "active" (WhatsApp registration)
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Extended registration details
    pincode: Optional[str] = None
    address: Optional[str] = None
    aadhar: Optional[str] = None
    area_name: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    division: Optional[str] = None
    region: Optional[str] = None
    circle: Optional[str] = None
    state: Optional[str] = None

    # Campaign fields (merged from CampaignVolunteer)
    constituency: str = Field(default="")
    assigned_area: str = Field(default="")
    assigned_task: str = Field(default="")
    lat: Optional[float] = None
    lng: Optional[float] = None
    coverage_status: str = Field(default="pending")       # "pending" | "covered"
    task_status: str = Field(default="unassigned")         # "unassigned" | "assigned" | "accepted" | "completed"
    campaign_status: str = Field(default="inactive")       # "inactive" | "active" (map location tracking)
    last_location_update: Optional[str] = None


class Task(SQLModel, table=True):
    """Represents a task assigned to a volunteer."""

    id: Optional[int] = Field(default=None, primary_key=True)
    volunteer_id: int = Field(foreign_key="volunteer.id")
    booth_id: str
    title: str
    description: Optional[str] = None
    status: str = Field(default="assigned")  # "assigned" | "completed"
    assigned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    proof_image_path: Optional[str] = None


class ConversationState(SQLModel, table=True):
    """Tracks the registration conversation state for a phone number."""

    phone: str = Field(primary_key=True)  # one row per phone number
    current_step: str = Field(default="awaiting_name")
    collected_data: str = Field(default="{}")  # JSON blob
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VolunteerBroadcastLog(SQLModel, table=True):
    """Persists a log of each WhatsApp broadcast sent to volunteers."""

    id: Optional[int] = Field(default=None, primary_key=True)
    sender_id: int
    sender_name: Optional[str] = None
    booth_id: Optional[str] = None
    message: str
    recipient_count: int
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
