"""Auth module: login, /auth/me, RBAC token handling, bcrypt/security checks."""
import pytest
import requests

from conftest import API, DEMO_EMAILS, DEMO_PASSWORD


class TestAuth:
    def test_admin_login(self, api_client, admin_credentials):
        r = api_client.post(f"{API}/auth/login", json=admin_credentials, timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert isinstance(d.get("access_token"), str) and len(d["access_token"]) > 20
        assert d["token_type"] == "bearer"
        assert d["user"]["email"] == admin_credentials["email"].lower()
        assert d["user"]["role"] == "admin"
        assert "password_hash" not in d["user"]
        assert "_id" not in d["user"]

    @pytest.mark.parametrize("role", list(DEMO_EMAILS.keys()))
    def test_demo_role_login(self, api_client, role):
        r = api_client.post(
            f"{API}/auth/login", json={"email": DEMO_EMAILS[role], "password": DEMO_PASSWORD}, timeout=45
        )
        assert r.status_code == 200, r.text[:300]
        assert r.json()["user"]["role"] == role

    def test_login_invalid_password(self, api_client, admin_credentials):
        r = api_client.post(
            f"{API}/auth/login", json={"email": admin_credentials["email"], "password": "WrongPass1!"}, timeout=45
        )
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_login_unknown_email(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": "nope@nusafreight.com", "password": "x"}, timeout=45)
        assert r.status_code == 401

    def test_login_bad_payload_422(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": "not-an-email", "password": "x"}, timeout=45)
        assert r.status_code == 422

    def test_me_requires_token(self, api_client):
        r = requests.get(f"{API}/auth/me", timeout=45)
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"}, timeout=45)
        assert r.status_code == 401

    def test_me_returns_user(self, admin):
        r = admin.get(f"{API}/auth/me", timeout=45)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "admin"
        assert "password_hash" not in d and "_id" not in d

    def test_logout(self, admin):
        r = admin.post(f"{API}/auth/logout", timeout=45)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_login_sets_httponly_cookie(self, api_client, admin_credentials):
        """Playbook expectation: httpOnly cookie on login (informational)."""
        r = api_client.post(f"{API}/auth/login", json=admin_credentials, timeout=45)
        cookies = r.headers.get("set-cookie", "")
        assert "access_token" in cookies and "httponly" in cookies.lower(), (
            f"No httpOnly access_token cookie set on login; got set-cookie={cookies!r}"
        )

    def test_brute_force_lockout(self, api_client):
        """Playbook expectation: lockout after 5 failed attempts."""
        email = DEMO_EMAILS["cs"]
        codes = []
        for _ in range(6):
            r = api_client.post(f"{API}/auth/login", json={"email": email, "password": "Bad@1234"}, timeout=45)
            codes.append(r.status_code)
        assert 423 in codes or 429 in codes, f"No lockout after 6 failed logins, codes={codes}"
        # ensure valid login still works afterwards
        ok = api_client.post(f"{API}/auth/login", json={"email": email, "password": DEMO_PASSWORD}, timeout=45)
        assert ok.status_code == 200


class TestPasswordStorage:
    def test_bcrypt_hash_format(self):
        import asyncio
        import os
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values

        env = dotenv_values("/app/backend/.env")
        mongo_url = os.environ.get("MONGO_URL") or env.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME") or env.get("DB_NAME")

        async def run():
            c = AsyncIOMotorClient(mongo_url)
            try:
                users = await c[db_name].users.find({}, {"password_hash": 1, "email": 1, "_id": 0}).to_list(50)
                return users
            finally:
                c.close()

        users = asyncio.get_event_loop().run_until_complete(run()) if False else asyncio.run(run())
        assert users, "no users seeded in DB"
        for u in users:
            assert u["password_hash"].startswith("$2b$"), f"{u['email']} hash prefix {u['password_hash'][:4]}"
