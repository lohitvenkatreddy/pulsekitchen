from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import database, support_models, support_schemas
from .security import get_token_payload

router = APIRouter(prefix="/api/v1/support", tags=["Support"])

FAQ_DATA = [
    {
        "category": "Account",
        "items": [
            {
                "question": "How do I create an account?",
                "answer": "Use Register on the login screen and enter your details.",
            },
            {
                "question": "How do I reset my password?",
                "answer": "Open Settings and use Change Password while signed in.",
            },
        ],
    },
    {
        "category": "Orders",
        "items": [
            {
                "question": "How do I track my order?",
                "answer": "Open Order History or the active order card to view delivery progress.",
            },
            {
                "question": "Can I cancel my order?",
                "answer": "Pending orders can be cancelled before preparation starts.",
            },
        ],
    },
    {
        "category": "Delivery",
        "items": [
            {
                "question": "How long does delivery take?",
                "answer": "ETA depends on route, restaurant preparation, and priority level.",
            }
        ],
    },
    {
        "category": "Payments",
        "items": [
            {
                "question": "What payment methods do you accept?",
                "answer": "Saved cards and tokenized card payments are supported in the demo.",
            }
        ],
    },
]


async def _payload_from_request(request: Request) -> dict:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        return dict(form)
    return await request.json()


@router.post("/requests", response_model=support_schemas.SupportRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_support_request(
    request: Request,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    data = await _payload_from_request(request)
    subject = str(data.get("subject") or "").strip()
    message = str(data.get("message") or "").strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")

    attachment = data.get("attachment")
    row = support_models.SupportRequest(
        user_id=payload["user_id"],
        subject=subject,
        message=message,
        attachment_name=getattr(attachment, "filename", None),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return support_schemas.SupportRequestResponse(
        id=row.id,
        ticket_number=f"TKT-{row.id:06d}",
        subject=row.subject,
        message=row.message,
        status=row.status,
        created_at=row.created_at,
    )


@router.post("/issues", response_model=support_schemas.IssueReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_issue_report(
    request: Request,
    db: Session = Depends(database.get_db),
    payload: dict = Depends(get_token_payload),
):
    data = await _payload_from_request(request)
    issue_type = str(data.get("issue_type") or "").strip()
    description = str(data.get("description") or "").strip()
    if not issue_type or not description:
        raise HTTPException(status_code=400, detail="Issue type and description are required")

    screenshot = data.get("screenshot")
    row = support_models.IssueReport(
        user_id=payload["user_id"],
        issue_type=issue_type,
        description=description,
        screenshot_name=getattr(screenshot, "filename", None),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return support_schemas.IssueReportResponse(
        id=row.id,
        report_number=f"ISS-{row.id:06d}",
        issue_type=row.issue_type,
        description=row.description,
        status=row.status,
        created_at=row.created_at,
    )


@router.get("/faq")
def get_faq():
    return FAQ_DATA
