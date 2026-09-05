"""NusaFreight ERP - Freight Forwarding & Logistics Management System backend.

Single-file FastAPI + MongoDB app with JWT auth, granular RBAC, and modular routers
for Sales/CS/Customs/Finance/Pricing divisions plus Admin.
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nusafreight.com").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

ROLES = ["admin", "sales", "cs", "customs", "finance", "pricing"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="NusaFreight ERP")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("nusafreight")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    token = None
    if creds and creds.scheme.lower() == "bearer":
        token = creds.credentials
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*allowed: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed and user["role"] != "admin":
            raise HTTPException(status_code=403, detail=f"Forbidden for role {user['role']}")
        return user
    return dep


async def audit(actor: dict, action: str, entity: str, entity_id: str, changes: Any = None):
    if isinstance(changes, dict):
        changes = {k: v for k, v in changes.items() if k != "_id"}
    await db.audit_logs.insert_one(
        {
            "id": new_id(),
            "actor_id": actor["id"],
            "actor_email": actor["email"],
            "actor_role": actor["role"],
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "changes": changes,
            "created_at": now_iso(),
        }
    )


def strip(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Models (Pydantic v2)
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: str


class CustomerIn(BaseModel):
    name: str
    npwp: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    payment_terms: Optional[str] = "NET 30"
    sales_id: Optional[str] = None  # admin can assign; sales auto-assigned to self


class QuotationLine(BaseModel):
    description: str
    qty: float = 1
    unit: str = "LOT"
    price: float = 0
    currency: str = "IDR"


class QuotationIn(BaseModel):
    customer_id: str
    origin: str
    destination: str
    container_type: str = "20GP"
    weight_kg: float = 0
    volume_cbm: float = 0
    margin_pct: float = 10
    lines: List[QuotationLine] = []
    notes: Optional[str] = None
    sales_id: Optional[str] = None  # admin can override


class JobOrderIn(BaseModel):
    quotation_id: str
    customer_id: str
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    origin: str
    destination: str
    eta: Optional[str] = None  # ISO date
    etd: Optional[str] = None
    vessel: Optional[str] = None
    voyage: Optional[str] = None
    bl_no: Optional[str] = None
    container_no: Optional[str] = None
    remarks: Optional[str] = None


class JobOrderFinancePatch(BaseModel):
    buy_rate: Optional[float] = None
    sell_rate: Optional[float] = None
    reimbursement: Optional[float] = None
    kasbon: Optional[float] = None
    cn_amount: Optional[float] = None
    dn_amount: Optional[float] = None
    pr_amount: Optional[float] = None
    finance_notes: Optional[str] = None


class InvoiceIn(BaseModel):
    job_order_id: Optional[str] = None
    customer_id: str
    invoice_no: str
    invoice_date: str
    due_date: Optional[str] = None
    currency: str = "IDR"
    lines: List[QuotationLine] = []
    ppn_pct: float = 11
    notes: Optional[str] = None


class KursIn(BaseModel):
    currency: str  # USD, EUR, SGD, RMB
    rate: float  # to IDR
    week_of: str  # ISO date (Monday)


class PartnerIn(BaseModel):
    name: str
    type: str = "vendor"  # vendor / agent / trucking
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    bank_account_holder: Optional[str] = None
    notes: Optional[str] = None


class TruckingRateIn(BaseModel):
    origin: str
    destination: str
    container_type: str = "20GP"
    rate: float
    currency: str = "IDR"
    valid_from: Optional[str] = None


class WeeklyPriceIn(BaseModel):
    lane: str  # eg: JKT->SIN
    container_type: str
    ocean_freight: float
    thc_origin: float = 0
    thc_dest: float = 0
    doc_fee: float = 0
    currency: str = "USD"
    week_of: str


class LCLCalcIn(BaseModel):
    weight_kg: float
    volume_cbm: float
    rate_per_cbm: float
    minimum_charge: float = 0
    currency: str = "USD"


class TaxCalcIn(BaseModel):
    fob_value: float
    freight: float = 0
    insurance: float = 0
    currency: str = "USD"
    kurs: float  # to IDR
    bm_pct: float = 5
    ppn_pct: float = 11
    pph_pct: float = 2.5


class ShipmentStatusIn(BaseModel):
    stage: str  # booking, picked_up, port_loading, on_vessel, customs_cleared, delivered
    note: Optional[str] = None


class ScheduleArriveConfirm(BaseModel):
    confirmed: bool = True
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    strip(user)
    user.pop("password_hash", None)
    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": user}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# ---------------------------------------------------------------------------
# Users (Admin)
# ---------------------------------------------------------------------------
@api.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


@api.post("/users")
async def create_user(body: UserCreate, actor: dict = Depends(require_roles("admin"))):
    if body.role not in ROLES:
        raise HTTPException(400, "invalid role")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "email exists")
    doc = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await audit(actor, "create", "user", doc["id"], {"email": email, "role": body.role})
    doc.pop("password_hash")
    doc.pop("_id", None)
    return doc


@api.delete("/users/{uid}")
async def delete_user(uid: str, actor: dict = Depends(require_roles("admin"))):
    if uid == actor["id"]:
        raise HTTPException(400, "cannot delete self")
    await db.users.delete_one({"id": uid})
    await audit(actor, "delete", "user", uid)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Customers (Master) — data isolation per sales
# ---------------------------------------------------------------------------
def customer_visibility_filter(user: dict) -> dict:
    if user["role"] == "sales":
        return {"sales_id": user["id"]}
    return {}


@api.get("/customers")
async def list_customers(user: dict = Depends(get_current_user)):
    q = customer_visibility_filter(user)
    docs = await db.customers.find(q, {"_id": 0}).to_list(1000)
    return docs


@api.post("/customers")
async def create_customer(body: CustomerIn, user: dict = Depends(require_roles("sales", "admin", "cs"))):
    sales_id = body.sales_id
    if user["role"] == "sales":
        sales_id = user["id"]  # sales can only own
    elif not sales_id:
        sales_id = user["id"]
    doc = body.model_dump()
    doc.update({"id": new_id(), "sales_id": sales_id, "created_at": now_iso(), "created_by": user["id"]})
    await db.customers.insert_one(doc)
    await audit(user, "create", "customer", doc["id"], doc)
    doc.pop("_id", None)
    return doc


@api.patch("/customers/{cid}")
async def update_customer(cid: str, body: dict = Body(...), user: dict = Depends(get_current_user)):
    existing = await db.customers.find_one({"id": cid})
    if not existing:
        raise HTTPException(404, "not found")
    if user["role"] == "sales" and existing.get("sales_id") != user["id"]:
        raise HTTPException(404, "not found")
    if user["role"] not in ("admin", "sales", "finance"):
        raise HTTPException(403, "forbidden")
    body.pop("id", None)
    body.pop("_id", None)
    if user["role"] != "admin":
        body.pop("sales_id", None)
    await db.customers.update_one({"id": cid}, {"$set": body})
    await audit(user, "update", "customer", cid, body)
    doc = await db.customers.find_one({"id": cid}, {"_id": 0})
    return doc


# ---------------------------------------------------------------------------
# Quotation (Sales)
# ---------------------------------------------------------------------------
def quotation_visibility_filter(user: dict) -> dict:
    if user["role"] == "sales":
        return {"sales_id": user["id"]}
    return {}


def compute_quotation_totals(q: dict) -> dict:
    subtotal = sum((l.get("qty", 1) * l.get("price", 0)) for l in q.get("lines", []))
    margin = subtotal * (q.get("margin_pct", 0) / 100.0)
    total = subtotal + margin
    q["subtotal"] = round(subtotal, 2)
    q["margin_amount"] = round(margin, 2)
    q["total"] = round(total, 2)
    return q


@api.get("/quotations")
async def list_quotations(user: dict = Depends(get_current_user)):
    q = quotation_visibility_filter(user)
    docs = await db.quotations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/quotations")
async def create_quotation(body: QuotationIn, user: dict = Depends(require_roles("sales", "admin"))):
    sales_id = body.sales_id if user["role"] == "admin" and body.sales_id else user["id"]
    customer = await db.customers.find_one({"id": body.customer_id})
    if not customer:
        raise HTTPException(400, "customer not found")
    if user["role"] == "sales" and customer.get("sales_id") != user["id"]:
        raise HTTPException(403, "cannot use customer of another sales")
    doc = body.model_dump()
    doc.update(
        {
            "id": new_id(),
            "quotation_no": f"QTN-{datetime.now().strftime('%Y%m%d')}-{new_id()[:6].upper()}",
            "sales_id": sales_id,
            "status": "draft",
            "created_at": now_iso(),
            "created_by": user["id"],
        }
    )
    doc = compute_quotation_totals(doc)
    await db.quotations.insert_one(doc)
    await audit(user, "create", "quotation", doc["id"])
    doc.pop("_id", None)
    return doc


@api.post("/quotations/{qid}/execute")
async def execute_quotation(qid: str, user: dict = Depends(require_roles("sales", "admin"))):
    q = await db.quotations.find_one({"id": qid})
    if not q:
        raise HTTPException(404, "not found")
    if user["role"] == "sales" and q.get("sales_id") != user["id"]:
        raise HTTPException(404, "not found")
    await db.quotations.update_one({"id": qid}, {"$set": {"status": "executed", "executed_at": now_iso()}})
    await audit(user, "execute", "quotation", qid)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Job Order (CS + Finance)
# ---------------------------------------------------------------------------
CS_ALLOWED_FIELDS = {
    "shipper", "consignee", "origin", "destination", "eta", "etd", "vessel",
    "voyage", "bl_no", "container_no", "remarks",
}
FINANCE_ALLOWED_FIELDS = CS_ALLOWED_FIELDS | {
    "buy_rate", "sell_rate", "reimbursement", "kasbon",
    "cn_amount", "dn_amount", "pr_amount", "finance_notes",
}


@api.get("/job-orders")
async def list_job_orders(user: dict = Depends(get_current_user)):
    docs = await db.job_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if user["role"] == "cs":
        # hide finance-only fields
        finance_only = FINANCE_ALLOWED_FIELDS - CS_ALLOWED_FIELDS
        for d in docs:
            for f in finance_only:
                d.pop(f, None)
    return docs


@api.post("/job-orders")
async def create_job_order(body: JobOrderIn, user: dict = Depends(require_roles("cs", "admin", "finance"))):
    q = await db.quotations.find_one({"id": body.quotation_id})
    if not q or q.get("status") != "executed":
        raise HTTPException(400, "quotation must be executed")
    doc = body.model_dump()
    doc.update(
        {
            "id": new_id(),
            "job_no": f"JO-{datetime.now().strftime('%Y%m%d')}-{new_id()[:6].upper()}",
            "status": "booking",
            "shipment_status": [{"stage": "booking", "at": now_iso(), "by": user["id"], "note": "Created"}],
            "created_at": now_iso(),
            "created_by": user["id"],
            "sales_id": q.get("sales_id"),
        }
    )
    await db.job_orders.insert_one(doc)
    await audit(user, "create", "job_order", doc["id"])
    doc.pop("_id", None)
    return doc


@api.patch("/job-orders/{jid}")
async def update_job_order(jid: str, body: dict = Body(...), user: dict = Depends(get_current_user)):
    if user["role"] == "cs":
        allowed = CS_ALLOWED_FIELDS
    elif user["role"] in ("finance", "admin"):
        allowed = FINANCE_ALLOWED_FIELDS
    else:
        raise HTTPException(403, "forbidden")
    filtered = {k: v for k, v in body.items() if k in allowed}
    if not filtered:
        raise HTTPException(400, "no allowed fields to update")
    result = await db.job_orders.update_one({"id": jid}, {"$set": filtered})
    if result.matched_count == 0:
        raise HTTPException(404, "not found")
    await audit(user, "update", "job_order", jid, filtered)
    doc = await db.job_orders.find_one({"id": jid}, {"_id": 0})
    return doc


@api.post("/job-orders/{jid}/shipment-status")
async def push_shipment_status(jid: str, body: ShipmentStatusIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("cs", "customs", "finance", "admin"):
        raise HTTPException(403, "forbidden")
    entry = {"stage": body.stage, "at": now_iso(), "by": user["id"], "by_role": user["role"], "note": body.note}
    result = await db.job_orders.update_one(
        {"id": jid},
        {"$push": {"shipment_status": entry}, "$set": {"status": body.stage}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "not found")
    await audit(user, "shipment_status", "job_order", jid, entry)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Documents & Schedule Arrive
# ---------------------------------------------------------------------------
@api.get("/documents")
async def list_documents(user: dict = Depends(get_current_user)):
    docs = await db.documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/documents")
async def create_document(body: dict = Body(...), user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "job_order_id": body.get("job_order_id"),
        "doc_type": body.get("doc_type", "BL"),  # BL, CIPL, COO, custom
        "file_name": body.get("file_name"),
        "file_url": body.get("file_url"),
        "auto_name": None,
        "notes": body.get("notes"),
        "created_at": now_iso(),
        "created_by": user["id"],
    }
    # auto-rename: [JOB_NO]_[DOC_TYPE]_[YYYYMMDD].ext
    if doc["job_order_id"]:
        jo = await db.job_orders.find_one({"id": doc["job_order_id"]})
        if jo and doc["file_name"]:
            ext = doc["file_name"].split(".")[-1] if "." in doc["file_name"] else "pdf"
            doc["auto_name"] = f"{jo['job_no']}_{doc['doc_type']}_{datetime.now().strftime('%Y%m%d')}.{ext}"
    await db.documents.insert_one(doc)
    await audit(user, "create", "document", doc["id"])
    doc.pop("_id", None)
    return doc


@api.get("/schedule-arrive")
async def list_schedule_arrive(user: dict = Depends(get_current_user)):
    """Job orders with ETA within next 2 days and not confirmed."""
    now = datetime.now(timezone.utc)
    horizon = (now + timedelta(days=2)).isoformat()
    docs = await db.job_orders.find(
        {"eta": {"$lte": horizon, "$gte": now.isoformat()[:10]}, "arrive_confirmed": {"$ne": True}},
        {"_id": 0},
    ).to_list(200)
    return docs


@api.post("/schedule-arrive/{jid}/confirm")
async def confirm_arrive(jid: str, body: ScheduleArriveConfirm, user: dict = Depends(get_current_user)):
    result = await db.job_orders.update_one(
        {"id": jid},
        {"$set": {"arrive_confirmed": body.confirmed, "arrive_confirmed_by": user["id"], "arrive_confirmed_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "not found")
    await audit(user, "confirm_arrive", "job_order", jid, {"note": body.note})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Finance: Invoice, Kurs, Partner, SOA, Coretax XML
# ---------------------------------------------------------------------------
@api.get("/invoices")
async def list_invoices(user: dict = Depends(require_roles("finance", "admin", "sales", "cs"))):
    docs = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/invoices")
async def create_invoice(body: InvoiceIn, user: dict = Depends(require_roles("finance", "admin"))):
    doc = body.model_dump()
    subtotal = sum(l["qty"] * l["price"] for l in doc["lines"])
    ppn = subtotal * (doc["ppn_pct"] / 100.0)
    doc.update(
        {
            "id": new_id(),
            "subtotal": round(subtotal, 2),
            "ppn_amount": round(ppn, 2),
            "total": round(subtotal + ppn, 2),
            "status": "unpaid",
            "created_at": now_iso(),
            "created_by": user["id"],
        }
    )
    await db.invoices.insert_one(doc)
    await audit(user, "create", "invoice", doc["id"], {"total": doc["total"]})
    doc.pop("_id", None)
    return doc


@api.post("/invoices/{iid}/mark-paid")
async def mark_paid(iid: str, user: dict = Depends(require_roles("finance", "admin"))):
    result = await db.invoices.update_one({"id": iid}, {"$set": {"status": "paid", "paid_at": now_iso()}})
    if result.matched_count == 0:
        raise HTTPException(404, "not found")
    await audit(user, "mark_paid", "invoice", iid)
    return {"ok": True}


@api.get("/kurs")
async def list_kurs(user: dict = Depends(get_current_user)):
    docs = await db.kurs.find({}, {"_id": 0}).sort("week_of", -1).to_list(200)
    return docs


@api.post("/kurs")
async def upsert_kurs(body: KursIn, user: dict = Depends(require_roles("finance", "admin"))):
    doc = body.model_dump()
    doc["currency"] = doc["currency"].upper()
    existing = await db.kurs.find_one({"currency": doc["currency"], "week_of": doc["week_of"]})
    if existing:
        await db.kurs.update_one({"id": existing["id"]}, {"$set": {"rate": doc["rate"], "updated_at": now_iso(), "updated_by": user["id"]}})
        await audit(user, "update", "kurs", existing["id"], doc)
        return {**strip(existing), "rate": doc["rate"]}
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"]})
    await db.kurs.insert_one(doc)
    await audit(user, "create", "kurs", doc["id"], doc)
    doc.pop("_id", None)
    return doc


@api.get("/partners")
async def list_partners(user: dict = Depends(get_current_user)):
    docs = await db.partners.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return docs


@api.post("/partners")
async def create_partner(body: PartnerIn, user: dict = Depends(require_roles("finance", "admin"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"]})
    await db.partners.insert_one(doc)
    await audit(user, "create", "partner", doc["id"])
    doc.pop("_id", None)
    return doc


@api.get("/soa/{customer_id}")
async def soa(customer_id: str, user: dict = Depends(require_roles("finance", "admin", "sales"))):
    invs = await db.invoices.find({"customer_id": customer_id}, {"_id": 0}).to_list(500)
    total = sum(i.get("total", 0) for i in invs)
    outstanding = sum(i.get("total", 0) for i in invs if i.get("status") != "paid")
    return {"customer_id": customer_id, "invoices": invs, "total": total, "outstanding": outstanding}


@api.get("/invoices/{iid}/coretax-xml")
async def coretax_xml(iid: str, user: dict = Depends(require_roles("finance", "admin"))):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "not found")
    cust = await db.customers.find_one({"id": inv["customer_id"]}, {"_id": 0}) or {}
    lines_xml = "\n".join(
        f"    <LineItem><Desc>{l['description']}</Desc><Qty>{l['qty']}</Qty><Price>{l['price']}</Price></LineItem>"
        for l in inv.get("lines", [])
    )
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<TaxInvoice>
  <Header>
    <InvoiceNo>{inv['invoice_no']}</InvoiceNo>
    <InvoiceDate>{inv['invoice_date']}</InvoiceDate>
    <Currency>{inv.get('currency','IDR')}</Currency>
  </Header>
  <Buyer>
    <Name>{cust.get('name','')}</Name>
    <NPWP>{cust.get('npwp','')}</NPWP>
    <Address>{cust.get('address','')}</Address>
  </Buyer>
  <Lines>
{lines_xml}
  </Lines>
  <Totals>
    <Subtotal>{inv.get('subtotal',0)}</Subtotal>
    <PPN>{inv.get('ppn_amount',0)}</PPN>
    <Total>{inv.get('total',0)}</Total>
  </Totals>
</TaxInvoice>"""
    return {"xml": xml, "filename": f"CORETAX_{inv['invoice_no']}.xml"}


