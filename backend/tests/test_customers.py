"""Customers (Master Customer) module: CRUD + per-sales data isolation."""
import pytest

from conftest import API


class TestCustomers:
    created = []

    def test_sales_sees_only_own_customers(self, sales):
        r = sales.get(f"{API}/customers", timeout=45)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list) and len(docs) >= 3, f"expected >=3 seeded customers, got {len(docs)}"
        sid = sales.user["id"]
        for d in docs:
            assert d["sales_id"] == sid, f"sales sees customer of other sales: {d}"
            assert "_id" not in d

    def test_admin_sees_all_customers(self, admin, sales):
        a = admin.get(f"{API}/customers", timeout=45)
        s = sales.get(f"{API}/customers", timeout=45)
        assert a.status_code == 200
        assert len(a.json()) >= len(s.json())

    def test_admin_create_customer_assign_sales_and_persist(self, admin, sales):
        payload = {
            "name": "TEST_Admin Assigned Cust",
            "npwp": "09.876.543.2-101.000",
            "address": "Jl. Test 1",
            "contact_person": "QA",
            "phone": "+62-21-000",
            "email": "qa_cust@example.com",
            "payment_terms": "NET 45",
            "sales_id": sales.user["id"],
        }
        r = admin.post(f"{API}/customers", json=payload, timeout=45)
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert "_id" not in d
        assert d["name"] == payload["name"]
        assert d["sales_id"] == sales.user["id"]
        assert d["payment_terms"] == "NET 45"
        TestCustomers.created.append(d["id"])

        # verify persistence via admin GET
        got = admin.get(f"{API}/customers", timeout=45).json()
        found = [c for c in got if c["id"] == d["id"]]
        assert found and found[0]["npwp"] == payload["npwp"]

        # verify visible to assigned sales
        s_list = sales.get(f"{API}/customers", timeout=45).json()
        assert any(c["id"] == d["id"] for c in s_list)

    def test_sales_created_customer_forced_own_ownership(self, sales, admin):
        r = sales.post(
            f"{API}/customers",
            json={"name": "TEST_Sales Own Cust", "sales_id": "some-other-id"},
            timeout=45,
        )
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        TestCustomers.created.append(d["id"])
        assert d["sales_id"] == sales.user["id"], "sales must not be able to assign another owner"

    def test_finance_cannot_create_customer(self, finance):
        r = finance.post(f"{API}/customers", json={"name": "TEST_Forbidden"}, timeout=45)
        assert r.status_code == 403, r.status_code

    def test_patch_customer(self, admin):
        r = admin.post(f"{API}/customers", json={"name": "TEST_Patch Cust"}, timeout=45)
        cid = r.json()["id"]
        TestCustomers.created.append(cid)
        p = admin.patch(f"{API}/customers/{cid}", json={"phone": "+62-999"}, timeout=45)
        assert p.status_code == 200, p.text[:300]
        assert p.json()["phone"] == "+62-999"
        assert p.json()["name"] == "TEST_Patch Cust"

    def test_patch_nonexistent_customer_404(self, admin):
        r = admin.patch(f"{API}/customers/does-not-exist", json={"phone": "1"}, timeout=45)
        assert r.status_code == 404

    def test_sales_cannot_patch_other_sales_customer(self, admin, sales):
        # customer owned by admin
        c = admin.post(f"{API}/customers", json={"name": "TEST_Admin Owned"}, timeout=45).json()
        TestCustomers.created.append(c["id"])
        r = sales.patch(f"{API}/customers/{c['id']}", json={"phone": "9"}, timeout=45)
        assert r.status_code == 404

    def test_no_delete_endpoint_for_customers(self, admin):
        """Documented gap: DELETE /api/customers/{id} not implemented."""
        if not TestCustomers.created:
            pytest.skip("nothing created")
        r = admin.delete(f"{API}/customers/{TestCustomers.created[0]}", timeout=45)
        assert r.status_code in (200, 204), (
            f"No DELETE endpoint for customers (got {r.status_code}) - test data cannot be cleaned up"
        )
