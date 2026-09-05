import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: PageHeaderProps) {
  return (
    <div className="px-6 sm:px-8 pt-8 pb-4 border-b border-white/[0.05] flex items-start justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-2">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ children }: { children: React.ReactNode }) {
  return <div className="px-6 sm:px-8 py-6 space-y-6">{children}</div>;
}

export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-[#111827]/80 backdrop-blur ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
      <div className="font-display font-semibold text-slate-100">{title}</div>
      {action}
    </div>
  );
}

export function Btn({
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    ghost: "text-slate-300 hover:bg-white/[0.06]",
    outline: "border border-white/10 text-slate-200 hover:bg-white/[0.04]",
    danger: "bg-rose-600/90 hover:bg-rose-500 text-white",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md bg-[#0d121c] border border-white/10 px-3 py-2 text-sm outline-none focus:border-blue-500/60";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    executed: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    booking: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    picked_up: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    port_loading: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    on_vessel: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    customs_cleared: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    unpaid: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    in_progress: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    cleared: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium capitalize ${
        map[status] || "bg-slate-500/10 text-slate-300 border-slate-500/20"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Table({
  columns,
  rows,
  empty = "No records",
  testId,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode; align?: "left" | "right" }[];
  rows: any[];
  empty?: string;
  testId?: string;
}) {
  return (
    <div className="overflow-auto scroll-thin" data-testid={testId}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 ${
                  c.align === "right" ? "text-right" : ""
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 text-sm">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-2.5 text-slate-200 ${c.align === "right" ? "text-right font-mono" : ""}`}
                >
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} rounded-xl border border-white/10 bg-[#0d121c] shadow-2xl`} data-testid="modal">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="font-display font-semibold">{title}</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100" data-testid="modal-close">
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto scroll-thin">{children}</div>
      </div>
    </div>
  );
}

export function formatCurrency(n: number | undefined, cur = "IDR") {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + " " + cur;
}
