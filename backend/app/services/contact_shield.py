import re
from typing import Tuple, List, Dict, Any

# Number word dictionary for detecting spelled out digits
DIGIT_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "shunya": "0", "ek": "1", "do": "2", "teen": "3", "char": "4",
    "paanch": "5", "che": "6", "saat": "7", "aath": "8", "nau": "9"
}

# Common UPI bank handles in India
UPI_HANDLES = (
    "okhdfcbank|okaxis|okicici|oksbi|paytm|upi|apl|ybl|axl|ibl|barodampay|"
    "postbank|fbl|icici|hdfcbank|sbi|kotak|axisbank|indus|yesbank"
)

MASK_REPLACEMENT = "[CONTACT INFO HIDDEN - AVAILABLE AFTER CONFIRMED BOOKING]"

class ContactShield:
    @staticmethod
    def normalize_for_digits(text: str) -> str:
        """Replace spelled out number words with digits for secondary pattern check"""
        words = text.lower().split()
        normalized_words = [DIGIT_WORDS.get(w, w) for w in words]
        return " ".join(normalized_words)

    @classmethod
    def scan_message(cls, text: str) -> Dict[str, Any]:
        """
        Scans a message for contact bypass attempts:
        - Phone numbers (Indian 10-digit, +91, obfuscated spaces/separators, spelled out)
        - Email addresses (standard and obfuscated)
        - WhatsApp links and keywords
        - UPI IDs and payment bypass links
        - Telegram and Instagram handles/links
        - Bypass phrases (call me, contact outside, etc.)
        """
        if not text:
            return {
                "has_contact": False,
                "reasons": [],
                "masked_text": text,
                "snippets": []
            }

        reasons = []
        snippets = []
        masked = text

        # 1. Standard & Obfuscated Email Addresses
        # Matches: user@domain.com, user (at) domain (dot) com
        email_pattern = re.compile(
            r'([a-zA-Z0-9_.+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+)[a-zA-Z0-9-]+(?:\s*\.\s*|\s*\[dot\]\s*|\s*\(dot\)\s*|\s+dot\s+)[a-zA-Z0-9-.]+)',
            re.IGNORECASE
        )
        for match in email_pattern.finditer(masked):
            s = match.group(1)
            reasons.append("Email address detected")
            snippets.append(s)
            masked = masked.replace(s, MASK_REPLACEMENT)

        # 2. WhatsApp URLs & Links
        wa_link_pattern = re.compile(
            r'((?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[a-zA-Z0-9_\-\/?=]+)',
            re.IGNORECASE
        )
        for match in wa_link_pattern.finditer(masked):
            s = match.group(1)
            reasons.append("WhatsApp link detected")
            snippets.append(s)
            masked = masked.replace(s, MASK_REPLACEMENT)

        # 3. Telegram & Instagram Links/Usernames
        social_pattern = re.compile(
            r'((?:https?:\/\/)?(?:t\.me|telegram\.me|instagram\.com)\/[a-zA-Z0-9_\.\-]+|(?:telegram|insta|ig)\s*(?::|id|handle)?\s*@[a-zA-Z0-9_\.]+)',
            re.IGNORECASE
        )
        for match in social_pattern.finditer(masked):
            s = match.group(1)
            reasons.append("Social media handle / link detected")
            snippets.append(s)
            masked = masked.replace(s, MASK_REPLACEMENT)

        # 4. UPI IDs & Payment Links
        upi_pattern = re.compile(
            rf'([a-zA-Z0-9.\-_]{{2,50}}@(?:{UPI_HANDLES}))',
            re.IGNORECASE
        )
        for match in upi_pattern.finditer(masked):
            s = match.group(1)
            reasons.append("UPI ID / payment handle detected")
            snippets.append(s)
            masked = masked.replace(s, MASK_REPLACEMENT)

        # Payment bypass websites (razorpay.me, paypal.me, etc.)
        pay_url_pattern = re.compile(
            r'((?:https?:\/\/)?(?:razorpay\.me|paypal\.me|p-y\.tm|instamojo\.com)\/[a-zA-Z0-9_\-]+)',
            re.IGNORECASE
        )
        for match in pay_url_pattern.finditer(masked):
            s = match.group(1)
            reasons.append("External payment link detected")
            snippets.append(s)
            masked = masked.replace(s, MASK_REPLACEMENT)

        # 5. Indian & International Phone Numbers (Direct & Obfuscated)
        # Regex captures:
        # +91 9876543210, 09876543210, 9876543210, 98765 43210, 9876-543-210, 9 8 7 6 5 4 3 2 1 0
        phone_pattern = re.compile(
            r'((?:\+?\d{1,3}[\s\-\.]?)?(?:(?:\(?\d{2,4}\)?[\s\-\.]?)?\d{3,5}[\s\-\.]?\d{4,5}|\b(?:[6-9][\s\-\.]*){10}\b))'
        )

        for match in phone_pattern.finditer(text):
            candidate = match.group(1).strip()
            digits_only = re.sub(r'\D', '', candidate)
            # Standard Indian mobile: 10 digits starting with 6-9, or 11 (starting with 0), or 12 (starting with 91)
            is_phone = False
            if len(digits_only) == 10 and digits_only[0] in '6789':
                is_phone = True
            elif len(digits_only) == 11 and digits_only.startswith('0') and digits_only[1] in '6789':
                is_phone = True
            elif len(digits_only) == 12 and digits_only.startswith('91') and digits_only[2] in '6789':
                is_phone = True
            elif 10 <= len(digits_only) <= 13:
                # Other phone number formats
                is_phone = True

            # Guard against common false positives: e.g. dates like 2026-10-15 or simple 4-digit prices like 5000
            if is_phone and len(digits_only) >= 10:
                reasons.append(f"Phone number detected: {candidate}")
                snippets.append(candidate)
                masked = masked.replace(candidate, MASK_REPLACEMENT)

        # 6. Secondary check: Spelled out numbers (e.g., "call nine eight seven...")
        normalized = cls.normalize_for_digits(text)
        if normalized != text.lower():
            # Check if digits in normalized string contain a 10 digit sequence
            norm_digits = re.sub(r'\D', '', normalized)
            if len(norm_digits) >= 10:
                for i in range(len(norm_digits) - 9):
                    slice_d = norm_digits[i:i+10]
                    if slice_d[0] in '6789':
                        reasons.append("Spelled out phone number detected")
                        snippets.append(text)
                        masked = MASK_REPLACEMENT
                        break

        # 7. Bypass Intent Keywords & Phrases
        bypass_phrases = [
            "call me", "call on this", "reach me on", "contact me on",
            "contact outside", "contact me directly", "reach outside",
            "pay outside", "direct payment", "send on whatsapp",
            "whatsapp me", "whats app me", "dm on whatsapp", "wp number",
            "watsapp me", "whtsapp me", "my number is", "call at",
            "phone number is", "mobile number is", "gpay me", "phonepe me",
            "connect outside", "talk on phone", "call directly"
        ]

        lower_text = text.lower()
        for phrase in bypass_phrases:
            if phrase in lower_text:
                reasons.append(f"Bypass phrase detected: '{phrase}'")
                snippets.append(phrase)
                # Replace the phrase
                pattern = re.compile(re.escape(phrase), re.IGNORECASE)
                masked = pattern.sub(MASK_REPLACEMENT, masked)

        # De-duplicate reasons and snippets
        unique_reasons = list(dict.fromkeys(reasons))
        unique_snippets = list(dict.fromkeys(snippets))

        return {
            "has_contact": len(unique_reasons) > 0,
            "reasons": unique_reasons,
            "masked_text": masked,
            "snippets": unique_snippets
        }
