import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../store/auth";
import { useAuth } from "../store/auth";
import { toast } from "sonner";
import { PageHeader, Section, Card, CardHeader, Btn, Field, inputCls, Table, Modal, StatusBadge } from "../components/layout/UI";
import { Plus, MoveRight } from "lucide-react";

const STAGES = ["booking", "picked_up", "port_loading", "on_vessel", "customs_cleared", "delivered"];

export default function JobOrder() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { data: jos = [] } = useQuery({ queryKey: ["job-orders"], queryFn: () => api.get("/job-orders") });
  const { data: quots = [] } = useQuery({ queryKey: ["quotations"], queryFn: () => api.get("/quotations") });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => api.get("/customers") });

  const stageMut = useMutation({
    mutationFn: ({ id, stage }: any) => api.post(`/job-orders/${id}/shipment-status`, { stage }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["job-orders"] });
    },
  });

  const isFinance = user?.role === "finance" || user?.role === "admin";
  const isCS = user?.role === "cs";

  const cols: any[] = [
    { key: "job_no", label: "Job No." },
    { key: "customer", label: "Customer", render: (r: any) => customers.find((c: any) => c.id === r.customer_id)?.name || "—" },
    { key: "route", label: "Route", render: (r: any) => `${r.origin} → ${r.destination}` },
    { key: "vessel", label: "Vessel" },
    { key: "eta", label: "ETA" },
    { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status || "booking"} /> },
  ];
  if (isFinance) {
    cols.push(
      { key: "buy_rate", label: "Buy", align: "right", render: (r: any) => r.buy_rate?.toLocaleString() || "—" },
      { key: "sell_rate", label: "Sell", align: "right", render: (r: any) => r.sell_rate?.toLocaleString() || "—" },
      { key: "margin", label: "Margin", align: "right", render: (r: any) => (r.sell_rate && r.buy_rate) ? <span className="text-emerald-300">{(r.sell_rate - r.buy_rate).toLocaleString()}</span> : "—" }
    );
  }
  cols.push({
    key: "actions",
    label: "",
    render: (r: any) => (
      <div className="flex gap-2 justify-end">
        <Btn variant="outline" onClick={() => setSelected(r)}>Open</Btn>
      </div>
    ),
    align: "right",
  });

  return (
    <>
      <PageHeader
        eyebrow={`${user?.role.toUpperCase()} Access`}
        title="Job Orders"
        subtitle={
          isCS
            ? "You can create & update operational fields. Finance columns are locked to your role."
            : isFinance
              ? "Full access — includes buy/sell rates and margin."
              : "Read-only view."
        }
        actions={
          (isCS || isFinance) && (
            <Btn data-testid="new-jo-btn" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Job Order
            </Btn>
          )
        }
      />
      <Section>
        <Card>
          <CardHeader title={`Job Orders (${jos.length})`} />
          <Table testId="jo-table" columns={cols} rows={jos} empty="No job orders yet. Execute a quotation to enable creation." />
        </Card>
      </Section>

      <NewJOForm open={open} onClose={() => setOpen(false)} quotations={quots.filter((q: any) => q.status === "executed")} />
      {selected && (
        <JODetail
          jo={selected}
          onClose={() => setSelected(null)}
          role={user?.role || ""}
          onAdvance={(stage) => stageMut.mutate({ id: selected.id, stage })}
          customers={customers}
        />
      )}
    </>
  );
}

