import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditLog

def log_event(db: Session, actor_type: str, actor_id: str, action: str, reason: str, metadata: dict = None, status: str = "COMPLETED"):
    try:
        audit = AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            reason=reason,
            metadata_json=json.dumps(metadata) if metadata else "{}",
            status=status,
            created_at=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        return audit
    except Exception as e:
        print(f"Audit log error: {e}")
        return None
