"""Repeatable demo seed (safe to run more than once; existing rows are left untouched).

    python scripts/seed_demo.py                # offices, services, counters, demo accounts
    python scripts/seed_demo.py --queue 8      # ...plus a small live queue at the first office

Everything here is SYNTHETIC: accounts use the reserved `.test` domain and the optional queue is created
through the real queue service (so events/notifications are consistent). No historical data is faked.

Passwords: set SEED_DEMO_PASSWORD. It may be omitted only when APP_ENV=development (a fixed, publicly
known demo password is then used). Never run the default-password seed against a shared/production database.
"""
import argparse
import os
import sys
from datetime import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.models import Counter, Office, Service, User  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.services import queue_service  # noqa: E402

DEV_DEFAULT_PASSWORD = "DemoPass#2026"
DOMAIN = "demo.skiptheline.test"

OFFICES = [
    {"code": "RAJKOT-DO", "name": "Rajkot District Office", "city": "Rajkot", "district": "Rajkot", "state": "Gujarat",
     "address": "Collectorate, Race Course Ring Road, Rajkot, Gujarat - 360001", "lat": 22.3039, "lng": 70.8022,
     "phone": "0281-2234567", "open": time(9, 30), "close": time(17, 30), "grace": 2,
     "services": [
         ("PP", "Passport Services", "Passport & Documentation", "New Passport Application / Renewal", 8, "BookOpen"),
         ("BC", "Birth Certificate", "Passport & Documentation", "New Registration / Correction", 6, "FileText"),
         ("LR", "Land Records", "Revenue & Land Records", "7/12 Extract / Mutation", 10, "Map"),
         ("IC", "Income Certificate", "Revenue & Land Records", "New Application", 5, "FileCheck"),
     ],
     # (name, service code or None for "serves everything", status)
     "counters": [("Counter 01", "PP", "ACTIVE"), ("Counter 02", "BC", "ACTIVE"), ("Counter 03", "LR", "ACTIVE"),
                  ("Counter 04", None, "ACTIVE"), ("Counter 05", "IC", "PAUSED"), ("Counter 06", None, "CLOSED")]},
    {"code": "AHMEDABAD-RTO", "name": "Ahmedabad RTO & Collectorate", "city": "Ahmedabad", "district": "Ahmedabad",
     "state": "Gujarat", "address": "Sardar Patel Bhavan, Sector-10, Gandhinagar, Gujarat - 382010", "lat": 23.0225,
     "lng": 72.5714, "phone": None, "open": time(9, 0), "close": time(18, 0), "grace": 5,
     "services": [("DL", "Driving Licence", "Motor Vehicle", "New / Renewal / Duplicate", 12, "Car"),
                  ("VR", "Vehicle Registration", "Motor Vehicle", "New Registration / Transfer", 15, "Truck")],
     "counters": [("Counter 01", "DL", "ACTIVE"), ("Counter 02", "VR", "ACTIVE"), ("Counter 03", None, "ACTIVE")]},
    {"code": "SURAT-SMC", "name": "Surat Municipal Corporation", "city": "Surat", "district": "Surat",
     "state": "Gujarat", "address": "Muglisara, Surat, Gujarat - 395003", "lat": 21.1702, "lng": 72.8311,
     "phone": None, "open": time(9, 30), "close": time(17, 0), "grace": 5,
     "services": [("PT", "Property Tax", "Municipal Services", "Payment / Assessment", 7, "Landmark")],
     "counters": [("Counter 01", None, "ACTIVE"), ("Counter 02", None, "ACTIVE")]},
    {"code": "VADODARA-CC", "name": "Vadodara Civic Center", "city": "Vadodara", "district": "Vadodara",
     "state": "Gujarat", "address": "Khanderao Market, Vadodara, Gujarat - 390001", "lat": 22.3072, "lng": 73.1812,
     "phone": None, "open": time(9, 0), "close": time(17, 30), "grace": 5,
     "services": [("WC", "Water Connection", "Municipal Services", "New Connection / Transfer", 9, "Droplets")],
     "counters": [("Counter 01", None, "ACTIVE")]},
]


def get_password() -> str:
    pw = os.environ.get("SEED_DEMO_PASSWORD")
    if pw:
        return pw
    if settings.is_dev:
        return DEV_DEFAULT_PASSWORD
    sys.exit("SEED_DEMO_PASSWORD must be set when APP_ENV is not development.")