function NewJOForm({ open, onClose, quotations }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({
    quotation_id: "",
    customer_id: "",
    origin: "",
    destination: "",
    shipper: "",
    consignee: "",
    vessel: "",
    voyage: "",
    bl_no: "",
    container_no: "",
    eta: "",
    etd: "",
    remarks: "",
  });

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/job-orders", b),
    onSuccess: () => {
      toast.success("Job Order created");
      qc.invalidateQueries({ queryKey: ["job-orders"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed"),
  });

  function selectQ(id: string) {
    const q = quotations.find((x: any) => x.id === id);
    if (q) setForm({ ...form, quotation_id: id, customer_id: q.customer_id, origin: q.origin, destination: q.destination });
  }

  return (
    <Modal open={open} onClose={onClose} title="New Job Order" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <Field label="Executed Quotation">
          <select data-testid="jo-quotation" value={form.quotation_id} onChange={(e) => selectQ(e.target.value)} className={inputCls}>
            <option value="">— Select executed quotation —</option>
            {quotations.map((q: any) => (
              <option key={q.id} value={q.id}>
                {q.quotation_no} · {q.origin} → {q.destination}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Shipper"><input className={inputCls} value={form.shipper} onChange={(e) => setForm({ ...form, shipper: e.target.value })} /></Field>
          <Field label="Consignee"><input className={inputCls} value={form.consignee} onChange={(e) => setForm({ ...form, consignee: e.target.value })} /></Field>
          <Field label="Vessel"><input className={inputCls} value={form.vessel} onChange={(e) => setForm({ ...form, vessel: e.target.value })} /></Field>
          <Field label="Voyage"><input className={inputCls} value={form.voyage} onChange={(e) => setForm({ ...form, voyage: e.target.value })} /></Field>
          <Field label="BL No."><input className={inputCls} value={form.bl_no} onChange={(e) => setForm({ ...form, bl_no: e.target.value })} /></Field>
          <Field label="Container No."><input className={inputCls} value={form.container_no} onChange={(e) => setForm({ ...form, container_no: e.target.value })} /></Field>
          <Field label="ETD (YYYY-MM-DD)"><input className={inputCls} value={form.etd} onChange={(e) => setForm({ ...form, etd: e.target.value })} placeholder="2026-03-15" /></Field>
          <Field label="ETA (YYYY-MM-DD)"><input className={inputCls} value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} placeholder="2026-03-22" /></Field>
        </div>
        <Field label="Remarks"><textarea className={inputCls} rows={3} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn data-testid="jo-submit" onClick={() => mut.mutate(form)}>Create Job Order</Btn>
        </div>
      </div>
    </Modal>
  );
}

function JODetail({ jo, onClose, role, onAdvance, customers }: any) {
  const qc = useQueryClient();
  const isFinance = role === "finance" || role === "admin";
  const [finance, setFinance] = useState<any>({
    buy_rate: jo.buy_rate || 0,
    sell_rate: jo.sell_rate || 0,
    reimbursement: jo.reimbursement || 0,
    kasbon: jo.kasbon || 0,
    cn_amount: jo.cn_amount || 0,
    dn_amount: jo.dn_amount || 0,
    pr_amount: jo.pr_amount || 0,
    finance_notes: jo.finance_notes || "",
  });

  const patchMut = useMutation({
    mutationFn: (b: any) => api.patch(`/job-orders/${jo.id}`, b),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["job-orders"] });
    },
  });

  return (
    <Modal open onClose={onClose} title={`Job Order ${jo.job_no}`} maxWidth="max-w-3xl">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Customer</div><div>{customers.find((c: any) => c.id === jo.customer_id)?.name || "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Route</div><div>{jo.origin} → {jo.destination}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">Vessel</div><div>{jo.vessel || "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-widest text-slate-500">ETA</div><div>{jo.eta || "—"}</div></div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Shipment Timeline</div>
          <div className="flex items-center gap-2 overflow-x-auto scroll-thin">
            {STAGES.map((s) => {
              const done = jo.shipment_status?.some((x: any) => x.stage === s);
              const current = jo.status === s;
              return (
                <div key={s} className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={!(role === "cs" || role === "customs" || role === "finance" || role === "admin")}
                    onClick={() => onAdvance(s)}
                    data-testid={`stage-${s}`}
                    className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                      current
                        ? "bg-blue-500/20 text-blue-200 border-blue-500/40"
                        : done
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-white/[0.02] text-slate-400 border-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                  <MoveRight className="h-3 w-3 text-slate-600" />
                </div>
              );
            })}
          </div>
        </div>

        {isFinance ? (
          <div className="border-t border-white/[0.06] pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-rose-300 mb-3">Finance Section (locked to Finance/Admin)</div>
            <div className="grid grid-cols-3 gap-3">
              {["buy_rate", "sell_rate", "reimbursement", "kasbon", "cn_amount", "dn_amount", "pr_amount"].map((k) => (
                <Field key={k} label={k.replace(/_/g, " ")}>
                  <input type="number" className={inputCls} value={finance[k]} onChange={(e) => setFinance({ ...finance, [k]: +e.target.value })} />
                </Field>
              ))}
            </div>
            <Field label="Finance Notes"><textarea rows={2} className={inputCls} value={finance.finance_notes} onChange={(e) => setFinance({ ...finance, finance_notes: e.target.value })} /></Field>
            <div className="flex justify-end mt-3">
              <Btn data-testid="jo-save-finance" onClick={() => patchMut.mutate(finance)}>Save Finance Data</Btn>
            </div>
          </div>
        ) : (
          <div className="border-t border-white/[0.06] pt-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Finance section is restricted to Finance/Admin role.</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
