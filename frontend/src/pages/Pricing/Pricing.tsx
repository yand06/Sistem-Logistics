import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../store/auth";
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
  formatCurrency,
} from "../../components/layout/UI";
import { Plus, Calculator } from "lucide-react";

export default function Pricing() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"weekly" | "lcl" | "trucking">("weekly");

  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Weekly Rates · LCL · Trucking"
        subtitle="Manage weekly ocean freight rates, calculate LCL charges, and maintain the trucking rate card."
      />
      <div className="px-6 sm:px-8 border-b border-slate-200 flex gap-4">
        {[
          ["weekly", "Weekly Prices"],
          ["lcl", "LCL Calculator"],
          ["trucking", "Trucking Rates"],
        ].map(([k, l]) => (
          <button
            key={k}
            data-testid={`tab-${k}`}
            onClick={() => setTab(k as any)}
            className={`px-1 py-3 text-sm border-b-2 ${tab === k ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "weekly" && <Weekly />}
      {tab === "lcl" && <LCL />}
      {tab === "trucking" && <Trucking />}
    </>
  );
}

function Weekly() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["weekly-prices"],
    queryFn: () => api.get("/weekly-prices"),
  });
  const [f, setF] = useState<any>({
    lane: "",
    container_type: "20GP",
    ocean_freight: 0,
    thc_origin: 0,
    thc_dest: 0,
    doc_fee: 0,
    currency: "USD",
    week_of: new Date().toISOString().slice(0, 10),
  });
  const mut = useMutation({
    mutationFn: (b: any) => api.post("/weekly-prices", b),
    onSuccess: () => {
      toast.success("Rate saved");
      qc.invalidateQueries({ queryKey: ["weekly-prices"] });
    },
  });
  return (
    <div className="px-6 sm:px-8 py-6 space-y-4">
      <Card className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Add / update weekly rate
        </div>
        <div className="grid grid-cols-4 gap-3 items-end">
          <Field label="Lane">
            <input
              className={inputCls}
              placeholder="JKT->SIN"
              value={f.lane}
              onChange={(e) => setF({ ...f, lane: e.target.value })}
            />
          </Field>
          <Field label="Container">
            <select
              className={inputCls}
              value={f.container_type}
              onChange={(e) => setF({ ...f, container_type: e.target.value })}
            >
              {["20GP", "40GP", "40HC", "LCL"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Ocean Freight">
            <input
              type="number"
              className={inputCls}
              value={f.ocean_freight}
              onChange={(e) => setF({ ...f, ocean_freight: +e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <select
              className={inputCls}
              value={f.currency}
              onChange={(e) => setF({ ...f, currency: e.target.value })}
            >
              {["USD", "IDR", "SGD", "EUR"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="THC Origin">
            <input
              type="number"
              className={inputCls}
              value={f.thc_origin}
              onChange={(e) => setF({ ...f, thc_origin: +e.target.value })}
            />
          </Field>
          <Field label="THC Dest">
            <input
              type="number"
              className={inputCls}
              value={f.thc_dest}
              onChange={(e) => setF({ ...f, thc_dest: +e.target.value })}
            />
          </Field>
          <Field label="Doc Fee">
            <input
              type="number"
              className={inputCls}
              value={f.doc_fee}
              onChange={(e) => setF({ ...f, doc_fee: +e.target.value })}
            />
          </Field>
          <Field label="Week Of">
            <input
              type="date"
              className={inputCls}
              value={f.week_of}
              onChange={(e) => setF({ ...f, week_of: e.target.value })}
            />
          </Field>
          <div className="col-start-4">
            <Btn
              data-testid="wp-save"
              onClick={() => mut.mutate(f)}
              className="w-full h-[40px]"
            >
              Save Rate
            </Btn>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title={`Weekly Prices (${rows.length})`} />
        <Table
          testId="weekly-table"
          columns={[
            { key: "lane", label: "Lane" },
            { key: "container_type", label: "Type" },
            {
              key: "ocean_freight",
              label: "Freight",
              align: "right",
              render: (r) =>
                `${r.ocean_freight?.toLocaleString()} ${r.currency}`,
            },
            { key: "thc_origin", label: "THC Org", align: "right" },
            { key: "thc_dest", label: "THC Dst", align: "right" },
            { key: "doc_fee", label: "Doc", align: "right" },
            { key: "week_of", label: "Week Of" },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
}

function LCL() {
  const [f, setF] = useState<any>({
    weight_kg: 500,
    volume_cbm: 2,
    rate_per_cbm: 100,
    minimum_charge: 50,
    currency: "USD",
  });
  const [res, setRes] = useState<any>(null);
  async function calc() {
    const r = await api.post("/pricing/lcl-calc", f);
    setRes(r);
  }
  return (
    <div className="px-6 sm:px-8 py-6 space-y-4">
      <Card className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4" /> LCL calculator — W/M whichever
          greater
        </div>
        <div className="grid grid-cols-5 gap-3 items-end">
          <Field label="Weight (KG)">
            <input
              type="number"
              className={inputCls}
              value={f.weight_kg}
              onChange={(e) => setF({ ...f, weight_kg: +e.target.value })}
              data-testid="lcl-weight"
            />
          </Field>
          <Field label="Volume (CBM)">
            <input
              type="number"
              className={inputCls}
              value={f.volume_cbm}
              onChange={(e) => setF({ ...f, volume_cbm: +e.target.value })}
              data-testid="lcl-volume"
            />
          </Field>
          <Field label="Rate / CBM">
            <input
              type="number"
              className={inputCls}
              value={f.rate_per_cbm}
              onChange={(e) => setF({ ...f, rate_per_cbm: +e.target.value })}
              data-testid="lcl-rate"
            />
          </Field>
          <Field label="Min Charge">
            <input
              type="number"
              className={inputCls}
              value={f.minimum_charge}
              onChange={(e) => setF({ ...f, minimum_charge: +e.target.value })}
            />
          </Field>
          <Btn data-testid="lcl-calc" onClick={calc}>
            Calculate
          </Btn>
        </div>
      </Card>
      {res && (
        <Card className="p-5">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Chargeable
              </div>
              <div className="font-mono font-bold text-2xl">
                {res.chargeable_weight}
              </div>
              <div className="text-xs text-slate-500">W/M</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Price
              </div>
              <div
                className="font-mono font-bold text-2xl text-slate-900"
                data-testid="lcl-price"
              >
                {res.price.toLocaleString()} {res.currency}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Breakdown
              </div>
              <pre className="text-xs text-slate-400 mt-1">
                {JSON.stringify(res.breakdown, null, 2)}
              </pre>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Trucking() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({
    origin: "",
    destination: "",
    container_type: "20GP",
    rate: 0,
    currency: "IDR",
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["trucking"],
    queryFn: () => api.get("/trucking-rates"),
  });
  const mut = useMutation({
    mutationFn: (b: any) => api.post("/trucking-rates", b),
    onSuccess: () => {
      toast.success("Rate added");
      qc.invalidateQueries({ queryKey: ["trucking"] });
      setOpen(false);
    },
  });
  return (
    <div className="px-6 sm:px-8 py-6 space-y-4">
      <Card>
        <CardHeader
          title={`Trucking Rate Card (${rows.length})`}
          action={
            <Btn data-testid="trucking-add-btn" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add
            </Btn>
          }
        />
        <Table
          testId="trucking-table"
          columns={[
            { key: "origin", label: "Origin" },
            { key: "destination", label: "Destination" },
            { key: "container_type", label: "Container" },
            {
              key: "rate",
              label: "Rate",
              align: "right",
              render: (r) => formatCurrency(r.rate, r.currency),
            },
          ]}
          rows={rows}
        />
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Trucking Rate"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origin">
            <input
              className={inputCls}
              value={f.origin}
              onChange={(e) => setF({ ...f, origin: e.target.value })}
            />
          </Field>
          <Field label="Destination">
            <input
              className={inputCls}
              value={f.destination}
              onChange={(e) => setF({ ...f, destination: e.target.value })}
            />
          </Field>
          <Field label="Container Type">
            <select
              className={inputCls}
              value={f.container_type}
              onChange={(e) => setF({ ...f, container_type: e.target.value })}
            >
              {["20GP", "40GP", "40HC"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate">
            <input
              type="number"
              className={inputCls}
              value={f.rate}
              onChange={(e) => setF({ ...f, rate: +e.target.value })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Btn>
          <Btn data-testid="trucking-submit" onClick={() => mut.mutate(f)}>
            Save
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
