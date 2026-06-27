import os
import sys

# Add the backend directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.infrastructure.db.sqlite_client import engine
from app.domain.models.user import User
from app.core.security import hash_password

users_data = [
    {
        "role": "ELECTION_ADMIN",
        "email": "serveradmin@aakar.gov.in",
        "display_name": "Server Admin"
    },
    {
        "role": "STATE_ADMIN",
        "email": "statedelhi@aakar.gov.in",
        "display_name": "State Admin (Delhi)",
        "state_id": "DL"
    },
    {
        "role": "DISTRICT_ADMIN",
        "email": "nd-admin@aakar.gov.in",
        "display_name": "District Admin (New Delhi)",
        "district_id": "ND"
    },
    {
        "role": "CONSTITUENCY_MGR",
        "email": "nd01-mgr@aakar.gov.in",
        "display_name": "Constituency Mgr (ND-01)",
        "constituency_id": "ND-01"
    },
    {
        "role": "MANDAL_MGR",
        "email": "ndcn-mgr@aakar.gov.in",
        "display_name": "Mandal Mgr (Connaught Place)",
        "mandal_id": "ND-CN"
    },
    {
        "role": "BOOTH_PRESIDENT",
        "email": "booth.ndcn-b1@aakar.gov.in",
        "display_name": "Booth President (Booth 1)",
        "booth_id": "ND-CN-B1"
    },
    {
        "role": "CM",
        "email": "cm-delhi@aakar.gov.in",
        "display_name": "CM State Oversight",
        "state_id": "DL"
    },
    {
        "role": "DM",
        "email": "dm-newdelhi@aakar.gov.in",
        "display_name": "DM District Governance",
        "district_id": "ND"
    },
    {
        "role": "BOOTH",
        "email": "official-nd@aakar.gov.in",
        "display_name": "Local Admin Official",
        "booth_id": "ND-CN-B1"
    }
]

def seed_users():
    pwd = hash_password("123456")
    
    with Session(engine) as session:
        for data in users_data:
            existing = session.exec(select(User).where(User.email == data["email"])).first()
            if existing:
                print(f"Updating user {data['email']}")
                existing.hashed_password = pwd
                for k, v in data.items():
                    setattr(existing, k, v)
                session.add(existing)
            else:
                print(f"Creating user {data['email']}")
                user = User(
                    email=data["email"],
                    hashed_password=pwd,
                    **{k: v for k, v in data.items() if k != "email"}
                )
                session.add(user)
                
        session.commit()
        print("Demo users seeded successfully.")

if __name__ == "__main__":
    seed_users()
