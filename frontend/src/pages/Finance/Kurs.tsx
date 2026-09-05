import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { toast } from "sonner";
import { PageHeader, Section, Card, CardHeader, Btn, Field, inputCls, Table } from "../../components/layout/UI";

const CURRENCIES = ["USD", "EUR", "SGD", "RMB", "JPY", "AUD"];

export default function KursPage() {
  const qc = useQueryClient();
  const { data: kurs = [] } = useQuery({ queryKey: ["kurs"], queryFn: () => api.get("/kurs") });
  const [f, setF] = useState<any>({ currency: "USD", rate: 0, week_of: new Date().toISOString().slice(0, 10) });

  const mut = useMutation({
    mutationFn: (b: any) => api.post("/kurs", b),
    onSuccess: () => {
      toast.success("Kurs updated across system");
      qc.invalidateQueries({ queryKey: ["kurs"] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Kurs Mingguan"
        subtitle="Weekly FX rates that power quotation totals, invoices & Coretax XML across every module."
      />
      <Section>
        <Card className="p-6">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-3">Set weekly rate</div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <Field label="Currency">
              <select data-testid="kurs-currency" className={inputCls} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Rate to IDR">
              <input data-testid="kurs-rate" type="number" className={inputCls} value={f.rate} onChange={(e) => setF({ ...f, rate: +e.target.value })} />
            </Field>
            <Field label="Week Of">
              <input type="date" className={inputCls} value={f.week_of} onChange={(e) => setF({ ...f, week_of: e.target.value })} />
            </Field>
            <Btn data-testid="kurs-save" onClick={() => mut.mutate(f)}>Save Rate</Btn>
          </div>
        </Card>
        <Card>
          <CardHeader title="Rate History" />
          <Table
            testId="kurs-table"
            columns={[
              { key: "currency", label: "Currency" },
              { key: "rate", label: "Rate (IDR)", align: "right", render: (r) => r.rate.toLocaleString() },
              { key: "week_of", label: "Week Of" },
            ]}
            rows={kurs}
          />
        </Card>
      </Section>
    </>
  );
}
