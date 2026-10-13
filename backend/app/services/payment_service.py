import hmac
import hashlib
import time
import uuid
from typing import Dict, Any, Tuple
from backend.app.config import settings

class PaymentService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.simulation_mode = settings.RAZORPAY_SIMULATION_MODE

    def create_order(self, booking_code: str, amount_in_rupees: float) -> Dict[str, Any]:
        """
        Creates a payment order.
        Amount for Razorpay is converted to paise (amount * 100).
        """
        amount_paise = int(round(amount_in_rupees * 100))
        # Generates a standard Razorpay formatted order ID
        timestamp = int(time.time())
        order_id = f"order_guj_{booking_code.replace('-', '')}_{timestamp}"
        
        return {
            "order_id": order_id,
            "amount": amount_in_rupees,
            "amount_paise": amount_paise,
            "currency": "INR",
            "key_id": self.key_id,
            "booking_code": booking_code
        }

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verifies Razorpay HMAC-SHA256 signature server-side.
        Formula: hmac_sha256(order_id + "|" + payment_id, secret) == signature
        """
        if not order_id or not payment_id or not signature:
            return False

        message = f"{order_id}|{payment_id}".encode("utf-8")
        secret = self.key_secret.encode("utf-8")
        generated_signature = hmac.new(secret, message, hashlib.sha256).hexdigest()

        # In simulation mode, accept either true HMAC or simulated test signature prefix
        if hmac.compare_digest(generated_signature, signature):
            return True
        
        # Test simulation fallback signature format
        if self.simulation_mode and signature.startswith("sim_sig_"):
            return True

        return False

    def generate_simulation_signature(self, order_id: str, payment_id: str) -> str:
        """
        Helper for client/testing in simulation mode to produce a valid HMAC signature.
        """
        message = f"{order_id}|{payment_id}".encode("utf-8")
        secret = self.key_secret.encode("utf-8")
        return hmac.new(secret, message, hashlib.sha256).hexdigest()

payment_service = PaymentService()
