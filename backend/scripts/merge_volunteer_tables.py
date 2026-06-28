"""One-time migration: merge CampaignVolunteer rows into Volunteer, then drop campaign_volunteer table.

Run: python -m scripts.merge_volunteer_tables
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, text, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.volunteer import Volunteer


def run():
    with Session(engine) as session:
        # 1. Check if campaign_volunteer table exists
        inspector = session.exec(text(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='campaign_volunteer'"
        )).first()
        if not inspector:
            print("No campaign_volunteer table found — nothing to migrate.")
            return

        # 2. Read all campaign_volunteer rows
        rows = session.exec(text(
            "SELECT id, name, phone, district, constituency, assigned_area, assigned_task, "
            "lat, lng, status, coverage_status, task_status, last_location_update, created_at "
            "FROM campaign_volunteer"
        )).all()
        print(f"Found {len(rows)} CampaignVolunteer rows to migrate.")

        if not rows:
            print("No rows to migrate — dropping empty table.")
            session.exec(text("DROP TABLE campaign_volunteer"))
            session.commit()
            print("Done.")
            return

        # 3. Merge into Volunteer table
        created = 0
        updated = 0
        for row in rows:
            phone = row.phone or ""
            if not phone:
                continue

            existing = session.exec(
                select(Volunteer).where(Volunteer.phone == phone)
            ).first()

            campaign_status = "active" if row.status == "active" else "inactive"

            if existing:
                existing.constituency = row.constituency or existing.constituency
                existing.assigned_area = row.assigned_area or existing.assigned_area
                existing.assigned_task = row.assigned_task or existing.assigned_task
                existing.coverage_status = row.coverage_status or existing.coverage_status
                existing.task_status = row.task_status or existing.task_status
                existing.campaign_status = campaign_status
                existing.last_location_update = row.last_location_update or existing.last_location_update
                if row.lat is not None:
                    existing.lat = row.lat
                if row.lng is not None:
                    existing.lng = row.lng
                # Also update district if not already set on Volunteer
                if not existing.district and row.district:
                    existing.district = row.district
                session.add(existing)
                updated += 1
            else:
                vol = Volunteer(
                    phone=phone,
                    name=row.name or "Unknown",
                    district=row.district or "",
                    constituency=row.constituency or "",
                    assigned_area=row.assigned_area or "",
                    assigned_task=row.assigned_task or "",
                    lat=row.lat,
                    lng=row.lng,
                    coverage_status=row.coverage_status or "pending",
                    task_status=row.task_status or "unassigned",
                    campaign_status=campaign_status,
                    last_location_update=row.last_location_update,
                    status="active",
                )
                session.add(vol)
                created += 1

        session.commit()
        print(f"Created {created} new Volunteer rows, updated {updated} existing rows.")

        # 4. Drop the old table
        session.exec(text("DROP TABLE campaign_volunteer"))
        session.commit()
        print("Dropped campaign_volunteer table.")

        print("\nMigration complete!")


if __name__ == "__main__":
    run()
