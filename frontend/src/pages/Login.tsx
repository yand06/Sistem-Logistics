import React, { useState } from "react";
import { useAuth } from "../store/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Ship, ArrowRight } from "lucide-react";

const DEMO = [
  { key: "admin", email: "supriyandilaawe@gmail.com", password: "Admin@2026!", label: "Admin (Owner)" },
  { key: "sales", email: "sales@nusafreight.com", password: "Demo@2026", label: "Sales" },
  { key: "cs", email: "cs@nusafreight.com", password: "Demo@2026", label: "Customer Service" },
  { key: "customs", email: "customs@nusafreight.com", password: "Demo@2026", label: "Customs" },
  { key: "finance", email: "finance@nusafreight.com", password: "Demo@2026", label: "Finance" },
  { key: "pricing", email: "pricing@nusafreight.com", password: "Demo@2026", label: "Pricing" },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e?: React.FormEvent, override?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    try {
      const em = override?.email ?? email;
      const pw = override?.password ?? password;
      await login(em, pw);
      toast.success("Welcome back");
      nav("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Branding Panel (30-35% width) */}
      <div className="lg:w-[32%] shrink-0 bg-slate-900 flex flex-col justify-between p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="flex items-center gap-3 mb-12 lg:mb-0">
          <div className="h-10 w-10 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <Ship className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none text-white tracking-tight">NusaFreight</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Enterprise ERP</div>
          </div>
        </div>

        <div className="max-w-sm">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 mb-4">
            Freight Forwarding · Customs · Finance
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold leading-snug tracking-tight text-white">
            The operational spine for Indonesian freight forwarders.
          </h1>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Quotations, Job Orders, Customs, Invoicing &amp; Coretax export — unified across divisions with granular role-based access.
          </p>
          
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-4">
            {[
              { val: "6", label: "Divisions" },
              { val: "12+", label: "Modules" },
              { val: "100%", label: "Auditable" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 font-mono text-lg font-bold text-slate-300">{stat.val}</div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block text-[10px] uppercase tracking-widest text-slate-600 mt-12">
          © 2026 NusaFreight — Internal System
        </div>
      </div>

      {/* Login Area (65-70% width) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[420px]">
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Sign in</h2>
          <p className="text-sm text-slate-500 mt-2">Access your division workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Email
              </label>
              <input
                data-testid="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
                placeholder="name@nusafreight.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <input
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>
            <button
              data-testid="login-submit"
              disabled={busy}
              className="w-full rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-3 flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {busy ? (
                "Authenticating…"
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Demo Accounts
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  data-testid={`demo-${d.key}`}
                  onClick={() => submit(undefined, d)}
                  className="text-left rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <div className="text-xs font-medium text-slate-700">{d.label}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