# ---------------------------------------------------------------------------
# Pricing: weekly rates, LCL, trucking
# ---------------------------------------------------------------------------
@api.get("/weekly-prices")
async def list_weekly_prices(user: dict = Depends(get_current_user)):
    docs = await db.weekly_prices.find({}, {"_id": 0}).sort("week_of", -1).to_list(500)
    return docs


@api.post("/weekly-prices")
async def upsert_weekly_price(body: WeeklyPriceIn, user: dict = Depends(require_roles("pricing", "admin"))):
    doc = body.model_dump()
    existing = await db.weekly_prices.find_one({"lane": doc["lane"], "container_type": doc["container_type"], "week_of": doc["week_of"]})
    if existing:
        await db.weekly_prices.update_one({"id": existing["id"]}, {"$set": doc})
        await audit(user, "update", "weekly_price", existing["id"])
        return {**strip(existing), **doc}
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"]})
    await db.weekly_prices.insert_one(doc)
    await audit(user, "create", "weekly_price", doc["id"])
    doc.pop("_id", None)
    return doc


@api.post("/pricing/lcl-calc")
async def lcl_calc(body: LCLCalcIn, user: dict = Depends(get_current_user)):
    # Chargeable weight: max(actual weight in tons, volume in cbm) — 1 CBM = 1000 KG rule
    weight_ton = body.weight_kg / 1000.0
    chargeable = max(weight_ton, body.volume_cbm)
    price = chargeable * body.rate_per_cbm
    price = max(price, body.minimum_charge)
    return {
        "chargeable_weight": round(chargeable, 3),
        "unit": "W/M (whichever greater)",
        "price": round(price, 2),
        "currency": body.currency,
        "breakdown": {"weight_ton": round(weight_ton, 3), "volume_cbm": body.volume_cbm, "rate_per_cbm": body.rate_per_cbm},
    }


