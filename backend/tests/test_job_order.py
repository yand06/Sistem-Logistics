"""Job Order module: CS vs Finance field RBAC, shipment status, documents auto-rename, schedule arrive."""
from datetime import datetime, timedelta, timezone

import pytest

from conftest import API


@pytest.fixture(scope="module")
def executed_quotation(sales):
    cust = sales.get(f"{API}/customers", timeout=45).json()[0]
    q = sales.post(
        f"{API}/quotations",
        json={
            "customer_id": cust["id"],
            "origin": "Tanjung Priok",
            "destination": "Port Klang",
            "margin_pct": 15,
            "lines": [{"description": "TEST_line", "qty": 1, "price": 1000}],
        },
        timeout=45,
    )
    assert q.status_code in (200, 201), q.text[:300]
    qd = q.json()
    ex = sales.post(f"{API}/quotations/{qd['id']}/execute", timeout=45)
    assert ex.status_code == 200
    return {"quotation_id": qd["id"], "customer_id": cust["id"]}


@pytest.fixture(scope="module")
def job_order(cs, executed_quotation):
    eta = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    r = cs.post(
        f"{API}/job-orders",
        json={
            "quotation_id": executed_quotation["quotation_id"],
            "customer_id": executed_quotation["customer_id"],
            "shipper": "TEST_Shipper",
            "consignee": "TEST_Consignee",
            "origin": "Tanjung Priok",
            "destination": "Port Klang",
            "eta": eta,
            "etd": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "vessel": "MV TEST",
            "voyage": "V001",
        },
        timeout=45,
    )
    assert r.status_code in (200, 201), r.text[:300]
    return r.json()


class TestJobOrder:
    def test_create_job_order(self, job_order):
        assert job_order["job_no"].startswith("JO-")
        assert job_order["status"] == "booking"
        assert isinstance(job_order["shipment_status"], list) and len(job_order["shipment_status"]) == 1
        assert job_order["shipment_status"][0]["stage"] == "booking"
        assert "_id" not in job_order

    def test_job_order_requires_executed_quotation(self, cs, sales):
        cust = sales.get(f"{API}/customers", timeout=45).json()[0]
        q = sales.post(
            f"{API}/quotations",
            json={"customer_id": cust["id"], "origin": "A", "destination": "B"},
            timeout=45,
        ).json()
        r = cs.post(
            f"{API}/job-orders",
            json={"quotation_id": q["id"], "customer_id": cust["id"], "origin": "A", "destination": "B"},
            timeout=45,
        )
        assert r.status_code == 400

    def test_sales_cannot_create_job_order(self, sales, executed_quotation):
        r = sales.post(
            f"{API}/job-orders",
            json={
                "quotation_id": executed_quotation["quotation_id"],
                "customer_id": executed_quotation["customer_id"],
                "origin": "A",
                "destination": "B",
            },
            timeout=45,
        )
        assert r.status_code == 403

    def test_cs_patch_drops_finance_fields(self, cs, job_order):
        jid = job_order["id"]
        r = cs.patch(f"{API}/job-orders/{jid}", json={"vessel": "MV CS EDIT", "buy_rate": 999999}, timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["vessel"] == "MV CS EDIT"
        assert d.get("buy_rate") in (None,), f"CS was able to set buy_rate: {d.get('buy_rate')}"

    def test_cs_patch_only_finance_fields_rejected(self, cs, job_order):
        r = cs.patch(f"{API}/job-orders/{job_order['id']}", json={"buy_rate": 100}, timeout=45)
        assert r.status_code == 400

    def test_finance_patch_rates_succeeds(self, finance, job_order):
        jid = job_order["id"]
        r = finance.patch(f"{API}/job-orders/{jid}", json={"buy_rate": 1000, "sell_rate": 1500, "kasbon": 50}, timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["buy_rate"] == 1000 and d["sell_rate"] == 1500 and d["kasbon"] == 50
        # persistence via list
        lst = finance.get(f"{API}/job-orders", timeout=45).json()
        got = [x for x in lst if x["id"] == jid][0]
        assert got["buy_rate"] == 1000

    def test_cs_list_hides_finance_fields(self, cs, job_order):
        lst = cs.get(f"{API}/job-orders", timeout=45).json()
        got = [x for x in lst if x["id"] == job_order["id"]]
        assert got, "job order not visible to CS"
        for f in ("buy_rate", "sell_rate", "kasbon", "finance_notes"):
            assert f not in got[0], f"finance field {f} leaked to CS"

    def test_pricing_role_cannot_patch_job_order(self, pricing, job_order):
        r = pricing.patch(f"{API}/job-orders/{job_order['id']}", json={"vessel": "X"}, timeout=45)
        assert r.status_code == 403

    def test_shipment_status_push(self, cs, job_order):
        jid = job_order["id"]
        r = cs.post(f"{API}/job-orders/{jid}/shipment-status", json={"stage": "on_vessel", "note": "TEST_sailed"}, timeout=45)
        assert r.status_code == 200, r.text[:300]
        lst = cs.get(f"{API}/job-orders", timeout=45).json()
        got = [x for x in lst if x["id"] == jid][0]
        assert got["status"] == "on_vessel"
        stages = [s["stage"] for s in got["shipment_status"]]
        assert stages[-1] == "on_vessel"
        assert len(got["shipment_status"]) >= 2

    def test_shipment_status_forbidden_for_sales(self, sales, job_order):
        r = sales.post(f"{API}/job-orders/{job_order['id']}/shipment-status", json={"stage": "delivered"}, timeout=45)
        assert r.status_code == 403

    def test_shipment_status_nonexistent_job(self, cs):
        r = cs.post(f"{API}/job-orders/does-not-exist/shipment-status", json={"stage": "delivered"}, timeout=45)
        assert r.status_code == 404, (
            f"expected 404 for unknown job order, got {r.status_code} (silent no-op update)"
        )


class TestDocuments:
    def test_document_auto_rename(self, cs, job_order):
        r = cs.post(
            f"{API}/documents",
            json={"job_order_id": job_order["id"], "doc_type": "BL", "file_name": "scan upload.pdf"},
            timeout=45,
        )
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        expected = f"{job_order['job_no']}_BL_{datetime.now().strftime('%Y%m%d')}.pdf"
        assert d["auto_name"] == expected, f"{d['auto_name']} != {expected}"
        lst = cs.get(f"{API}/documents", timeout=45).json()
        assert any(x["id"] == d["id"] and x["auto_name"] == expected for x in lst)

    def test_document_without_job_order(self, cs):
        r = cs.post(f"{API}/documents", json={"doc_type": "COO", "file_name": "a.jpg"}, timeout=45)
        assert r.status_code in (200, 201)
        assert r.json()["auto_name"] is None


class TestScheduleArrive:
    def test_schedule_arrive_lists_h2(self, cs, job_order):
        r = cs.get(f"{API}/schedule-arrive", timeout=45)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert job_order["id"] in ids, f"JO with eta today+1 not in schedule-arrive: {ids}"

    def test_confirm_arrive_removes_from_list(self, cs, job_order):
        r = cs.post(f"{API}/schedule-arrive/{job_order['id']}/confirm", json={"confirmed": True, "note": "TEST"}, timeout=45)
        assert r.status_code == 200, r.text[:300]
        lst = cs.get(f"{API}/schedule-arrive", timeout=45).json()
        assert job_order["id"] not in [x["id"] for x in lst]
