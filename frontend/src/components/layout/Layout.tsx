import React from "react";
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
      { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "cs", "customs", "finance", "pricing"] },
      { to: "/quotation", label: "Quotation", icon: FileText, roles: ["admin", "sales"] },
      { to: "/sales/tax-calc", label: "Import Tax Calc", icon: Calculator, roles: ["admin", "sales"] },
      { to: "/job-order", label: "Job Order", icon: Package, roles: ["admin", "cs", "finance"] },
      { to: "/documents", label: "Documents", icon: FolderOpen, roles: ["admin", "cs", "finance", "customs"] },
      { to: "/schedule-arrive", label: "Schedule Arrive", icon: BellRing, roles: ["admin", "cs", "customs", "finance", "sales"] },
      { to: "/customs", label: "Customs", icon: ShieldCheck, roles: ["admin", "customs"] },
    ],
  },
  {
    section: "Finance",
    items: [
      { to: "/finance/invoice", label: "Invoice", icon: Receipt, roles: ["admin", "finance"] },
      { to: "/finance/kurs", label: "Kurs Mingguan", icon: DollarSign, roles: ["admin", "finance"] },
      { to: "/finance/partner", label: "Partner + Rekening", icon: Building2, roles: ["admin", "finance"] },
      { to: "/finance/soa", label: "Statement of Account", icon: ScrollText, roles: ["admin", "finance", "sales"] },
    ],
  },
  {
    section: "Pricing",
    items: [
      { to: "/pricing", label: "Weekly & LCL & Trucking", icon: Truck, roles: ["admin", "pricing", "sales"] },
    ],
  },
  {
    section: "Master & Admin",
    items: [
      { to: "/master/customer", label: "Customer", icon: Users2, roles: ["admin", "sales", "cs"] },
      { to: "/admin/users", label: "Users", icon: UserCircle2, roles: ["admin"] },
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["admin", "finance"] },
    ],
  },
];

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  sales: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  cs: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  customs: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  finance: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  pricing: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;

  return (
    <div className="min-h-screen flex text-slate-100 grid-bg" data-testid="app-root">
      <aside className="w-64 shrink-0 border-r border-white/[0.06] bg-[#0d121c]/80 backdrop-blur relative">
        <div className="px-5 py-6 border-b border-white/[0.06] flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600/90 flex items-center justify-center">
            <Ship className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">NusaFreight</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">ERP · Logistics</div>
          </div>
        </div>
        <nav className="p-3 space-y-5 overflow-y-auto scroll-thin" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {MENU.map((sec) => {
            const visible = sec.items.filter((i) => i.roles.includes(user.role));
            if (visible.length === 0) return null;
            return (
              <div key={sec.section}>
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {sec.section}
                </div>
                <div className="space-y-0.5">
                  {visible.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.to === "/"}
                      data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent"
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
        <div className="absolute bottom-0 w-64 border-t border-white/[0.06] bg-[#0d121c] px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-700/60 flex items-center justify-center font-semibold text-sm">
            {user.name?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded border ${ROLE_COLORS[user.role]}`}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="p-2 rounded hover:bg-white/[0.06] text-slate-400 hover:text-rose-300"
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
