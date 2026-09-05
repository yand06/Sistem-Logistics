import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../store/auth";
import { PageHeader, Section, Card, CardHeader, Btn, inputCls, Table, formatCurrency, StatusBadge } from "../../components/layout/UI";

export default function SOA() {
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => api.get("/customers") });
  const [customerId, setCustomerId] = useState("");
  const { data: soa } = useQuery({
    queryKey: ["soa", customerId],
    enabled: !!customerId,
    queryFn: () => api.get(`/soa/${customerId}`),
  });

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Statement of Account"
        subtitle="Per-customer transaction mutation & outstanding balance."
      />
      <Section>
        <Card className="p-4">
          <div className="flex gap-3 items-center">
            <select data-testid="soa-customer" className={`${inputCls} max-w-md`} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Choose customer —</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {soa && (
              <div className="flex gap-6 ml-auto text-sm">
                <div><span className="text-slate-500 text-xs">Total </span><span className="font-mono font-bold">{formatCurrency(soa.total)}</span></div>
                <div><span className="text-slate-500 text-xs">Outstanding </span><span className="font-mono font-bold text-amber-300">{formatCurrency(soa.outstanding)}</span></div>
              </div>
            )}
          </div>
        </Card>
        {soa && (
          <Card>
            <CardHeader title={`Invoices (${soa.invoices.length})`} />
            <Table
              testId="soa-table"
              empty="No invoices for this customer."
              columns={[
                { key: "invoice_no", label: "No." },
                { key: "invoice_date", label: "Date" },
                { key: "total", label: "Total", align: "right", render: (r) => formatCurrency(r.total, r.currency) },
                { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={soa.invoices}
            />
          </Card>
        )}
      </Section>
    </>
  );
}
