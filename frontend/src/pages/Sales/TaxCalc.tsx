import React, { useState } from "react";
import { api } from "../../store/auth";
import { PageHeader, Section, Card, Btn, Field, inputCls, formatCurrency } from "../../components/layout/UI";
import { Calculator } from "lucide-react";

export default function TaxCalc() {
  const [f, setF] = useState<any>({ fob_value: 10000, freight: 500, insurance: 100, currency: "USD", kurs: 15850, bm_pct: 5, ppn_pct: 11, pph_pct: 2.5 });
  const [res, setRes] = useState<any>(null);
  async function calc() {
    const r = await api.post("/pricing/import-tax-calc", f);
    setRes(r);
  }
  return (
    <>
      <PageHeader eyebrow="Sales tools" title="Import Tax Calculator" subtitle="Estimate PPN, PPh 22 & Bea Masuk on FOB + freight + insurance in IDR." />
      <Section>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Inputs
          </div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <Field label="FOB Value"><input type="number" className={inputCls} value={f.fob_value} onChange={(e) => setF({ ...f, fob_value: +e.target.value })} data-testid="tax-fob" /></Field>
            <Field label="Freight"><input type="number" className={inputCls} value={f.freight} onChange={(e) => setF({ ...f, freight: +e.target.value })} /></Field>
            <Field label="Insurance"><input type="number" className={inputCls} value={f.insurance} onChange={(e) => setF({ ...f, insurance: +e.target.value })} /></Field>
            <Field label="Currency">
              <select className={inputCls} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                {["USD", "EUR", "SGD", "RMB"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Kurs (to IDR)"><input type="number" className={inputCls} value={f.kurs} onChange={(e) => setF({ ...f, kurs: +e.target.value })} data-testid="tax-kurs" /></Field>
            <Field label="BM %"><input type="number" className={inputCls} value={f.bm_pct} onChange={(e) => setF({ ...f, bm_pct: +e.target.value })} data-testid="tax-bm" /></Field>
            <Field label="PPN %"><input type="number" className={inputCls} value={f.ppn_pct} onChange={(e) => setF({ ...f, ppn_pct: +e.target.value })} /></Field>
            <Field label="PPh 22 %"><input type="number" className={inputCls} value={f.pph_pct} onChange={(e) => setF({ ...f, pph_pct: +e.target.value })} /></Field>
            <Btn data-testid="tax-calc" onClick={calc}>Calculate</Btn>
          </div>
        </Card>
        {res && (
          <Card className="p-6">
            <div className="grid grid-cols-4 gap-6">
              {[
                ["CIF (IDR)", res.cif_idr, "text-slate-100"],
                ["Bea Masuk", res.bea_masuk, "text-cyan-300"],
                ["Nilai Impor", res.nilai_impor, "text-slate-100"],
                ["PPN", res.ppn, "text-amber-300"],
                ["PPh 22", res.pph, "text-amber-300"],
                ["TOTAL PAJAK", res.total_pajak, "text-rose-300"],
              ].map(([k, v, t]) => (
                <div key={k as string}>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{k as string}</div>
                  <div className={`font-mono font-bold text-xl ${t}`} data-testid={`tax-${(k as string).toLowerCase().replace(/[^a-z]/g, "")}`}>
                    {formatCurrency(v as number)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Section>
    </>
  );
}
