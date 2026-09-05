"""Pricing module: weekly prices, LCL calc, import tax calc, trucking rates RBAC."""
from conftest import API


class TestLCLCalc:
    def test_lcl_calc_volume_greater(self, pricing):
        r = pricing.post(
            f"{API}/pricing/lcl-calc",
            json={"weight_kg": 500, "volume_cbm": 2, "rate_per_cbm": 100, "minimum_charge": 50},
            timeout=45,
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["chargeable_weight"] == 2
        assert d["price"] == 200
        assert d["breakdown"]["weight_ton"] == 0.5

    def test_lcl_calc_weight_greater(self, pricing):
        r = pricing.post(
            f"{API}/pricing/lcl-calc",
            json={"weight_kg": 5000, "volume_cbm": 2, "rate_per_cbm": 100},
            timeout=45,
        )
        d = r.json()
        assert d["chargeable_weight"] == 5
        assert d["price"] == 500

    def test_lcl_minimum_charge_applies(self, pricing):
        r = pricing.post(
            f"{API}/pricing/lcl-calc",
            json={"weight_kg": 10, "volume_cbm": 0.1, "rate_per_cbm": 100, "minimum_charge": 75},
            timeout=45,
        )
        assert r.json()["price"] == 75

    def test_lcl_validation_error(self, pricing):
        r = pricing.post(f"{API}/pricing/lcl-calc", json={"volume_cbm": 2}, timeout=45)
        assert r.status_code == 422


class TestImportTaxCalc:
    def test_import_tax_calc(self, sales):
        r = sales.post(
            f"{API}/pricing/import-tax-calc",
            json={
                "fob_value": 10000,
                "freight": 500,
                "insurance": 100,
                "kurs": 15850,
                "bm_pct": 5,
                "ppn_pct": 11,
                "pph_pct": 2.5,
            },
            timeout=45,
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        cif = 10600 * 15850
        bm = cif * 0.05
        nilai = cif + bm
        assert d["cif_foreign"] == 10600
        assert d["cif_idr"] == round(cif, 2)
        assert d["bea_masuk"] == round(bm, 2)
        assert d["nilai_impor"] == round(nilai, 2)
        assert d["ppn"] == round(nilai * 0.11, 2)
        assert d["pph"] == round(nilai * 0.025, 2)
        assert d["total_pajak"] == round(bm + nilai * 0.11 + nilai * 0.025, 2)

    def test_import_tax_requires_kurs(self, sales):
        r = sales.post(f"{API}/pricing/import-tax-calc", json={"fob_value": 100}, timeout=45)
        assert r.status_code == 422


class TestTruckingRates:
    def test_pricing_can_create(self, pricing):
        r = pricing.post(
            f"{API}/trucking-rates",
            json={"origin": "TEST_Priok", "destination": "TEST_Bogor", "container_type": "20GP", "rate": 3000000},
            timeout=45,
        )
        assert r.status_code in (200, 201), r.text[:300]
        d = r.json()
        assert d["rate"] == 3000000 and d["currency"] == "IDR"
        lst = pricing.get(f"{API}/trucking-rates", timeout=45).json()
        assert any(x["id"] == d["id"] for x in lst)

    def test_sales_cannot_create_trucking(self, sales):
        r = sales.post(
            f"{API}/trucking-rates",
            json={"origin": "A", "destination": "B", "rate": 1},
            timeout=45,
        )
        assert r.status_code == 403

    def test_seeded_trucking_rates_exist(self, admin):
        lst = admin.get(f"{API}/trucking-rates", timeout=45).json()
        assert len(lst) >= 4


class TestWeeklyPrices:
    def test_upsert_weekly_price(self, pricing):
        payload = {
            "lane": "TEST_JKT->SIN",
            "container_type": "20GP",
            "ocean_freight": 500,
            "thc_origin": 100,
            "thc_dest": 120,
            "doc_fee": 50,
            "currency": "USD",
            "week_of": "2026-01-05",
        }
        r = pricing.post(f"{API}/weekly-prices", json=payload, timeout=45)
        assert r.status_code in (200, 201), r.text[:300]
        assert r.json()["ocean_freight"] == 500

        payload["ocean_freight"] = 650
        r2 = pricing.post(f"{API}/weekly-prices", json=payload, timeout=45)
        assert r2.status_code in (200, 201)
        assert "_id" not in r2.json(), "weekly-price upsert-update leaks Mongo _id"
        lst = [
            x for x in pricing.get(f"{API}/weekly-prices", timeout=45).json()
            if x["lane"] == "TEST_JKT->SIN" and x["week_of"] == "2026-01-05"
        ]
        assert len(lst) == 1, f"duplicate weekly prices: {len(lst)}"
        assert lst[0]["ocean_freight"] == 650

    def test_cs_cannot_create_weekly_price(self, cs):
        r = cs.post(
            f"{API}/weekly-prices",
            json={"lane": "X", "container_type": "20GP", "ocean_freight": 1, "week_of": "2026-01-05"},
            timeout=45,
        )
        assert r.status_code == 403
