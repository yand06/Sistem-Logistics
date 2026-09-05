import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../store/auth";
import { useAuth } from "../store/auth";
import { PageHeader, Section, Card, formatCurrency } from "../components/layout/UI";
import { TrendingUp, Package, Receipt, ShieldCheck, BellRing, DollarSign, Users, FileText } from "lucide-react";

function KPI({ icon: Icon, label, value, testId }: any) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 mt-2 tabular font-mono">{value}</div>
        </div>
        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
        </div>
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
              <KPI testId="kpi-quot-total" icon={FileText} label="Quotations" value={d.quotations.total} />
              <KPI testId="kpi-quot-executed" icon={TrendingUp} label="Executed" value={d.quotations.executed} />
            </>
          )}
          {d?.job_orders && (
            <>
              <KPI testId="kpi-jo-total" icon={Package} label="Job Orders" value={d.job_orders.total} />
              <KPI testId="kpi-jo-transit" icon={Package} label="In Transit" value={d.job_orders.in_transit} />
            </>
          )}
          {d?.invoices && (
            <>
              <KPI
                testId="kpi-inv-out"
                icon={Receipt}
                label="Outstanding"
                value={formatCurrency(d.invoices.outstanding)}
              />
              <KPI testId="kpi-inv-paid" icon={DollarSign} label="Collected" value={formatCurrency(d.invoices.paid)} />
            </>
          )}
          {d?.customs && (
            <>
              <KPI testId="kpi-customs-pending" icon={ShieldCheck} label="Customs Pending" value={d.customs.pending} />
              <KPI testId="kpi-customs-cleared" icon={ShieldCheck} label="Customs Cleared" value={d.customs.cleared} />
            </>
          )}
          <KPI testId="kpi-arrivals" icon={BellRing} label="Arrivals H-2" value={d?.arrivals_h2 ?? 0} />
        </div>

        <Card className="p-6">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Quick actions</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {user.role === "sales" && (
              <>
                <a href="/quotation" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Create Quotation
                </a>
                <a href="/sales/tax-calc" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Import Tax Calculator
                </a>
              </>
            )}
            {user.role === "cs" && (
              <a href="/job-order" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                ➜ Manage Job Orders
              </a>
            )}
            {user.role === "finance" && (
              <>
                <a href="/finance/invoice" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Issue Invoice
                </a>
                <a href="/finance/kurs" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Update Kurs
                </a>
              </>
            )}
            {user.role === "customs" && (
              <a href="/customs" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                ➜ Customs Docs
              </a>
            )}
            {user.role === "pricing" && (
              <a href="/pricing" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                ➜ Update Weekly Prices
              </a>
            )}
            {user.role === "admin" && (
              <>
                <a href="/admin/users" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Manage Users
                </a>
                <a href="/admin/audit" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  ➜ Audit Log
                </a>
              </>
            )}
            <a href="/schedule-arrive" className="rounded-md border border-slate-300 dark:border-slate-800 p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              ➜ Schedule Arrive (H-2)
            </a>
          </div>
        </Card>
      </Section>
    </>
  );
}
