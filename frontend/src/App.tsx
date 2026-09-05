import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth, Role } from "./store/auth";
import Login from "./pages/Login";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Quotation from "./pages/Quotation";
import JobOrder from "./pages/JobOrder";
import Documents from "./pages/Documents";
import ScheduleArrive from "./pages/ScheduleArrive";
import InvoicePage from "./pages/Finance/Invoice";
import KursPage from "./pages/Finance/Kurs";
import PartnerPage from "./pages/Finance/Partner";
import SOAPage from "./pages/Finance/SOA";
import Pricing from "./pages/Pricing/Pricing";
import Customs from "./pages/Customs";
import MasterCustomer from "./pages/Master/Customer";
import AdminUsers from "./pages/Admin/Users";
import AuditLog from "./pages/Admin/AuditLog";
import TaxCalc from "./pages/Sales/TaxCalc";

const ROUTE_ROLES: Record<string, Role[]> = {
  "/": ["admin", "sales", "cs", "customs", "finance", "pricing"],
  "/quotation": ["admin", "sales"],
  "/sales/tax-calc": ["admin", "sales"],
  "/job-order": ["admin", "cs", "finance"],
  "/documents": ["admin", "cs", "finance", "customs"],
  "/schedule-arrive": ["admin", "sales", "cs", "customs", "finance"],
  "/customs": ["admin", "customs"],
  "/finance/invoice": ["admin", "finance"],
  "/finance/kurs": ["admin", "finance"],
  "/finance/partner": ["admin", "finance"],
  "/finance/soa": ["admin", "finance", "sales"],
  "/pricing": ["admin", "pricing", "sales"],
  "/master/customer": ["admin", "sales", "cs"],
  "/admin/users": ["admin"],
  "/admin/audit": ["admin", "finance"],
};

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined)
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = ROUTE_ROLES[location.pathname];
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Protected><Dashboard /></Protected>} />
        <Route path="quotation" element={<Protected><Quotation /></Protected>} />
        <Route path="job-order" element={<Protected><JobOrder /></Protected>} />
        <Route path="documents" element={<Protected><Documents /></Protected>} />
        <Route path="schedule-arrive" element={<Protected><ScheduleArrive /></Protected>} />
        <Route path="finance/invoice" element={<Protected><InvoicePage /></Protected>} />
        <Route path="finance/kurs" element={<Protected><KursPage /></Protected>} />
        <Route path="finance/partner" element={<Protected><PartnerPage /></Protected>} />
        <Route path="finance/soa" element={<Protected><SOAPage /></Protected>} />
        <Route path="pricing" element={<Protected><Pricing /></Protected>} />
        <Route path="customs" element={<Protected><Customs /></Protected>} />
        <Route path="master/customer" element={<Protected><MasterCustomer /></Protected>} />
        <Route path="admin/users" element={<Protected><AdminUsers /></Protected>} />
        <Route path="admin/audit" element={<Protected><AuditLog /></Protected>} />
        <Route path="sales/tax-calc" element={<Protected><TaxCalc /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
