import csv
import io
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_optional
from app.core.security import decode_access_token
from app.core.database import get_db
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.user import User
from app.schemas.form_response import (
    FormResponseRead,
    FormAnalyticsSummary,
    FieldSummary,
)

router = APIRouter()


def _check_form_access(form: Form, current_user: User) -> None:
    """Verify that current_user has permission to view responses or analytics for this form."""
    if form.owner_id is not None and form.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view responses or analytics for this form.",
        )


@router.get("/{form_id}/responses", response_model=List[FormResponseRead])
def list_form_responses(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all submissions for a given form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    responses = (
        db.query(FormResponse)
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
        .all()
    )
    return responses


@router.get("/{form_id}/analytics", response_model=FormAnalyticsSummary)
def get_form_analytics(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Calculate aggregated analytics across all submissions for a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    responses = (
        db.query(FormResponse)
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
        .all()
    )

    total_responses = len(responses)
    latest_response_at = responses[0].submitted_at if responses else None

    fields_summary: List[FieldSummary] = []

    for field in sorted(form.fields, key=lambda f: f.order):
        field_key = str(field.id)
        answers_for_field = [
            r.answers.get(field_key)
            for r in responses
            if field_key in r.answers and r.answers.get(field_key) is not None
        ]

        total_answers = len(answers_for_field)
        option_counts: Dict[str, int] = {}
        avg_rating = None
        recent_answers: List[Any] = []

        if field.field_type in ["radio", "select", "checkbox"]:
            if field.options:
                for opt in field.options:
                    opt_str = str(opt.get("value") if isinstance(opt, dict) else opt)
                    option_counts[opt_str] = 0

            for ans in answers_for_field:
                if isinstance(ans, list):
                    for sub_ans in ans:
                        s_ans = str(sub_ans)
                        option_counts[s_ans] = option_counts.get(s_ans, 0) + 1
                else:
                    s_ans = str(ans)
                    option_counts[s_ans] = option_counts.get(s_ans, 0) + 1

        elif field.field_type == "rating":
            numeric_scores = []
            for ans in answers_for_field:
                try:
                    numeric_scores.append(float(ans))
                except (ValueError, TypeError):
                    pass
            if numeric_scores:
                avg_rating = round(sum(numeric_scores) / len(numeric_scores), 2)

        elif field.field_type in ["text", "textarea", "email", "date"]:
            recent_answers = [str(a) for a in answers_for_field[:10] if a]

        elif field.field_type == "switch":
            option_counts["Yes / True"] = sum(1 for a in answers_for_field if a is True or a == "true" or a == 1)
            option_counts["No / False"] = sum(1 for a in answers_for_field if a is False or a == "false" or a == 0)

        fields_summary.append(
            FieldSummary(
                field_id=field.id,
                label=field.label,
                field_type=field.field_type,
                total_answers=total_answers,
                option_counts=option_counts if option_counts else None,
                average_rating=avg_rating,
                recent_answers=recent_answers if recent_answers else None,
            )
        )

    return FormAnalyticsSummary(
        form_id=form_id,
        total_responses=total_responses,
        latest_response_at=latest_response_at,
        fields_summary=fields_summary,
    )


@router.get("/{form_id}/export")
def export_form_responses_csv(
    form_id: int,
    token: Optional[str] = Query(None, description="Access token for direct browser download"),
    auth_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Export all form responses as a CSV download (authenticated)."""
    user = auth_user
    if not user and token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            try:
                user = db.query(User).filter(User.id == int(payload["sub"])).first()
            except (ValueError, TypeError):
                user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to export responses.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, user)

    responses = (
        db.query(FormResponse)
        .filter(FormResponse.form_id == form_id)
        .order_by(FormResponse.submitted_at.desc())
        .all()
    )

    ordered_fields = sorted(form.fields, key=lambda f: f.order)

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header row
    header = ["Submission ID", "Submitted At", "Respondent IP"] + [f.label for f in ordered_fields]
    writer.writerow(header)

    # Write data rows
    for resp in responses:
        row = [
            resp.id,
            resp.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if resp.submitted_at else "",
            resp.respondent_ip or "",
        ]
        for field in ordered_fields:
            val = resp.answers.get(str(field.id), "")
            if isinstance(val, list):
                val = ", ".join(str(v) for v in val)
            row.append(str(val))
        writer.writerow(row)

    output.seek(0)
    filename = f"form_{form.id}_responses.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
