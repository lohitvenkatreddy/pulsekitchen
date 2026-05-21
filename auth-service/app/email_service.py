import httpx
from fastapi import HTTPException, status

from .config import get_settings


BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"


def send_signup_otp_email(email: str, full_name: str, otp_code: str) -> None:
    settings = get_settings()
    if not settings.BREVO_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email OTP service is not configured",
        )

    first_name = full_name.strip().split(" ")[0] if full_name.strip() else "there"
    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": email, "name": full_name}],
        "subject": "Your PulseKitchen signup code",
        "htmlContent": f"""
            <html>
              <body style="font-family: Arial, sans-serif; color: #222;">
                <p>Hi {first_name},</p>
                <p>Your PulseKitchen signup verification code is:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">{otp_code}</p>
                <p>This code expires in {settings.SIGNUP_OTP_TTL_MINUTES} minutes.</p>
                <p>If you did not request this, you can ignore this email.</p>
              </body>
            </html>
        """,
    }

    try:
        response = httpx.post(
            BREVO_TRANSACTIONAL_EMAIL_URL,
            headers={
                "accept": "application/json",
                "api-key": settings.BREVO_API_KEY,
                "content-type": "application/json",
            },
            json=payload,
            timeout=15.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text or "Brevo rejected the signup OTP email"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not send OTP email: {detail}",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Brevo to send OTP email",
        ) from exc