@api.post("/pricing/import-tax-calc")
async def import_tax_calc(body: TaxCalcIn, user: dict = Depends(get_current_user)):
    cif_foreign = body.fob_value + body.freight + body.insurance
    cif_idr = cif_foreign * body.kurs
    bm = cif_idr * (body.bm_pct / 100.0)
    nilai_impor = cif_idr + bm
    ppn = nilai_impor * (body.ppn_pct / 100.0)
    pph = nilai_impor * (body.pph_pct / 100.0)
    total = bm + ppn + pph
    return {
        "cif_foreign": round(cif_foreign, 2),
        "cif_idr": round(cif_idr, 2),
        "bea_masuk": round(bm, 2),
        "nilai_impor": round(nilai_impor, 2),
        "ppn": round(ppn, 2),
        "pph": round(pph, 2),
        "total_pajak": round(total, 2),
        "currency_source": body.currency,
    }


@api.get("/trucking-rates")
async def list_trucking(user: dict = Depends(get_current_user)):
    docs = await db.trucking_rates.find({}, {"_id": 0}).to_list(500)
    return docs


@api.post("/trucking-rates")
async def create_trucking(body: TruckingRateIn, user: dict = Depends(require_roles("pricing", "admin"))):
    doc = body.model_dump()
    doc.update({"id": new_id(), "created_at": now_iso(), "created_by": user["id"]})
    await db.trucking_rates.insert_one(doc)
    await audit(user, "create", "trucking_rate", doc["id"])
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Customs
# ---------------------------------------------------------------------------
@api.get("/customs-docs")
async def list_customs_docs(user: dict = Depends(get_current_user)):
    docs = await db.customs_docs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/customs-docs")
