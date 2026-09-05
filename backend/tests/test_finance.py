"""Finance module: invoices, PPN computation, coretax XML, kurs upsert, partners, SOA."""
from datetime import datetime, timedelta, timezone

import pytest

from conftest import API


@pytest.fixture(scope="module")
def customer_id(admin):
    r = admin.post(f"{API}/customers", json={"name": "TEST_Finance Cust", "npwp": "11.111.111.1-111.000", "address": "Jl. Fin"}, timeout=45)
    assert r.status_code in (200, 201)
    return r.json()["id"]


@pytest.fixture(scope="module")
def invoice(finance, customer_id):
    payload = {
        "customer_id": customer_id,
        "invoice_no": f"TEST-INV-{datetime.now().strftime('%H%M%S%f')}",
        "invoice_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "currency": "IDR",
        "lines": [
            {"description": "Freight", "qty": 2, "price": 1000000, "unit": "CTR", "currency": "IDR"},
            {"description": "Handling", "qty": 1, "price": 500000, "unit": "LOT", "currency": "IDR"},
        ],
        "ppn_pct": 11,
    }
    r = finance.post(f"{API}/invoices", json=payload, timeout=45)
    assert r.status_code in (200, 201), r.text[:300]
    return r.json()


class TestInvoice:
    def test_invoice_totals(self, invoice):
        assert invoice["subtotal"] == 2500000
        assert invoice["ppn_amount"] == 275000
        assert invoice["total"] == 2775000
        assert invoice["status"] == "unpaid"
        assert "_id" not in invoice

    def test_invoice_persisted(self, finance, invoice):
        lst = finance.get(f"{API}/invoices", timeout=45).json()
        got = [x for x in lst if x["id"] == invoice["id"]]
        assert got and got[0]["total"] == 2775000

    def test_sales_cannot_create_invoice(self, sales, customer_id):
        r = sales.post(
            f"{API}/invoices",
            json={"customer_id": customer_id, "invoice_no": "TEST-X", "invoice_date": "2026-07-01", "lines": []},
            timeout=45,
        )
        assert r.status_code == 403

    def test_pricing_cannot_list_invoices(self, pricing):
        r = pricing.get(f"{API}/invoices", timeout=45)
        assert r.status_code == 403

    def test_coretax_xml(self, finance, invoice):
        r = finance.get(f"{API}/invoices/{invoice['id']}/coretax-xml", timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        xml = d["xml"]
        assert xml.startswith('<?xml version="1.0"')
        assert f"<InvoiceNo>{invoice['invoice_no']}</InvoiceNo>" in xml
        assert "<NPWP>11.111.111.1-111.000</NPWP>" in xml
        assert "<Total>2775000" in xml
        assert xml.count("<LineItem>") == 2
        assert d["filename"] == f"CORETAX_{invoice['invoice_no']}.xml"

    def test_coretax_xml_404(self, finance):
        r = finance.get(f"{API}/invoices/nope/coretax-xml", timeout=45)
        assert r.status_code == 404

    def test_mark_paid(self, finance, invoice):
        r = finance.post(f"{API}/invoices/{invoice['id']}/mark-paid", timeout=45)
        assert r.status_code == 200
        lst = finance.get(f"{API}/invoices", timeout=45).json()
        got = [x for x in lst if x["id"] == invoice["id"]][0]
        assert got["status"] == "paid" and got.get("paid_at")


class TestSOA:
    def test_soa(self, finance, customer_id, invoice):
        r = finance.get(f"{API}/soa/{customer_id}", timeout=45)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["customer_id"] == customer_id
        assert isinstance(d["invoices"], list) and len(d["invoices"]) >= 1
        assert d["total"] >= 2775000
        assert "outstanding" in d

    def test_soa_forbidden_for_cs(self, cs, customer_id):
        r = cs.get(f"{API}/soa/{customer_id}", timeout=45)
        assert r.status_code == 403


class TestKurs:
    def test_upsert_kurs_creates_then_updates(self, finance):
        week_of = "2026-01-05"
        r1 = finance.post(f"{API}/kurs", json={"currency": "usd", "rate": 15850, "week_of": week_of}, timeout=45)
        assert r1.status_code in (200, 201), r1.text[:300]
        d1 = r1.json()
        assert d1["currency"] == "USD" and d1["rate"] == 15850
        assert "_id" not in d1

        before = len([k for k in finance.get(f"{API}/kurs", timeout=45).json() if k["week_of"] == week_of and k["currency"] == "USD"])
        r2 = finance.post(f"{API}/kurs", json={"currency": "USD", "rate": 16000, "week_of": week_of}, timeout=45)
        assert r2.status_code in (200, 201), r2.text[:300]
        assert "_id" not in r2.json(), "upsert-update path leaks Mongo _id"
        after = [k for k in finance.get(f"{API}/kurs", timeout=45).json() if k["week_of"] == week_of and k["currency"] == "USD"]
        assert before == 1 and len(after) == 1, f"duplicate kurs rows: {after}"
        assert after[0]["rate"] == 16000

    def test_kurs_eur(self, finance):
        r = finance.post(f"{API}/kurs", json={"currency": "EUR", "rate": 17250, "week_of": "2026-01-05"}, timeout=45)
        assert r.status_code in (200, 201)
        assert r.json()["rate"] == 17250

    def test_sales_cannot_post_kurs(self, sales):
        r = sales.post(f"{API}/kurs", json={"currency": "SGD", "rate": 1, "week_of": "2026-01-05"}, timeout=45)
        assert r.status_code == 403

    def test_kurs_readable_by_all(self, pricing):
        r = pricing.get(f"{API}/kurs", timeout=45)
        assert r.status_code == 200 and isinstance(r.json(), list)


class TestPartner:
    def test_create_partner_with_bank(self, finance):
        payload = {
            "name": "TEST_Partner Trucking",
            "type": "trucking",
            "contact_person": "Budi",
            "phone": "+62-812",
            "email": "budi@partner.test",
            "bank_name": "BCA",
            "bank_account_no": "1234567890",
            "bank_account_holder": "PT Partner Trucking",
        }
        r = finance.post(f"{API}/partners", json=payload, timeout=45)
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert d["bank_name"] == "BCA" and d["bank_account_no"] == "1234567890"
        assert d["bank_account_holder"] == "PT Partner Trucking"
        lst = finance.get(f"{API}/partners", timeout=45).json()
        got = [x for x in lst if x["id"] == d["id"]]
        assert got and got[0]["bank_account_no"] == "1234567890"

    def test_cs_cannot_create_partner(self, cs):
        r = cs.post(f"{API}/partners", json={"name": "TEST_NoPerm"}, timeout=45)
        assert r.status_code == 403