def seed(session, password: str, queue: int = 0) -> dict:
    password_hash = hash_password(password)
    created = {"offices": 0, "services": 0, "counters": 0, "users": 0, "tokens": 0}
    offices: dict[str, Office] = {}
    services: dict[tuple[str, str], Service] = {}
    counters: dict[tuple[str, str], Counter] = {}

    for spec in OFFICES:
        office = session.scalars(select(Office).where(Office.code == spec["code"])).one_or_none()
        if office is None:
            office = Office(code=spec["code"], name=spec["name"], city=spec["city"], district=spec["district"],
                            state=spec["state"], address=spec["address"], lat=spec["lat"], lng=spec["lng"],
                            phone=spec["phone"], opening_time=spec["open"], closing_time=spec["close"],
                            call_grace_minutes=spec["grace"])
            session.add(office)
            session.flush()
            created["offices"] += 1
        offices[spec["code"]] = office
        for code, name, dept, desc, minutes, icon in spec["services"]:
            svc = session.scalars(select(Service).where(Service.office_id == office.id, Service.code == code)
                                  ).one_or_none()
            if svc is None:
                svc = Service(office_id=office.id, code=code, name=name, department=dept, description=desc,
                              estimated_service_minutes=minutes, icon_name=icon)
                session.add(svc)
                session.flush()
                created["services"] += 1
            services[(spec["code"], code)] = svc
        for cname, scode, status in spec["counters"]:
            ctr = session.scalars(select(Counter).where(Counter.office_id == office.id, Counter.name == cname)
                                  ).one_or_none()
            if ctr is None:
                ctr = Counter(office_id=office.id, name=cname, status=status,
                              service_id=services[(spec["code"], scode)].id if scode else None)
                session.add(ctr)
                session.flush()
                created["counters"] += 1
            counters[(spec["code"], cname)] = ctr

    rajkot = offices["RAJKOT-DO"]
    people = [
        # email-local, name, role, office, counter
        ("citizen", "Demo Citizen", "CITIZEN", None, None),
        ("citizen2", "Demo Citizen Two", "CITIZEN", None, None),
        ("officer", "Priya Sharma", "OFFICER", rajkot, counters[("RAJKOT-DO", "Counter 01")]),
        ("officer2", "Rohan Desai", "OFFICER", rajkot, None),
        ("admin", "Aditi Mehta", "OFFICE_ADMIN", rajkot, None),
        ("central", "Vikram Nair", "CENTRAL_ADMIN", None, None),
        ("super", "Sys Admin", "SUPER_ADMIN", None, None),
    ]
    users: dict[str, User] = {}
    for local, name, role, office, counter in people:
        email = f"{local}@{DOMAIN}"
        user = session.scalars(select(User).where(User.email == email)).one_or_none()
        if user is None:
            user = User(email=email, full_name=name, role=role, password_hash=password_hash,
                        office_id=office.id if office else None, counter_id=counter.id if counter else None,
                        verification_status="APPROVED" if role != "CITIZEN" else "NOT_REQUIRED")
            session.add(user)
            session.flush()
            created["users"] += 1
        users[local] = user
    session.commit()

    if queue > 0:
        settings.enforce_office_hours = False  # demo queue regardless of the current time
        svc_cycle = [services[("RAJKOT-DO", c)] for c in ("PP", "BC", "LR", "IC")]
        for i in range(queue):
            email = f"queue{i + 1:02d}@{DOMAIN}"
            citizen = session.scalars(select(User).where(User.email == email)).one_or_none()
            if citizen is None:
                citizen = User(email=email, full_name=f"Demo Queue Citizen {i + 1}", role="CITIZEN",
                               password_hash=password_hash, verification_status="NOT_REQUIRED")
                session.add(citizen)
                session.flush()
                created["users"] += 1
            svc = svc_cycle[i % len(svc_cycle)]
            try:
                _, _, was_created = queue_service.create_token(
                    session, citizen, office_id=rajkot.id, service_id=svc.id,
                    idempotency_key=f"seed-{svc.code}-{i + 1:03d}-demo")
                created["tokens"] += int(was_created)
            except Exception as exc:  # already queued from a previous run, etc.
                session.rollback()
                print(f"  skipped queue citizen {i + 1}: {getattr(exc, 'code', exc)}")
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--queue", type=int, default=0, help="create N synthetic waiting tokens at the first office")
    args = parser.parse_args()
    password = get_password()
    with SessionLocal() as session:
        created = seed(session, password, args.queue)
    print("Seed complete:", created)
    print(f"Demo accounts (password from SEED_DEMO_PASSWORD{' or the dev default' if settings.is_dev else ''}):")
    for local in ("citizen", "citizen2", "officer", "officer2", "admin", "central", "super"):
        print(f"  {local}@{DOMAIN}")


if __name__ == "__main__":
    main()
