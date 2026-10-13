import io
import base64
import json
import qrcode
from qrcode.image.pil import PilImage

def generate_booking_qr_code(booking_data: dict) -> str:
    """
    Generates a QR code image as a base64 Data URI from booking data.
    """
    # Create clean structured payload for the QR code
    qr_payload = {
        "booking_code": booking_data.get("booking_code"),
        "property_id": booking_data.get("property_id"),
        "customer": booking_data.get("customer_name"),
        "check_in": str(booking_data.get("check_in")),
        "check_out": str(booking_data.get("check_out")),
        "guests": booking_data.get("guest_count"),
        "status": booking_data.get("status"),
        "platform": "Gujarat Weekend Escapes"
    }
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#1e293b", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_str}"
