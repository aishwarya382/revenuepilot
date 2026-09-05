import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])

@router.get("")
def get_audit_logs(limit: int = 50, filter_status: str = None, db: Session = Depends(get_db)):
    query = db.query(AuditLog)
    if filter_status:
        query = query.filter(AuditLog.status == filter_status)
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "timestamp": log.created_at.strftime("%H:%M:%S"),
            "agent": log.actor_type,
            "actor_id": log.actor_id,
            "action": log.action,
            "reason": log.reason,
            "status": log.status,
            "permission_required": True if "APPROVED" in log.action or "Initiated" in log.action else False,
            "details": json.loads(log.metadata_json) if log.metadata_json else {}
        })
    return {"audit_logs": result}
