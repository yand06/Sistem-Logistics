import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, Role } from "../../store/auth";
import {
  LayoutDashboard,
  FileText,
  Package,
  FolderOpen,
  BellRing,
  Receipt,
  DollarSign,
  Users2,
  ShieldCheck,
  Truck,
  Calculator,
  LogOut,
  UserCircle2,
  Building2,
  ScrollText,
  Ship,
} from "lucide-react";

interface MenuItem {
  to: string;
  label: string;
  icon: any;
  roles: Role[];
}

const MENU: { section: string; items: MenuItem[] }[] = [
  {
    section: "Operations",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "sales", "cs", "customs", "finance", "pricing"],
      },
      {
        to: "/quotation",
        label: "Quotation",
        icon: FileText,
        roles: ["admin", "sales"],
      },
      {
        to: "/sales/tax-calc",
        label: "Import Tax Calc",
        icon: Calculator,
        roles: ["admin", "sales"],
      },
      {
        to: "/job-order",
        label: "Job Order",
        icon: Package,
        roles: ["admin", "cs", "finance"],
      },
      {
        to: "/documents",
        label: "Documents",
        icon: FolderOpen,
        roles: ["admin", "cs", "finance", "customs"],
      },
      {
        to: "/schedule-arrive",
        label: "Schedule Arrive",
        icon: BellRing,
        roles: ["admin", "cs", "customs", "finance", "sales"],
      },
      {
        to: "/customs",
        label: "Customs",
        icon: ShieldCheck,
        roles: ["admin", "customs"],
      },
    ],
  },
  {
    section: "Finance",
    items: [
      {
        to: "/finance/invoice",
        label: "Invoice",
        icon: Receipt,
        roles: ["admin", "finance"],
      },
      {
        to: "/finance/kurs",
        label: "Kurs Mingguan",
        icon: DollarSign,
        roles: ["admin", "finance"],
      },
      {
        to: "/finance/partner",
        label: "Partner + Rekening",
        icon: Building2,
        roles: ["admin", "finance"],
      },
      {
        to: "/finance/soa",
        label: "Statement of Account",
        icon: ScrollText,
        roles: ["admin", "finance", "sales"],
      },
    ],
  },
  {
    section: "Pricing",
    items: [
      {
        to: "/pricing",
        label: "Weekly & LCL & Trucking",
        icon: Truck,
        roles: ["admin", "pricing", "sales"],
      },
    ],
  },
  {
    section: "Master & Admin",
    items: [
      {
        to: "/master/customer",
        label: "Customer",
        icon: Users2,
        roles: ["admin", "sales", "cs"],
      },
      {
        to: "/admin/users",
        label: "Users",
        icon: UserCircle2,
        roles: ["admin"],
      },
      {
        to: "/admin/audit",
        label: "Audit Log",
        icon: ScrollText,
        roles: ["admin", "finance"],
      },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50"
      data-testid="app-root"
    >
      <aside className="w-64 shrink-0 border-r border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 relative flex flex-col">
        <div className="px-5 min-h-[104px] border-b border-slate-300 dark:border-slate-800 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <Ship className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none text-slate-900 dark:text-slate-50">
              NusaFreight
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
              ERP · Logistics
            </div>
          </div>
        </div>
        <nav
          className="p-3 space-y-5 overflow-y-auto scroll-thin flex-1"
          style={{ maxHeight: "calc(100vh - 180px)" }}
        >
          {MENU.map((sec) => {
            const visible = sec.items.filter((i) =>
              i.roles.includes(user.role),
            );
            if (visible.length === 0) return null;
            return (
              <div key={sec.section}>
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {sec.section}
                </div>
                <div className="space-y-0.5">
                  {visible.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.to === "/"}
                      data-testid={`nav-${it.label
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`
                      }
                    >
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-sm text-slate-600 dark:text-slate-300">
            {user.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-50">
              {user.name}
            </div>
            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
              {user.role.toUpperCase()}
            </span>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
