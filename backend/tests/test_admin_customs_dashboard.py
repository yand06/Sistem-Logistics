"""Customs, Admin users, audit logs, dashboard."""
import requests

from conftest import API


class TestCustoms:
    def test_customs_create_and_patch(self, customs):
        r = customs.post(
            f"{API}/customs-docs",
            json={"doc_number": "TEST_PIB-001", "doc_type": "PIB", "notes": "TEST"},
            timeout=45,
        )
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert d["status"] == "in_progress" and "_id" not in d
        p = customs.patch(f"{API}/customs-docs/{d['id']}", json={"status": "cleared"}, timeout=45)
        assert p.status_code == 200
        assert p.json()["status"] == "cleared"
        lst = customs.get(f"{API}/customs-docs", timeout=45).json()
        assert any(x["id"] == d["id"] and x["status"] == "cleared" for x in lst)

    def test_cs_cannot_create_customs_doc(self, cs):
        r = cs.post(f"{API}/customs-docs", json={"doc_number": "TEST_X"}, timeout=45)
        assert r.status_code == 403

    def test_sales_cannot_create_customs_doc(self, sales):
        r = sales.post(f"{API}/customs-docs", json={"doc_number": "TEST_Y"}, timeout=45)
        assert r.status_code == 403


class TestAdminUsers:
    created_ids = []

    def test_admin_list_users(self, admin):
        r = admin.get(f"{API}/users", timeout=45)
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 6
        for u in users:
            assert "password_hash" not in u and "_id" not in u

    def test_non_admin_cannot_list_users(self, finance):
        r = finance.get(f"{API}/users", timeout=45)
        assert r.status_code == 403

    def test_create_user_and_login(self, admin, api_client):
        payload = {"email": "test_qa_user@nusafreight.com", "password": "Qa@2026!", "name": "TEST QA", "role": "cs"}
        # cleanup any leftover
        for u in admin.get(f"{API}/users", timeout=45).json():
            if u["email"] == payload["email"]:
                admin.delete(f"{API}/users/{u['id']}", timeout=45)
        r = admin.post(f"{API}/users", json=payload, timeout=45)
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert "password_hash" not in d and "_id" not in d
        assert d["role"] == "cs"
        TestAdminUsers.created_ids.append(d["id"])

        lg = api_client.post(f"{API}/auth/login", json={"email": payload["email"], "password": payload["password"]}, timeout=45)
        assert lg.status_code == 200, "newly created user cannot login"

    def test_duplicate_email_400(self, admin):
        r = admin.post(
            f"{API}/users",
            json={"email": "test_qa_user@nusafreight.com", "password": "Qa@2026!", "name": "dup", "role": "cs"},
            timeout=45,
        )
        assert r.status_code == 400

    def test_invalid_role_400(self, admin):
        r = admin.post(
            f"{API}/users",
            json={"email": "test_qa_bad@nusafreight.com", "password": "Qa@2026!", "name": "x", "role": "hacker"},
            timeout=45,
        )
        assert r.status_code == 400

    def test_non_admin_cannot_create_user(self, cs):
        r = cs.post(
            f"{API}/users",
            json={"email": "test_qa_2@nusafreight.com", "password": "Qa@2026!", "name": "x", "role": "cs"},
            timeout=45,
        )
        assert r.status_code == 403

    def test_admin_cannot_delete_self(self, admin):
        r = admin.delete(f"{API}/users/{admin.user['id']}", timeout=45)
        assert r.status_code == 400

    def test_delete_user(self, admin):
        assert TestAdminUsers.created_ids, "no user created"
        uid = TestAdminUsers.created_ids[0]
        r = admin.delete(f"{API}/users/{uid}", timeout=45)
        assert r.status_code in (200, 204)
        users = admin.get(f"{API}/users", timeout=45).json()
        assert not any(u["id"] == uid for u in users)


class TestAuditLogs:
    def test_admin_can_read_audit(self, admin):
        r = admin.get(f"{API}/audit-logs", timeout=45)
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list) and logs
        actions = {log["action"] for log in logs}
        entities = {log["entity"] for log in logs}
        assert "create" in actions
        assert "customer" in entities
        for log in logs[:5]:
            assert "_id" not in log
            assert log["actor_email"] and log["actor_role"]

    def test_finance_can_read_audit(self, finance):
        r = finance.get(f"{API}/audit-logs", timeout=45)
        assert r.status_code == 200

    def test_sales_cannot_read_audit(self, sales):
        r = sales.get(f"{API}/audit-logs", timeout=45)
        assert r.status_code == 403

    def test_audit_entries_for_quotation_execute_and_invoice(self, admin):
        logs = admin.get(f"{API}/audit-logs", timeout=45).json()
        entities = {(log["entity"], log["action"]) for log in logs}
        assert ("quotation", "execute") in entities, "no audit entry for quotation execute"
        assert ("invoice", "create") in entities, "no audit entry for invoice create"


class TestDashboard:
    def test_admin_dashboard_all_sections(self, admin):
        r = admin.get(f"{API}/dashboard", timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ("quotations", "job_orders", "invoices", "customs", "weekly_prices", "arrivals_h2"):
            assert k in d, f"missing {k} in admin dashboard"
        assert d["role"] == "admin"

    def test_sales_dashboard_scoped(self, sales):
        d = sales.get(f"{API}/dashboard", timeout=45).json()
        assert "quotations" in d
        assert "invoices" not in d and "job_orders" not in d

    def test_finance_dashboard(self, finance):
        d = finance.get(f"{API}/dashboard", timeout=45).json()
        assert "invoices" in d and "job_orders" in d
        assert "quotations" not in d

    def test_customs_dashboard(self, customs):
        d = customs.get(f"{API}/dashboard", timeout=45).json()
        assert "customs" in d

    def test_pricing_dashboard(self, pricing):
        d = pricing.get(f"{API}/dashboard", timeout=45).json()
        assert "weekly_prices" in d

    def test_dashboard_requires_auth(self):
        r = requests.get(f"{API}/dashboard", timeout=45)
        assert r.status_code == 401
