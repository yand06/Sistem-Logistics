# NusaFreight ERP — Product Requirements Document

## Original Problem Statement (verbatim from user)
Pengembangan Sistem Freight Forwarding / Logistics Management System — internal web application (ERP-lite) untuk perusahaan freight forwarding / logistik dengan modul Sales, Customer Service, Customs, Finance, Pricing. Stack: TypeScript + Vite + Tailwind + React. RBAC granular per divisi & kolom, data isolation per Sales.

## User Choices (Feb 2026)
- MVP scope: **Full end-to-end lite** — Auth+RBAC, Master Customer, Quotation, Job Order, Document, Finance dasar, Kurs, Dashboard (plus operational + tax calc + LCL calc + Coretax XML skeleton). Advanced items (Komisi Sales, Balance Sheet, PR/CN/DN journal detail, etc.) deferred.
- Tech stack: React + TypeScript + Tailwind (kept CRA build tool for supervisor stability; user asked Vite but migration would require touching read-only supervisor config).
- Authentication: JWT-based custom auth (Bearer token in Authorization header, stored in localStorage).
- Seed data: yes — admin (owner email) + 5 demo users, 3 customers, 4 kurs entries, 4 trucking rates.
- Pending client confirmation items skipped in v1: Coretax XML final schema, komisi rules, Tanda Terima template, email provider, PR definition.

## Architecture
**Backend** (`/app/backend/server.py`): FastAPI single-file, Motor async MongoDB. JWT (PyJWT, HS256, 12h). Bcrypt passwords. Startup event seeds users + master data + writes `/app/memory/test_credentials.md`.

**Frontend** (`/app/frontend/src/`): CRA + TypeScript + Tailwind. React Router v7, TanStack Query, TanStack Table, React Hook Form (installed, ready), Zod (installed), Sonner toasts, Lucide icons. Plus Jakarta Sans + IBM Plex Sans + JetBrains Mono. Design tokens: dark slate (#0B0F17) + cobalt (#2563EB).

## Roles & Permissions
- **admin** — full access, user management, audit log.
- **sales** — Quotation, Import Tax Calc, Master Customer (own only), Weekly Prices (read), SOA (own).
- **cs** — Job Order (operational fields only), Documents, Master Customer, Schedule Arrive.
- **customs** — Customs docs & status, Documents, Schedule Arrive.
- **finance** — Invoice, Kurs, Partner+bank, SOA, Coretax XML, Job Order (full incl. buy/sell/margin), Audit Log.
- **pricing** — Weekly Prices, LCL calculator, Trucking Rate card.

Column-level RBAC on Job Order: CS_ALLOWED_FIELDS vs FINANCE_ALLOWED_FIELDS enforced in PATCH `/api/job-orders/{id}`. Data isolation on Customers & Quotations: server filters by `sales_id == user.id` when role is sales. React Query cache is cleared on login/logout to prevent cross-identity leaks. Client-side route guard (App.tsx `ROUTE_ROLES`) redirects unauthorized users to dashboard.

## Modules Implemented (v1 — Feb 2026)
- **Auth**: login, /me, JWT.
- **Dashboard**: role-specific KPIs + quick actions.
- **Master Customer** with sales assignment.
- **Quotation** with margin calculator + execute → JobOrder.
- **Job Order** with shipment timeline stepper + column RBAC.
- **Documents** with auto-rename ([JOB_NO]_[DOC_TYPE]_[YYYYMMDD]).
- **Schedule Arrive** (H-2, confirm to dismiss).
- **Finance**: Invoice (subtotal + PPN + total), Coretax XML export, Kurs upsert weekly, Partner + bank details, SOA per customer.
- **Pricing**: Weekly rate upsert, LCL calculator (W/M rule), Trucking rate card.
- **Customs** docs + status.
- **Admin**: Users CRUD, Audit Log viewer.

## Prioritized Backlog (P0/P1/P2)
### P0 — Blockers when the client signs off pending items
- Coretax XML final schema alignment with DJP guidelines (currently generic e-Faktur template).
- Tanda Terima document template (waiting client format).
- Definisi PR (Payment Request vs Purchase Request) at Job Order sub-transactions.
- Komisi Sales rule engine (percentage / tier / closing condition).

### P1 — Feature depth
- Journal + COA management (double-entry) + Balance Sheet report.
- Reimbursement, CN, DN, PR, Kasbon sub-transaction forms tied to Job Order.
- Email/notification service (Resend integration when provider confirmed).
- 404 hardening + soft delete on Customer/Invoice/Job Order.
- Split `server.py` into feature routers as codebase grows.

### P2 — Hardening
- httpOnly cookie for JWT + brute-force lockout (auth playbook recommendation).
- Loading skeletons + error states on every list page.
- Full pytest suite already at 90/94; wire missing endpoints then flip 4 documented gaps green.
- Explicit CORS origin list from env.
- Object storage integration when file upload volume grows.

## Test Credentials
See `/app/memory/test_credentials.md`.

## Change Log
- 2026-02-XX — v1 MVP: 6 roles, 15 modules, 30+ endpoints, seed data, 90/94 backend tests pass. Fixed React Query cache leak on identity change, added client-side route guard, added 404 handling for PATCH endpoints, renamed demo test-ids to `demo-<role>`.
