export interface QRParseResult {
  isValid: boolean;
  tokenOrCode: string;
  sourceType: "url" | "token" | "code" | "legacy_json" | "unknown";
  url: string;
  displayReference: string;
}

export function parseBookingQR(rawText: string): QRParseResult {
  const text = rawText.trim();
  if (!text) {
    return {
      isValid: false,
      tokenOrCode: "",
      sourceType: "unknown",
      url: "",
      displayReference: ""
    };
  }

  // 1. Check if legacy raw JSON was scanned
  if (text.startsWith("{") && text.endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      const codeOrToken =
        parsed.verification_token || parsed.booking_code || "";
      if (codeOrToken) {
        return {
          isValid: true,
          tokenOrCode: codeOrToken,
          sourceType: "legacy_json",
          url: `/booking-pass/verify/${encodeURIComponent(codeOrToken)}`,
          displayReference: parsed.booking_code || codeOrToken
        };
      }
    } catch {
      // not valid JSON, fall through
    }
  }

  // 2. Check if URL was scanned
  const verifyMatch = text.match(/\/booking-pass\/verify\/([a-zA-Z0-9_\-]+)/);
  if (verifyMatch && verifyMatch[1]) {
    const token = verifyMatch[1];
    return {
      isValid: true,
      tokenOrCode: token,
      sourceType: "url",
      url: `/booking-pass/verify/${encodeURIComponent(token)}`,
      displayReference: token.startsWith("gwk_") ? "Digital Pass Token" : token
    };
  }

  const passMatch = text.match(/\/booking-pass\/([a-zA-Z0-9_\-]+)/);
  if (passMatch && passMatch[1]) {
    const token = passMatch[1];
    return {
      isValid: true,
      tokenOrCode: token,
      sourceType: "url",
      url: `/booking-pass/verify/${encodeURIComponent(token)}`,
      displayReference: token
    };
  }

  // 3. Direct verification token (gwk_...)
  if (text.startsWith("gwk_")) {
    return {
      isValid: true,
      tokenOrCode: text,
      sourceType: "token",
      url: `/booking-pass/verify/${encodeURIComponent(text)}`,
      displayReference: "Secure Pass Token"
    };
  }

  // 4. Booking Reference format (e.g. GUJ-WKD-...)
  if (/^GUJ[-_]WKD[-_][a-zA-Z0-9]+$/i.test(text)) {
    const upper = text.toUpperCase();
    return {
      isValid: true,
      tokenOrCode: upper,
      sourceType: "code",
      url: `/booking-pass/verify/${encodeURIComponent(upper)}`,
      displayReference: upper
    };
  }

  // 5. Alphanumeric reference code fallback
  if (/^[a-zA-Z0-9_\-]{5,60}$/.test(text)) {
    return {
      isValid: true,
      tokenOrCode: text,
      sourceType: "code",
      url: `/booking-pass/verify/${encodeURIComponent(text)}`,
      displayReference: text
    };
  }

  return {
    isValid: false,
    tokenOrCode: "",
    sourceType: "unknown",
    url: "",
    displayReference: ""
  };
}
