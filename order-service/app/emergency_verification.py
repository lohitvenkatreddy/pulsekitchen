from __future__ import annotations

import base64
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
VERIFICATION_MODE = os.getenv("EMERGENCY_VERIFICATION_MODE", "auto").strip().lower()
TOKEN_TTL_MINUTES = int(os.getenv("EMERGENCY_VERIFICATION_TOKEN_TTL_MINUTES", "60"))
GEMINI_ENDPOINT = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

_VERIFICATIONS: Dict[str, dict] = {}


def verify_document(
    image_bytes: bytes,
    mime_type: str,
    emergency_type: str,
    customer_name: str | None = None,
    order_id: str | None = None,
    customer_id: str | None = None,
) -> dict:
    if VERIFICATION_MODE == "offline":
        return _offline_demo_result(emergency_type)
    if VERIFICATION_MODE not in {"auto", "live"}:
        raise RuntimeError("EMERGENCY_VERIFICATION_MODE must be auto, live, or offline")
    if not GEMINI_API_KEY:
        if VERIFICATION_MODE == "auto":
            return _offline_demo_result(emergency_type)
        raise RuntimeError("GEMINI_API_KEY is not configured")

    import requests

    normalized_type = str(emergency_type or "").strip().lower()
    if normalized_type not in {"travel", "hospital"}:
        raise ValueError('emergencyType must be "travel" or "hospital"')

    prompt = _build_prompt(normalized_type, order_id, customer_id)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                    {"text": prompt},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "response_mime_type": "application/json",
        },
    }

    try:
        response = requests.post(
            GEMINI_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            json=payload,
            timeout=45,
        )
    except requests.RequestException as exc:
        if VERIFICATION_MODE == "auto":
            return _offline_demo_result(emergency_type)
        raise RuntimeError("Could not reach Gemini verification service") from exc
    if response.status_code == 429:
        if VERIFICATION_MODE == "auto":
            return _offline_demo_result(emergency_type)
        raise RuntimeError("Gemini rate limit exceeded. Please try again shortly.")
    if response.status_code >= 400:
        if VERIFICATION_MODE == "auto":
            return _offline_demo_result(emergency_type)
        raise RuntimeError(f"Gemini verification failed with status {response.status_code}")

    text = _extract_response_text(response.json())
    result = _parse_json_result(text)
    return _normalize_result(result)


def _offline_demo_result(emergency_type: str) -> dict:
    normalized_type = str(emergency_type or "").strip().lower()
    if normalized_type not in {"travel", "hospital"}:
        raise ValueError('emergencyType must be "travel" or "hospital"')
    return {
        "approved": True,
        "confidence": "demo",
        "document_type": f"{normalized_type}_demo_document",
        "passenger_name": None,
        "patient_name": None,
        "travel_date": None,
        "hospital_date": None,
        "journey": None,
        "name_match": None,
        "fail_reasons": [],
        "summary": "Approved by offline demo verification mode.",
        "decision": "APPROVED",
        "verification_mode": "offline",
    }


def issue_verification(user_id: int, emergency_type: str, result: dict) -> str:
    verification_id = secrets.token_urlsafe(24)
    _VERIFICATIONS[verification_id] = {
        "user_id": int(user_id),
        "emergency_type": str(emergency_type).lower(),
        "result": result,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return verification_id


def is_valid_verification(
    user_id: int,
    order_type: str,
    verification_id: str | None,
) -> bool:
    if not verification_id:
        return False

    cleanup_expired_verifications()
    record = _VERIFICATIONS.get(verification_id)
    if not record or int(record["user_id"]) != int(user_id):
        return False

    expected_type = _order_type_to_emergency_type(order_type)
    return record["emergency_type"] == expected_type


def cleanup_expired_verifications() -> None:
    now = datetime.now(timezone.utc)
    expired = [
        verification_id
        for verification_id, record in _VERIFICATIONS.items()
        if record["expires_at"] <= now
    ]
    for verification_id in expired:
        _VERIFICATIONS.pop(verification_id, None)


def _build_prompt(
    emergency_type: str,
    order_id: str | None,
    customer_id: str | None,
) -> str:
    today = datetime.now(timezone.utc).date().isoformat()
    if emergency_type == "travel":
        rules = (
            "Approve only if this is a real travel document such as a train, bus, "
            "flight, or cab booking/ticket and the travel date is today or tomorrow."
        )
    else:
        rules = (
            "Approve only if this is a real hospital or medical document such as a "
            "prescription, appointment slip, discharge note, bill, lab report, or "
            "emergency note dated within the last 7 days."
        )

    return f"""
You are verifying emergency-priority food delivery evidence.

Emergency type: {emergency_type}
Current date: {today}
Order ID: {order_id or "not provided"}
Customer ID: {customer_id or "not provided"}

Rules:
- {rules}
- Ignore passenger, patient, customer, and account-name matching completely.
- Do not reject because of a name mismatch, missing name, or different name.
- Set "name_match" to null unless there is another non-name reason to mention.
- Reject receipts, unrelated documents, old documents, screenshots with no clear proof, or visibly tampered documents.
- Use MANUAL_REVIEW if the image is too blurry, incomplete, or confidence is low.

Return only valid JSON with this exact shape:
{{
  "approved": true | false | null,
  "confidence": "high" | "medium" | "low",
  "document_type": "string",
  "passenger_name": "string or null",
  "patient_name": "string or null",
  "travel_date": "string or null",
  "hospital_date": "string or null",
  "journey": "string or null",
  "name_match": true | false | null,
  "fail_reasons": ["string"],
  "summary": "string",
  "decision": "APPROVED" | "REJECTED" | "MANUAL_REVIEW"
}}
""".strip()


def _extract_response_text(response_json: dict) -> str:
    candidates = response_json.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no verification result")

    parts = candidates[0].get("content", {}).get("parts", [])
    text_parts = [part.get("text", "") for part in parts if part.get("text")]
    text = "\n".join(text_parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty verification result")
    return text


def _parse_json_result(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise ValueError("Gemini response was not valid JSON")
        return json.loads(match.group(0))


def _normalize_result(result: dict) -> dict:
    decision = str(result.get("decision") or "").upper()
    approved = result.get("approved")

    if decision not in {"APPROVED", "REJECTED", "MANUAL_REVIEW"}:
        if approved is True:
            decision = "APPROVED"
        elif approved is False:
            decision = "REJECTED"
        else:
            decision = "MANUAL_REVIEW"

    if decision == "APPROVED":
        approved = True
    elif decision == "REJECTED":
        approved = False
    else:
        approved = None

    result["approved"] = approved
    result["decision"] = decision
    result["confidence"] = str(result.get("confidence") or "low").lower()
    result["fail_reasons"] = result.get("fail_reasons") or []
    return result


def _order_type_to_emergency_type(order_type: str) -> str:
    normalized = str(order_type or "").lower()
    if normalized == "travel_emergency":
        return "travel"
    if normalized == "hospital_emergency":
        return "hospital"
    return normalized
