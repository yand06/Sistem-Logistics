# NusaFreight ERP Test Credentials

## Admin (Owner)
- Email: your_email@example.com
- Password: your_password_here
- Role: admin

## Demo Users (all use password: Demo@2026)
- sales@nusafreight.com — Sales
- cs@nusafreight.com — Customer Service
- customs@nusafreight.com — Customs
- finance@nusafreight.com — Finance
- pricing@nusafreight.com — Pricing

## Endpoints
- POST /api/auth/login  {email, password}
- GET  /api/auth/me     Authorization: Bearer <token>
- GET  /api/dashboard
- CRUD /api/customers /api/quotations /api/job-orders /api/invoices /api/kurs /api/partners /api/weekly-prices /api/trucking-rates /api/customs-docs
- POST /api/pricing/lcl-calc  /api/pricing/import-tax-calc
- GET  /api/schedule-arrive
- GET  /api/invoices/{id}/coretax-xml