async def create_customs_doc(body: dict = Body(...), user: dict = Depends(require_roles("customs", "admin"))):
    doc = {
        "id": new_id(),
        "job_order_id": body.get("job_order_id"),
        "doc_number": body.get("doc_number"),
        "doc_type": body.get("doc_type", "PIB"),
        "status": body.get("status", "in_progress"),
        "notes": body.get("notes"),
        "created_at": now_iso(),
        "created_by": user["id"],
    }
    await db.customs_docs.insert_one(doc)
    await audit(user, "create", "customs_doc", doc["id"])
    doc.pop("_id", None)
    return doc


@api.patch("/customs-docs/{cid}")
async def update_customs_doc(cid: str, body: dict = Body(...), user: dict = Depends(require_roles("customs", "admin"))):
    body.pop("id", None)
    body.pop("_id", None)
    result = await db.customs_docs.update_one({"id": cid}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(404, "not found")
    await audit(user, "update", "customs_doc", cid, body)
    doc = await db.customs_docs.find_one({"id": cid}, {"_id": 0})
    return doc


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
@api.get("/audit-logs")
async def list_audit(user: dict = Depends(require_roles("admin", "finance"))):
    docs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return docs


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    role = user["role"]
    out: dict = {"role": role}
    if role in ("sales", "admin"):
        q_filter = {"sales_id": user["id"]} if role == "sales" else {}
        out["quotations"] = {
            "total": await db.quotations.count_documents(q_filter),
            "draft": await db.quotations.count_documents({**q_filter, "status": "draft"}),
            "executed": await db.quotations.count_documents({**q_filter, "status": "executed"}),
        }
    if role in ("cs", "finance", "admin"):
        out["job_orders"] = {
            "total": await db.job_orders.count_documents({}),
            "in_transit": await db.job_orders.count_documents({"status": "on_vessel"}),
            "delivered": await db.job_orders.count_documents({"status": "delivered"}),
        }
    if role in ("finance", "admin"):
        invs = await db.invoices.find({}, {"total": 1, "status": 1, "_id": 0}).to_list(1000)
        out["invoices"] = {
            "total": len(invs),
            "outstanding": sum(i.get("total", 0) for i in invs if i.get("status") != "paid"),
            "paid": sum(i.get("total", 0) for i in invs if i.get("status") == "paid"),
        }
    if role in ("customs", "admin"):
        out["customs"] = {
            "pending": await db.customs_docs.count_documents({"status": "in_progress"}),
            "cleared": await db.customs_docs.count_documents({"status": "cleared"}),
        }
    if role in ("pricing", "admin"):
        out["weekly_prices"] = await db.weekly_prices.count_documents({})
    horizon = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    out["arrivals_h2"] = await db.job_orders.count_documents(
        {"eta": {"$lte": horizon}, "arrive_confirmed": {"$ne": True}}
    )
    return out


# ---------------------------------------------------------------------------
# Startup: seed users & indexes
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("sales_id")
    await db.quotations.create_index("sales_id")
    await db.job_orders.create_index("created_at")
    await db.kurs.create_index([("currency", 1), ("week_of", 1)], unique=True)

    # Seed admin using real owner email
    existing_admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing_admin:
        await db.users.insert_one(
            {
                "id": new_id(),
                "email": ADMIN_EMAIL,
                "name": "Admin (Owner)",
                "role": "admin",
                "password_hash": hash_password(ADMIN_PASSWORD),
                "created_at": now_iso(),
            }
        )
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")

    # Seed one demo user per role
    demo_users = [
        ("sales@nusafreight.com", "Sinta Sales", "sales"),
        ("cs@nusafreight.com", "Citra CS", "cs"),
        ("customs@nusafreight.com", "Cakra Customs", "customs"),
        ("finance@nusafreight.com", "Farah Finance", "finance"),
        ("pricing@nusafreight.com", "Panji Pricing", "pricing"),
    ]
    for email, name, role in demo_users:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one(
                {
                    "id": new_id(),
                    "email": email,
                    "name": name,
                    "role": role,
                    "password_hash": hash_password("Demo@2026"),
                    "created_at": now_iso(),
                }
            )

    # Seed sample kurs
    if await db.kurs.count_documents({}) == 0:
        week_of = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for cur, rate in [("USD", 15850), ("EUR", 17200), ("SGD", 11800), ("RMB", 2180)]:
            await db.kurs.insert_one(
                {"id": new_id(), "currency": cur, "rate": rate, "week_of": week_of, "created_at": now_iso()}
            )

    # Seed sample customers (for demo sales user)
    sales_user = await db.users.find_one({"email": "sales@nusafreight.com"})
    if sales_user and await db.customers.count_documents({}) == 0:
        for i, (name, npwp) in enumerate([
            ("PT Nusantara Trading", "01.234.567.8-901.000"),
            ("CV Bahari Cargo", "02.345.678.9-012.000"),
            ("PT Global Import Indonesia", "03.456.789.0-123.000"),
        ]):
            await db.customers.insert_one(
                {
                    "id": new_id(),
                    "name": name,
                    "npwp": npwp,
                    "address": f"Jl. Contoh No. {i+1}, Jakarta",
                    "contact_person": f"Manager {i+1}",
                    "phone": f"+62-21-555-{1000+i}",
                    "email": f"contact{i+1}@example.co.id",
                    "payment_terms": "NET 30",
                    "sales_id": sales_user["id"],
                    "created_at": now_iso(),
                }
            )

    # Seed sample trucking rates
    if await db.trucking_rates.count_documents({}) == 0:
        for orig, dest, ctype, rate in [
            ("Tanjung Priok", "Bandung", "20GP", 3500000),
            ("Tanjung Priok", "Bandung", "40HC", 4800000),
            ("Tanjung Priok", "Surabaya", "20GP", 8500000),
            ("Tanjung Perak", "Semarang", "20GP", 4500000),
        ]:
            await db.trucking_rates.insert_one(
                {"id": new_id(), "origin": orig, "destination": dest, "container_type": ctype,
                 "rate": rate, "currency": "IDR", "created_at": now_iso()}
            )

    # Write test credentials
    BASE_DIR = Path(__file__).resolve().parent
    creds_path = BASE_DIR / "memory" / "test_credentials.md"
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(
        f"""# NusaFreight ERP Test Credentials

## Admin (Owner)
- Email: {ADMIN_EMAIL}
- Password: {ADMIN_PASSWORD}
- Role: admin

## Demo Users (all use password: Demo@2026)
- sales@nusafreight.com — Sales
- cs@nusafreight.com — Customer Service
- customs@nusafreight.com — Customs
- finance@nusafreight.com — Finance
- pricing@nusafreight.com — Pricing

## Endpoints
- POST /api/auth/login  {{email, password}}
- GET  /api/auth/me     Authorization: Bearer <token>
- GET  /api/dashboard
- CRUD /api/customers /api/quotations /api/job-orders /api/invoices /api/kurs /api/partners /api/weekly-prices /api/trucking-rates /api/customs-docs
- POST /api/pricing/lcl-calc  /api/pricing/import-tax-calc
- GET  /api/schedule-arrive
- GET  /api/invoices/{{id}}/coretax-xml
"""
    )
    logger.info("Seeding complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# Register router & CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
