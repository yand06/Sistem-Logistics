import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../store/auth";
import { useAuth } from "../store/auth";
import { toast } from "sonner";
import {
  PageHeader,
  Section,
  Card,
  CardHeader,
  Btn,
  Field,
  inputCls,
  Table,
  Modal,
  StatusBadge,
  formatCurrency,
} from "../components/layout/UI";
import { Plus, Zap, Trash2 } from "lucide-react";

export default function Quotation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: quots = [] } = useQuery({
    queryKey: ["quotations"],
    queryFn: () => api.get("/quotations"),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers"),
  });

  const executeMut = useMutation({
    mutationFn: (id: string) => api.post(`/quotations/${id}/execute`, {}),
    onSuccess: () => {
      toast.success("Quotation executed — CS can now create Job Order");
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Quotations"
        subtitle="Draft, calculate margins, and hand off executed quotes to Customer Service."
      />

      <Section>
        <div className="flex justify-end -mb-2">
          {user?.role === "admin" || user?.role === "sales" ? (
            <Btn
              data-testid="new-quotation-btn"
              className=" h-[40px]"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" /> New Quotation
            </Btn>
          ) : null}
        </div>
        <Card>
          <CardHeader title={`All Quotations (${quots.length})`} />
          <Table
            testId="quotation-table"
            columns={[
              { key: "quotation_no", label: "No." },
              {
                key: "customer",
                label: "Customer",
                render: (r) =>
                  customers.find((c: any) => c.id === r.customer_id)?.name ||
                  "—",
              },
              {
                key: "route",
                label: "Route",
                render: (r) => `${r.origin} → ${r.destination}`,
              },
              { key: "container_type", label: "Container" },
              {
                key: "total",
                label: "Total",
                align: "right",
                render: (r) =>
                  formatCurrency(r.total, r.lines?.[0]?.currency || "IDR"),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: "actions",
                label: "",
                render: (r) =>
                  r.status === "draft" &&
                  (user?.role === "sales" || user?.role === "admin") ? (
                    <Btn
                      variant="outline"
                      data-testid={`execute-${r.id}`}
                      onClick={() => executeMut.mutate(r.id)}
                    >
                      <Zap className="h-3.5 w-3.5" /> Execute
                    </Btn>
                  ) : null,
              },
            ]}
            rows={quots}
            empty="No quotations yet. Create one to start the pipeline."
          />
        </Card>
      </Section>
      <QuotationForm
        open={open}
        onClose={() => setOpen(false)}
        customers={customers}
      />
    </>
  );
}

function QuotationForm({ open, onClose, customers }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    customer_id: "",
    origin: "",
    destination: "",
    container_type: "20GP",
    weight_kg: 0,
    volume_cbm: 0,
    margin_pct: 10,
    notes: "",
    lines: [
      {
        description: "Ocean Freight",
        qty: 1,
        unit: "LOT",
        price: 0,
        currency: "USD",
      },
    ],
  });

  const subtotal = form.lines.reduce(
    (s: number, l: any) => s + Number(l.qty || 0) * Number(l.price || 0),
    0,
  );
  const marginAmt = subtotal * (Number(form.margin_pct || 0) / 100);
  const total = subtotal + marginAmt;

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/quotations", b),
    onSuccess: () => {
      toast.success("Quotation created");
      qc.invalidateQueries({ queryKey: ["quotations"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  function updateLine(i: number, patch: any) {
    setForm((f: any) => ({
      ...f,
      lines: f.lines.map((l: any, idx: number) =>
        idx === i ? { ...l, ...patch } : l,
      ),
    }));
  }
  function addLine() {
    setForm((f: any) => ({
      ...f,
      lines: [
        ...f.lines,
        { description: "", qty: 1, unit: "LOT", price: 0, currency: "USD" },
      ],
    }));
  }
  function removeLine(i: number) {
    setForm((f: any) => ({
      ...f,
      lines: f.lines.filter((_: any, idx: number) => idx !== i),
    }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Quotation"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer">
            <select
              data-testid="q-customer"
              value={form.customer_id}
              onChange={(e) =>
                setForm({ ...form, customer_id: e.target.value })
              }
              className={inputCls}
              required
            >
              <option value="">— Select —</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Container Type">
            <select
              value={form.container_type}
              onChange={(e) =>
                setForm({ ...form, container_type: e.target.value })
              }
              className={inputCls}
            >
              {["20GP", "40GP", "40HC", "LCL", "AIR"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Origin Port">
            <input
              data-testid="q-origin"
              className={inputCls}
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="Tanjung Priok"
            />
          </Field>
          <Field label="Destination Port">
            <input
              data-testid="q-dest"
              className={inputCls}
              value={form.destination}
              onChange={(e) =>
                setForm({ ...form, destination: e.target.value })
              }
              placeholder="Singapore"
            />
          </Field>
          <Field label="Weight (KG)">
            <input
              type="number"
              className={inputCls}
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: +e.target.value })}
            />
          </Field>
          <Field label="Volume (CBM)">
            <input
              type="number"
              className={inputCls}
              value={form.volume_cbm}
              onChange={(e) =>
                setForm({ ...form, volume_cbm: +e.target.value })
              }
            />
          </Field>
          <Field label="Margin %">
            <input
              data-testid="q-margin"
              type="number"
              className={inputCls}
              value={form.margin_pct}
              onChange={(e) =>
                setForm({ ...form, margin_pct: +e.target.value })
              }
            />
          </Field>
        </div>

        <div className="border-t border-slate-300 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Cost Lines
            </div>
            <Btn variant="ghost" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Btn>
          </div>
          <div className="space-y-2">
            {form.lines.map((l: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  placeholder="Description"
                  className={`${inputCls} col-span-5`}
                  value={l.description}
                  onChange={(e) =>
                    updateLine(i, { description: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Qty"
                  className={`${inputCls} col-span-1`}
                  value={l.qty}
                  onChange={(e) => updateLine(i, { qty: +e.target.value })}
                />
                <input
                  placeholder="Unit"
                  className={`${inputCls} col-span-1`}
                  value={l.unit}
                  onChange={(e) => updateLine(i, { unit: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className={`${inputCls} col-span-2`}
                  value={l.price}
                  onChange={(e) => updateLine(i, { price: +e.target.value })}
                />
                <select
                  className={`${inputCls} col-span-2`}
                  value={l.currency}
                  onChange={(e) => updateLine(i, { currency: e.target.value })}
                >
                  {["USD", "IDR", "EUR", "SGD"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  className="col-span-1 text-red-400 hover:text-red-600"
                  onClick={() => removeLine(i)}
                >
                  <Trash2 className="h-4 w-4 mx-auto" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Subtotal
            </div>
            <div className="font-display font-bold text-lg font-mono text-slate-900">
              {subtotal.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Margin ({form.margin_pct}%)
            </div>
            <div className="font-display font-bold text-lg text-emerald-700 font-mono">
              {marginAmt.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Total
            </div>
            <div
              className="font-display font-bold text-lg text-slate-900 font-mono"
              data-testid="q-total"
            >
              {total.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn data-testid="q-submit" onClick={() => mut.mutate(form)}>
            Create Quotation
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
