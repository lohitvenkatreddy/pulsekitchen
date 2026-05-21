from datetime import datetime

from pydantic import BaseModel


class SupportRequestResponse(BaseModel):
    id: int
    ticket_number: str
    subject: str
    message: str
    status: str
    created_at: datetime


class IssueReportResponse(BaseModel):
    id: int
    report_number: str
    issue_type: str
    description: str
    status: str
    created_at: datetime
