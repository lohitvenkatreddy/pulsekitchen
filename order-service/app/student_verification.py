from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Tuple


REFERENCE_TEMPLATE_PATH = Path(
    os.getenv(
        "STUDENT_ID_TEMPLATE_PATH",
        Path(__file__).resolve().parents[1] / "config" / "student_id_template.jpg",
    )
)
MIN_MATCH_SCORE = float(os.getenv("STUDENT_ID_MIN_MATCH_SCORE", "0.65"))
TOKEN_TTL_MINUTES = int(os.getenv("STUDENT_ID_TOKEN_TTL_MINUTES", "60"))

_VERIFICATIONS: Dict[str, dict] = {}


def is_template_configured() -> bool:
    return REFERENCE_TEMPLATE_PATH.exists()


def compare_with_reference(uploaded_image: bytes) -> Tuple[bool, float]:
    """
    Compare an uploaded ID card against the configured college ID template.

    The score is based on ORB feature matching and is intentionally conservative:
    it checks whether the uploaded image shares enough visual structure with the
    known template, not whether the person is the same.
    """
    if not is_template_configured():
        raise FileNotFoundError(str(REFERENCE_TEMPLATE_PATH))

    import cv2
    import numpy as np

    template_bytes = np.fromfile(str(REFERENCE_TEMPLATE_PATH), dtype=np.uint8)
    upload_bytes = np.frombuffer(uploaded_image, dtype=np.uint8)

    template = cv2.imdecode(template_bytes, cv2.IMREAD_GRAYSCALE)
    candidate = cv2.imdecode(upload_bytes, cv2.IMREAD_GRAYSCALE)

    if template is None or candidate is None:
        raise ValueError("Could not read one of the submitted ID card images")

    template = _normalize_card_image(cv2, template)
    candidate = _normalize_card_image(cv2, candidate)

    orb = cv2.ORB_create(nfeatures=1500)
    keypoints_template, descriptors_template = orb.detectAndCompute(template, None)
    keypoints_candidate, descriptors_candidate = orb.detectAndCompute(candidate, None)

    if descriptors_template is None or descriptors_candidate is None:
        return False, 0.0

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(descriptors_template, descriptors_candidate)
    if not matches:
        return False, 0.0

    matches = sorted(matches, key=lambda match: match.distance)
    good_matches = [match for match in matches if match.distance <= 64]
    possible_matches = max(1, min(len(keypoints_template), len(keypoints_candidate)))
    raw_score = len(good_matches) / possible_matches

    score = round(min(1.0, raw_score * 3.0), 3)
    return score >= MIN_MATCH_SCORE, score


def issue_verification(user_id: int, score: float) -> str:
    verification_id = secrets.token_urlsafe(24)
    _VERIFICATIONS[verification_id] = {
        "user_id": int(user_id),
        "score": float(score),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return verification_id


def is_valid_verification(user_id: int, verification_id: str | None) -> bool:
    if not verification_id:
        return False

    cleanup_expired_verifications()
    record = _VERIFICATIONS.get(verification_id)
    if not record:
        return False

    return int(record["user_id"]) == int(user_id)


def cleanup_expired_verifications() -> None:
    now = datetime.now(timezone.utc)
    expired = [
        verification_id
        for verification_id, record in _VERIFICATIONS.items()
        if record["expires_at"] <= now
    ]
    for verification_id in expired:
        _VERIFICATIONS.pop(verification_id, None)


def _normalize_card_image(cv2, image):
    resized = cv2.resize(image, (640, 400), interpolation=cv2.INTER_AREA)
    return cv2.equalizeHist(resized)
