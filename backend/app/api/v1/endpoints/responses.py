import csv
import io
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.database import get_db
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.form_upload import FormUpload
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


def _resolve_export_user(
    auth_user: Optional[User],
    token: Optional[str],
    db: Session,
) -> User:
    """Resolve authenticated user via Bearer token dependency or direct URL token parameter."""
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
    return user


def _format_cell_value(val: Any) -> str:
    """Format diverse answer types (including file uploads and multiselects) into readable text."""
    if val is None:
        return ""
    if isinstance(val, list):
        items = []
        for item in val:
            if isinstance(item, dict):
                fname = item.get("original_filename") or item.get("name") or "file"
                fsize = item.get("file_size")
                if fsize:
                    kb = round(fsize / 1024, 1)
                    items.append(f"{fname} ({kb} KB)")
                else:
                    items.append(fname)
            else:
                items.append(str(item))
        return ", ".join(items)
    if isinstance(val, dict):
        if "original_filename" in val:
            return val["original_filename"]
        return json.dumps(val)
    if isinstance(val, bool):
        return "Yes" if val else "No"
    return str(val)


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

        elif field.field_type in ["text", "textarea", "email", "date", "number"]:
            recent_answers = [str(a) for a in answers_for_field[:10] if a]

        elif field.field_type == "switch":
            option_counts["Yes / True"] = sum(1 for a in answers_for_field if a is True or a == "true" or a == 1)
            option_counts["No / False"] = sum(1 for a in answers_for_field if a is False or a == "false" or a == 0)

        elif field.field_type == "file":
            file_names = []
            for ans in answers_for_field:
                if isinstance(ans, list):
                    for item in ans:
                        if isinstance(item, dict):
                            fname = item.get("original_filename") or item.get("name") or "Uploaded file"
                            file_names.append(fname)
                elif isinstance(ans, dict):
                    fname = ans.get("original_filename") or ans.get("name") or "Uploaded file"
                    file_names.append(fname)
            recent_answers = file_names[:10]

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
    user = _resolve_export_user(auth_user, token, db)

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
            row.append(_format_cell_value(val))
        writer.writerow(row)

    output.seek(0)
    filename = f"form_{form.id}_responses.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{form_id}/export/xlsx")
@router.get("/{form_id}/export-xlsx")
def export_form_responses_xlsx(
    form_id: int,
    token: Optional[str] = Query(None, description="Access token for direct browser download"),
    auth_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Export all form responses as a styled Microsoft Excel XLSX spreadsheet."""
    user = _resolve_export_user(auth_user, token, db)

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

    # Build Excel Workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Form Responses"

    # Header styling
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    cell_font = Font(name="Segoe UI", size=10)
    border_side = Side(style="thin", color="E2E8F0")
    thin_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

    # Headers
    headers = ["Submission ID", "Submitted At", "Respondent IP"] + [f.label for f in ordered_fields]
    ws.append(headers)

    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[1].height = 28

    # Rows
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    for row_idx, resp in enumerate(responses, start=2):
        row_data = [
            resp.id,
            resp.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if resp.submitted_at else "",
            resp.respondent_ip or "",
        ]
        for field in ordered_fields:
            val = resp.answers.get(str(field.id), "")
            row_data.append(_format_cell_value(val))

        ws.append(row_data)

        # Style data row
        is_even = (row_idx % 2 == 0)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.font = cell_font
            cell.border = thin_border
            if is_even:
                cell.fill = zebra_fill
            if col_num in [1, 2, 3]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[row_idx].height = 20

    # Auto-fit column widths with sensible padding
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"form_{form.id}_responses.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{form_id}/uploads/{file_key}")
def download_owner_uploaded_file(
    form_id: int,
    file_key: str,
    token: Optional[str] = Query(None, description="Access token for direct file download"),
    auth_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Secure endpoint for form creators to view/download files attached to responses."""
    user = _resolve_export_user(auth_user, token, db)

    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, user)

    upload = (
        db.query(FormUpload)
        .filter(FormUpload.form_id == form_id, FormUpload.file_key == file_key)
        .first()
    )
    if not upload:
        raise HTTPException(status_code=404, detail="File upload record not found.")

    file_path = Path(upload.file_path).resolve()
    base_upload_dir = Path(settings.UPLOAD_DIR).resolve()

    if not str(file_path).startswith(str(base_upload_dir)) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on storage.")

    return FileResponse(
        path=str(file_path),
        filename=upload.original_filename,
        media_type=upload.content_type or "application/octet-stream",
    )
