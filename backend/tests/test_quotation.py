"""Quotation module (Sales): create, totals computation, execute, isolation."""
import pytest

from conftest import API


@pytest.fixture(scope="module")
def sales_customer_id(sales):
    docs = sales.get(f"{API}/customers", timeout=45).json()
    assert docs, "sales has no visible customers"
    return docs[0]["id"]


class TestQuotation:
    def test_create_quotation_computes_totals(self, sales, sales_customer_id):
        payload = {
            "customer_id": sales_customer_id,
            "origin": "Jakarta",
            "destination": "Singapore",
            "container_type": "20GP",
            "weight_kg": 1000,
            "volume_cbm": 20,
            "margin_pct": 10,
            "lines": [
                {"description": "Ocean Freight", "qty": 2, "unit": "CTR", "price": 1000, "currency": "USD"},
                {"description": "THC", "qty": 1, "unit": "LOT", "price": 500, "currency": "USD"},
            ],
            "notes": "TEST_quotation",
        }
        r = sales.post(f"{API}/quotations", json=payload, timeout=45)
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert "_id" not in d
        assert d["subtotal"] == 2500
        assert d["margin_amount"] == 250
        assert d["total"] == 2750
        assert d["status"] == "draft"
        assert d["sales_id"] == sales.user["id"]
        assert d["quotation_no"].startswith("QTN-")
        pytest.qid = d["id"]

        # verify persisted via GET
        lst = sales.get(f"{API}/quotations", timeout=45).json()
        found = [q for q in lst if q["id"] == d["id"]]
        assert found, "quotation not returned by GET"
        assert found[0]["total"] == 2750

    def test_quotation_invalid_customer_400(self, sales):
        r = sales.post(
            f"{API}/quotations",
            json={"customer_id": "nope", "origin": "A", "destination": "B"},
            timeout=45,
        )
        assert r.status_code == 400

    def test_sales_cannot_quote_other_sales_customer(self, admin, sales):
        c = admin.post(f"{API}/customers", json={"name": "TEST_Other Sales Cust"}, timeout=45).json()
        r = sales.post(
            f"{API}/quotations",
            json={"customer_id": c["id"], "origin": "A", "destination": "B"},
            timeout=45,
        )
        assert r.status_code == 403, r.status_code

    def test_cs_cannot_create_quotation(self, cs, sales_customer_id):
        r = cs.post(
            f"{API}/quotations",
            json={"customer_id": sales_customer_id, "origin": "A", "destination": "B"},
            timeout=45,
        )
        assert r.status_code == 403

    def test_execute_quotation(self, sales):
        qid = getattr(pytest, "qid", None)
        assert qid, "no quotation created"
        r = sales.post(f"{API}/quotations/{qid}/execute", timeout=45)
        assert r.status_code == 200, r.text[:300]
        assert r.json() == {"ok": True}
        lst = sales.get(f"{API}/quotations", timeout=45).json()
        q = [x for x in lst if x["id"] == qid][0]
        assert q["status"] == "executed"
        assert q.get("executed_at")

    def test_execute_nonexistent_404(self, sales):
        r = sales.post(f"{API}/quotations/nope/execute", timeout=45)
        assert r.status_code == 404

    def test_sales_quotation_isolation(self, sales):
        docs = sales.get(f"{API}/quotations", timeout=45).json()
        for d in docs:
            assert d["sales_id"] == sales.user["id"]
