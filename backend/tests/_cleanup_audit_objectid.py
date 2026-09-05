"""One-off maintenance: strip Mongo ObjectId leaked into audit_logs.changes (caused GET /api/audit-logs 500)."""
import asyncio
import os

from bson import ObjectId
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

env = dotenv_values("/app/backend/.env")
MONGO_URL = os.environ.get("MONGO_URL") or env["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME") or env["DB_NAME"]


async def main():
    c = AsyncIOMotorClient(MONGO_URL)
    db = c[DB_NAME]
    fixed = 0
    async for log in db.audit_logs.find({}):
        ch = log.get("changes")
        if isinstance(ch, dict) and any(isinstance(v, ObjectId) for v in ch.values()):
            await db.audit_logs.update_one(
                {"_id": log["_id"]},
                {"$set": {"changes": {k: v for k, v in ch.items() if not isinstance(v, ObjectId)}}},
            )
            fixed += 1
    print(f"fixed {fixed} audit_logs docs")
    c.close()


asyncio.run(main())
