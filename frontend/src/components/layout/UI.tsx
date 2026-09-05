import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      title="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: PageHeaderProps) {
  return (
    <div className="px-6 sm:px-8 h-[104px] py-4 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
        <ThemeToggle />
      </div>
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
      className={`rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="font-display font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
}) {
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-sm",
    ghost:
      "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    outline:
      "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-sm",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-500";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    executed:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    booking:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    picked_up:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    port_loading:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
    on_vessel:
      "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
    customs_cleared:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    delivered:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    unpaid:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    paid: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    in_progress:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    cleared:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium capitalize ${
        map[status] ||
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
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
  columns: {
    key: string;
    label: string;
    render?: (row: any) => React.ReactNode;
    align?: "left" | "right";
  }[];
  rows: any[];
  empty?: string;
  testId?: string;
}) {
  return (
    <div className="overflow-auto scroll-thin" data-testid={testId}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 ${
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
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
              >
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={r.id || i}
              className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-2.5 text-slate-700 dark:text-slate-300 ${c.align === "right" ? "text-right font-mono" : ""}`}
                >
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className={`w-full ${maxWidth} rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl`}
        data-testid="modal"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="font-display font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            data-testid="modal-close"
          >
            ✕
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto scroll-thin">
          {children}
        </div>
      </div>
    </div>
  );
}

export function formatCurrency(n: number | undefined, cur = "IDR") {
  if (n === undefined || n === null) return "—";
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n) +
    " " +
    cur
  );
}
