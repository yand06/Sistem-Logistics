import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { toast } from "sonner";
import { PageHeader, Section, Card, CardHeader, Btn, Field, inputCls, Table, Modal, StatusBadge, formatCurrency } from "../../components/layout/UI";
import { Plus, FileCode2, CheckCircle2 } from "lucide-react";

export default function InvoicePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: invs = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.get("/invoices") });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => api.get("/customers") });
  const { data: jos = [] } = useQuery({ queryKey: ["job-orders"], queryFn: () => api.get("/job-orders") });

  const paidMut = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/mark-paid`, {}),
    onSuccess: () => {
      toast.success("Marked paid");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  async function exportXML(id: string, no: string) {
    const { xml, filename } = await api.get(`/invoices/${id}/coretax-xml`);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `CORETAX_${no}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} exported`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Invoices"
        subtitle="Issue tax-invoices, export XML for Coretax e-Faktur upload, and track payment status."
        actions={<Btn data-testid="new-invoice-btn" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Invoice</Btn>}
      />
      <Section>
        <Card>
          <CardHeader title={`Invoices (${invs.length})`} />
          <Table
            testId="invoice-table"
            columns={[
              { key: "invoice_no", label: "No." },
              { key: "invoice_date", label: "Date" },
              { key: "customer", label: "Customer", render: (r) => customers.find((c: any) => c.id === r.customer_id)?.name || "—" },
              { key: "subtotal", label: "Subtotal", align: "right", render: (r) => formatCurrency(r.subtotal, r.currency) },
              { key: "ppn_amount", label: "PPN", align: "right", render: (r) => formatCurrency(r.ppn_amount, r.currency) },
              { key: "total", label: "Total", align: "right", render: (r) => formatCurrency(r.total, r.currency) },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "act",
                label: "",
                align: "right",
                render: (r) => (
                  <div className="flex gap-2 justify-end">
                    <Btn variant="outline" data-testid={`xml-${r.id}`} onClick={() => exportXML(r.id, r.invoice_no)}>
                      <FileCode2 className="h-3.5 w-3.5" /> Coretax XML
                    </Btn>
                    {r.status !== "paid" && (
                      <Btn data-testid={`paid-${r.id}`} onClick={() => paidMut.mutate(r.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                      </Btn>
                    )}
                  </div>
                ),
              },
            ]}
            rows={invs}
          />
        </Card>
      </Section>

      <NewInvoice open={open} onClose={() => setOpen(false)} customers={customers} jos={jos} />
    </>
  );
}

function NewInvoice({ open, onClose, customers, jos }: any) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>({
    customer_id: "",
    job_order_id: "",
    invoice_no: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    currency: "IDR",
    ppn_pct: 11,
    notes: "",
    lines: [{ description: "Freight", qty: 1, unit: "LOT", price: 0, currency: "IDR" }],
  });
  const subtotal = f.lines.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.price || 0), 0);
  const ppn = subtotal * (Number(f.ppn_pct || 0) / 100);
  const total = subtotal + ppn;

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/invoices", b),
    onSuccess: () => {
      toast.success("Invoice issued");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  function updateLine(i: number, p: any) { setF((s: any) => ({ ...s, lines: s.lines.map((l: any, idx: number) => (idx === i ? { ...l, ...p } : l)) })); }
  function addLine() { setF((s: any) => ({ ...s, lines: [...s.lines, { description: "", qty: 1, unit: "LOT", price: 0, currency: s.currency }] })); }

  return (
    <Modal open={open} onClose={onClose} title="New Invoice" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Invoice No."><input className={inputCls} value={f.invoice_no} onChange={(e) => setF({ ...f, invoice_no: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} value={f.invoice_date} onChange={(e) => setF({ ...f, invoice_date: e.target.value })} /></Field>
          <Field label="Due Date"><input type="date" className={inputCls} value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <Field label="Customer">
            <select className={inputCls} value={f.customer_id} onChange={(e) => setF({ ...f, customer_id: e.target.value })}>
              <option value="">—</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Job Order (opt.)">
            <select className={inputCls} value={f.job_order_id} onChange={(e) => setF({ ...f, job_order_id: e.target.value })}>
              <option value="">—</option>
              {jos.map((j: any) => <option key={j.id} value={j.id}>{j.job_no}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <select className={inputCls} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              {["IDR", "USD", "EUR", "SGD"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Lines</div>
            <Btn variant="ghost" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add</Btn>
          </div>
          <div className="space-y-2">
            {f.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input className={`${inputCls} col-span-6`} placeholder="Description" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                <input className={`${inputCls} col-span-2`} type="number" placeholder="Qty" value={l.qty} onChange={(e) => updateLine(i, { qty: +e.target.value })} />
                <input className={`${inputCls} col-span-4`} type="number" placeholder="Price" value={l.price} onChange={(e) => updateLine(i, { price: +e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-3">
          <Field label="PPN %"><input type="number" className={inputCls} value={f.ppn_pct} onChange={(e) => setF({ ...f, ppn_pct: +e.target.value })} /></Field>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Subtotal</div><div className="font-mono font-bold text-lg">{subtotal.toLocaleString()}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">PPN</div><div className="font-mono font-bold text-lg text-amber-300">{ppn.toLocaleString()}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div><div className="font-mono font-bold text-lg text-blue-300" data-testid="inv-total">{total.toLocaleString()}</div></div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn data-testid="inv-submit" onClick={() => mut.mutate(f)}>Issue Invoice</Btn>
        </div>
      </div>
    </Modal>
  );
}
