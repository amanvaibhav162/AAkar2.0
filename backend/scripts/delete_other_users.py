import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.user import User

allowed_emails = [
    "serveradmin@aakar.gov.in",
    "statedelhi@aakar.gov.in",
    "nd-admin@aakar.gov.in",
    "nd01-mgr@aakar.gov.in",
    "ndcn-mgr@aakar.gov.in",
    "booth.ndcn-b1@aakar.gov.in",
    "cm-delhi@aakar.gov.in",
    "dm-newdelhi@aakar.gov.in",
    "official-nd@aakar.gov.in"
]

with Session(engine) as session:
    users = session.exec(select(User)).all()
    deleted = 0
    for u in users:
        if u.email not in allowed_emails:
            session.delete(u)
            deleted += 1
    session.commit()
    print(f"Deleted {deleted} unauthorized users.")
