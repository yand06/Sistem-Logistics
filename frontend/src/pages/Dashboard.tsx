import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../store/auth";
import { useAuth } from "../store/auth";
import { PageHeader, Section, Card, formatCurrency } from "../components/layout/UI";
import { TrendingUp, Package, Receipt, ShieldCheck, BellRing, DollarSign, Users, FileText } from "lucide-react";

function KPI({ icon: Icon, label, value, tone = "blue", testId }: any) {
  const toneMap: any = {
    blue: "from-blue-600/20 to-blue-600/0 text-blue-300 border-blue-500/20",
    emerald: "from-emerald-600/20 to-emerald-600/0 text-emerald-300 border-emerald-500/20",
    amber: "from-amber-600/20 to-amber-600/0 text-amber-300 border-amber-500/20",
    rose: "from-rose-600/20 to-rose-600/0 text-rose-300 border-rose-500/20",
    indigo: "from-indigo-600/20 to-indigo-600/0 text-indigo-300 border-indigo-500/20",
    cyan: "from-cyan-600/20 to-cyan-600/0 text-cyan-300 border-cyan-500/20",
  };
  return (
    <div
      data-testid={testId}
      className={`relative rounded-xl border p-5 overflow-hidden bg-gradient-to-br ${toneMap[tone]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70">{label}</div>
          <div className="font-display text-3xl font-bold text-slate-50 mt-2 tabular font-mono">{value}</div>
        </div>
        <Icon className="h-6 w-6 opacity-80" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: d } = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get("/dashboard") });
  if (!user) return null;

  const roleLabels: Record<string, string> = {
    admin: "Command Center",
    sales: "Sales Pipeline",
    cs: "Operations Desk",
    customs: "Customs Desk",
    finance: "Finance Console",
    pricing: "Pricing Studio",
  };

  return (
    <>
      <PageHeader
        eyebrow={`${user.role} · signed in`}
        title={`${roleLabels[user.role]} — hi, ${user.name.split(" ")[0]}`}
        subtitle="Real-time snapshot across your division. All numbers respect role-based data isolation."
      />
      <Section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {d?.quotations && (
            <>
              <KPI testId="kpi-quot-total" icon={FileText} label="Quotations" value={d.quotations.total} tone="blue" />
              <KPI testId="kpi-quot-executed" icon={TrendingUp} label="Executed" value={d.quotations.executed} tone="emerald" />
            </>
          )}
          {d?.job_orders && (
            <>
              <KPI testId="kpi-jo-total" icon={Package} label="Job Orders" value={d.job_orders.total} tone="cyan" />
              <KPI testId="kpi-jo-transit" icon={Package} label="In Transit" value={d.job_orders.in_transit} tone="indigo" />
            </>
          )}
          {d?.invoices && (
            <>
              <KPI
                testId="kpi-inv-out"
                icon={Receipt}
                label="Outstanding"
                value={formatCurrency(d.invoices.outstanding)}
                tone="amber"
              />
              <KPI testId="kpi-inv-paid" icon={DollarSign} label="Collected" value={formatCurrency(d.invoices.paid)} tone="emerald" />
            </>
          )}
          {d?.customs && (
            <>
              <KPI testId="kpi-customs-pending" icon={ShieldCheck} label="Customs Pending" value={d.customs.pending} tone="amber" />
              <KPI testId="kpi-customs-cleared" icon={ShieldCheck} label="Customs Cleared" value={d.customs.cleared} tone="emerald" />
            </>
          )}
          <KPI testId="kpi-arrivals" icon={BellRing} label="Arrivals H-2" value={d?.arrivals_h2 ?? 0} tone="rose" />
        </div>

        <Card className="p-6">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-3">Quick actions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {user.role === "sales" && (
              <>
                <a href="/quotation" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Create Quotation
                </a>
                <a href="/sales/tax-calc" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Import Tax Calculator
                </a>
              </>
            )}
            {user.role === "cs" && (
              <a href="/job-order" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                ➜ Manage Job Orders
              </a>
            )}
            {user.role === "finance" && (
              <>
                <a href="/finance/invoice" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Issue Invoice
                </a>
                <a href="/finance/kurs" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Update Kurs
                </a>
              </>
            )}
            {user.role === "customs" && (
              <a href="/customs" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                ➜ Customs Docs
              </a>
            )}
            {user.role === "pricing" && (
              <a href="/pricing" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                ➜ Update Weekly Prices
              </a>
            )}
            {user.role === "admin" && (
              <>
                <a href="/admin/users" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Manage Users
                </a>
                <a href="/admin/audit" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
                  ➜ Audit Log
                </a>
              </>
            )}
            <a href="/schedule-arrive" className="rounded-md border border-white/10 p-3 hover:bg-white/[0.04]">
              ➜ Schedule Arrive (H-2)
            </a>
          </div>
        </Card>
      </Section>
    </>
  );
}
