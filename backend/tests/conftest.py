"""Shared fixtures for NusaFreight ERP backend tests."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
_base = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not _base:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = _base.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_PASSWORD = "Demo@2026"
DEMO_EMAILS = {
    "sales": "sales@nusafreight.com",
    "cs": "cs@nusafreight.com",
    "customs": "customs@nusafreight.com",
    "finance": "finance@nusafreight.com",
    "pricing": "pricing@nusafreight.com",
}


def _admin_creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing /app/memory/test_credentials.md")
    c = p.read_text(encoding="utf-8")
    e = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Email(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    pw = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Password(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    if not e or not pw:
        pytest.skip("no creds in test_credentials.md")
    return {"email": e.group(1), "password": pw.group(1)}


@pytest.fixture(scope="session")
def admin_credentials():
    return _admin_creds()


def _login(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=45)
    if r.status_code != 200:
        pytest.fail(f"login failed for {email}: {r.status_code} {r.text[:300]}")
    data = r.json()
    token = data.get("access_token")
    if not token:
        pytest.fail(f"no access_token in login response for {email}: {data}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    s.user = data["user"]  # type: ignore[attr-defined]
    return s


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin(admin_credentials):
    return _login(admin_credentials["email"], admin_credentials["password"])


@pytest.fixture(scope="session")
def sales():
    return _login(DEMO_EMAILS["sales"], DEMO_PASSWORD)


@pytest.fixture(scope="session")
def cs():
    return _login(DEMO_EMAILS["cs"], DEMO_PASSWORD)


@pytest.fixture(scope="session")
def finance():
    return _login(DEMO_EMAILS["finance"], DEMO_PASSWORD)


@pytest.fixture(scope="session")
def customs():
    return _login(DEMO_EMAILS["customs"], DEMO_PASSWORD)


@pytest.fixture(scope="session")
def pricing():
    return _login(DEMO_EMAILS["pricing"], DEMO_PASSWORD)
