import React, { useState } from "react";
import { useAuth } from "../store/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Ship, ArrowRight } from "lucide-react";

const DEMO = [
  { key: "admin", email: "supriyandilaawe@gmail.com", password: "Admin@2026!", label: "Admin (Owner)", tone: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
  { key: "sales", email: "sales@nusafreight.com", password: "Demo@2026", label: "Sales", tone: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  { key: "cs", email: "cs@nusafreight.com", password: "Demo@2026", label: "Customer Service", tone: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
  { key: "customs", email: "customs@nusafreight.com", password: "Demo@2026", label: "Customs", tone: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  { key: "finance", email: "finance@nusafreight.com", password: "Demo@2026", label: "Finance", tone: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
  { key: "pricing", email: "pricing@nusafreight.com", password: "Demo@2026", label: "Pricing", tone: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" },
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
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] grid-bg">
      <div className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600 flex items-center justify-center">
            <Ship className="h-6 w-6 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display font-bold text-xl">NusaFreight</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-0.5">Enterprise ERP</div>
          </div>
        </div>
        <div className="max-w-lg relative z-10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-4">
            Freight Forwarding · Customs · Finance
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-slate-50">
            The operational spine for Indonesian freight forwarders.
          </h1>
          <p className="mt-5 text-slate-400 leading-relaxed">
            Quotations, Job Orders, Customs, Invoicing &amp; Coretax export — unified across Sales, CS,
            Customs, Finance &amp; Pricing with granular role-based access.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              ["6", "Divisions"],
              ["12+", "Modules"],
              ["100%", "Auditable"],
            ].map(([v, k]) => (
              <div key={k} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="font-display font-bold text-2xl text-slate-100">{v}</div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-600">© 2026 NusaFreight — Internal ERP</div>
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-[#0d121c]/60 border-l border-white/[0.05]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Ship className="h-5 w-5 text-white" />
            </div>
            <div className="font-display font-bold text-lg">NusaFreight</div>
          </div>
          <h2 className="font-display text-2xl font-semibold text-slate-50">Sign in</h2>
          <p className="text-sm text-slate-400 mt-1">Access your division workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Email</label>
              <input
                data-testid="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full rounded-md bg-[#111827] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-blue-500/60"
                placeholder="you@nusafreight.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Password</label>
              <input
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 w-full rounded-md bg-[#111827] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-blue-500/60"
                placeholder="••••••••"
              />
            </div>
            <button
              data-testid="login-submit"
              disabled={busy}
              className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 flex items-center justify-center gap-2 transition-colors"
            >
              {busy ? "Signing in…" : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <div className="mt-8">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Demo Accounts · one-tap</div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  data-testid={`demo-${d.key}`}
                  onClick={() => submit(undefined, d)}
                  className={`text-left rounded-md border px-3 py-2 text-xs hover:bg-white/[0.03] ${d.tone}`}
                >
                  <div className="font-semibold">{d.label}</div>
                  <div className="opacity-70 truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
