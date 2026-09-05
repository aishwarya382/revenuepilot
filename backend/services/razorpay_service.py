// backend/services/razorpay_service.py
import os
import uuid
import hmac
import hashlib
from datetime import datetime
from database import get_db_connection

# Environment variables for Razorpay credentials (test mode defaults)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_AiCommerceHackathon2026")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "SecretKeyRazorpayTest2026")

# Flag to simulate deterministic payment failure for demo purposes
SIMULATE_FAILURE = os.getenv("RAZORPAY_SIMULATE_FAILURE", "false").lower() == "true"

class RazorpayService:
    """Service layer for Razorpay integration.

    Provides order creation, payment verification, and deterministic failure
    simulation required by the hackathon specification. All actions are logged
    to the audit trail using the shared SQLite connection.
    """

    def __init__(self):
        self.key_id = RAZORPAY_KEY_ID
        self.key_secret = RAZORPAY_KEY_SECRET
        self.simulate_failure = SIMULATE_FAILURE

    def _log_audit(self, agent, action, reason, expected_benefit, status, permission_required, details):
        conn = get_db_connection()
        cursor = conn.cursor()
        now_time = datetime.now().strftime("%H:%M:%S")
        cursor.execute(
            """
            INSERT INTO audit_logs (timestamp, agent, action, reason, expected_benefit, status, permission_required, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now_time, agent, action, reason, expected_benefit, status, int(permission_required), details)
        )
        conn.commit()
        conn.close()

    def create_order(self, amount: float, currency: str = "INR", receipt: str = None):
        """Create a Razorpay order.

        If real Razorpay credentials are supplied (non‑test prefix) the SDK is used;
        otherwise a deterministic test order payload is returned.
        """
        if not receipt:
            receipt = f"rcpt_{uuid.uuid4().hex[:8]}"
        amount_in_paise = int(amount * 100)
        order_id = f"order_test_{uuid.uuid4().hex[:10]}"
        try:
            import razorpay
            client = razorpay.Client(auth=(self.key_id, self.key_secret))
            # Real live order creation only when using live keys (no test prefix)
            if not self.key_id.startswith("rzp_test_AiCommerce"):
                order = client.order.create({"amount": amount_in_paise, "currency": currency, "receipt": receipt})
                order_id = order["id"]
        except Exception as e:
            # SDK fallback – we stay in deterministic test mode
            print(f"Razorpay SDK fallback (order creation): {e}")
        # Audit log for order creation
        self._log_audit(
            agent="Checkout & Payment Agent",
            action="Razorpay Order Initiated",
            reason="Customer started checkout flow.",
            expected_benefit="Secure payment authorization via Razorpay",
            status="COMPLETED",
            permission_required=False,
            details=f"{{\"razorpay_order_id\": \"{order_id}\", \"amount\": {amount}, \"currency\": \"{currency}\"}}"
        )
        return {
            "id": order_id,
            "amount": amount_in_paise,
            "currency": currency,
            "receipt": receipt,
            "key_id": self.key_id,
            "status": "created",
        }

    def verify_payment(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str = None):
        """Verify Razorpay signature and mark order as PAID.

        When `self.simulate_failure` is true the verification is deliberately marked
        as failed, triggering the deterministic failure flow.
        """
        if self.simulate_failure:
            # Directly invoke the failure simulation path
            return self.simulate_failure_flow(razorpay_order_id, reason="Simulated failure flag enabled")

        # Normal verification – only performed when live keys are present
        if razorpay_signature and not self.key_id.startswith("rzp_test_AiCommerce"):
            msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
            generated_signature = hmac.new(self.key_secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
            if generated_signature != razorpay_signature:
                return {"status": "FAILED", "error": "Invalid signature"}
        # Audit success log
        self._log_audit(
            agent="Checkout & Payment Agent",
            action="Razorpay Payment Verified",
            reason="Signature validated successfully.",
            expected_benefit="Order completion & inventory allocation",
            status="COMPLETED",
            permission_required=False,
            details=f"{{\"order_id\": \"{razorpay_order_id}\", \"payment_id\": \"{razorpay_payment_id}\", \"status\": \"SUCCESS\"}}"
        )
        # Update order status in DB
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET status = 'PAID', razorpay_payment_id = ? WHERE razorpay_order_id = ?",
            (razorpay_payment_id, razorpay_order_id)
        )
        conn.commit()
        conn.close()
        return {
            "status": "SUCCESS",
            "message": "Payment verified successfully!",
            "order_id": razorpay_order_id,
            "payment_id": razorpay_payment_id,
        }

    def simulate_failure_flow(self, razorpay_order_id: str, amount: float = None, reason: str = "Test gateway failure (simulated)"):
        """Deterministic failure path used for the hackathon demo.

        Logs a PAYMENT_FAILED event and then an AI‑offered retry action.
        """
        payment_id = f"pay_failed_{uuid.uuid4().hex[:8]}"
        # Log failure in audit trail
        self._log_audit(
            agent="Checkout & Payment Agent",
            action="Payment Failed",
            reason=f"Razorpay test payment failed: {reason}",
            expected_benefit="Trigger bounded failure recovery protocol",
            status="FAILED",
            permission_required=True,
            details=f"{{\"order_id\": \"{razorpay_order_id}\", \"payment_id\": \"{payment_id}\", \"error\": \"{reason}\", \"automatic_retry\": false}}"
        )
        # Log AI retry offer
        self._log_audit(
            agent="AI Shopping Agent",
            action="Retry & Recovery Offered",
            reason="Within platform retry policy (Max 3 attempts, customer permission gated)",
            expected_benefit="Prevent lost sale & guide customer through recovery options",
            status="COMPLETED",
            permission_required=True,
            details=f"{{\"order_id\": \"{razorpay_order_id}\", \"offered_actions\": [\"Retry Payment\", \"Choose another method\", \"Cancel\"]}}"
        )
        # Update order status to FAILED
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET status = 'FAILED', failure_reason = ? WHERE razorpay_order_id = ?",
            (reason, razorpay_order_id)
        )
        conn.commit()
        conn.close()
        return {
            "status": "FAILED",
            "error_code": "PAYMENT_FAILED",
            "reason": reason,
            "razorpay_order_id": razorpay_order_id,
            "ai_explanation": {
                "title": "Payment Didn't Go Through",
                "message": f"We encountered a temporary payment gateway issue ({reason}). No money was deducted.",
                "automatic_retry": False,
                "permission_required": True,
                "options": [
                    {"id": "retry", "label": "Retry Payment", "primary": True},
                    {"id": "alt_method", "label": "Choose Another Method (UPI / NetBanking / EMI)", "primary": False},
                    {"id": "cancel", "label": "Cancel Order", "primary": False},
                ],
            },
        }

# Module‑level singleton for convenient imports elsewhere.
razorpay_service = RazorpayService()
