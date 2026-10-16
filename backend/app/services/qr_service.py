import io
import base64
import secrets
import qrcode
from qrcode.image.pil import PilImage
from backend.app.config import settings

def generate_verification_token() -> str:
    """
    Generates a cryptographically secure, unguessable verification token
    prefixed with 'gwk_' for identifying Gujarat Weekend passes.
    """
    return f"gwk_{secrets.token_urlsafe(24)}"

def build_verification_url(token_or_code: str, base_url: str | None = None) -> str:
    """
    Constructs the digital booking pass verification URL.
    Example: http://localhost:3000/booking-pass/verify/gwk_abcdef123456
    """
    base = (base_url or getattr(settings, "FRONTEND_URL", "http://localhost:3000")).rstrip("/")
    clean_token = str(token_or_code).strip()
    return f"{base}/booking-pass/verify/{clean_token}"

def generate_booking_qr_code(payload: str | dict, base_url: str | None = None) -> str:
    """
    Generates a QR code image as a base64 Data URI from a verification token,
    booking reference, or dictionary.
    
    Instead of exposing raw customer/booking JSON data, this generates a secure
    URL pointing to the Digital Booking Pass verification page.
    """
    if isinstance(payload, dict):
        token = payload.get("verification_token") or payload.get("booking_code") or ""
        qr_content = build_verification_url(token, base_url)
    elif isinstance(payload, str) and (payload.startswith("http://") or payload.startswith("https://") or payload.startswith("/")):
        qr_content = payload
    else:
        qr_content = build_verification_url(str(payload), base_url)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_content)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1e293b", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_str}"
