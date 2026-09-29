from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.schemas.form import FormPublicRead
from app.schemas.form_field import FormFieldRead
from app.schemas.form_response import FormResponseSubmit

router = APIRouter()


@router.get("/forms/{form_id}", response_model=FormPublicRead)
def get_public_form(form_id: int, db: Session = Depends(get_db)):
    """Fetch public form definition for respondents."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    if not form.is_published:
        raise HTTPException(
            status_code=403,
            detail="This form is currently closed or unpublished.",
        )

    ordered_fields = sorted(form.fields, key=lambda f: f.order)
    return FormPublicRead(
        id=form.id,
        title=form.title,
        description=form.description,
        is_published=form.is_published,
        theme_color=form.theme_color,
        submit_button_text=form.submit_button_text,
        success_message=form.success_message,
        fields=[FormFieldRead.model_validate(f) for f in ordered_fields],
    )


@router.post("/forms/{form_id}/submit", status_code=status.HTTP_201_CREATED)
def submit_form_response(
    form_id: int,
    submission: FormResponseSubmit,
    request: Request,
    db: Session = Depends(get_db),
):
    """Validate answers and record a respondent submission."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    if not form.is_published:
        raise HTTPException(
            status_code=403,
            detail="This form is currently closed and not accepting responses.",
        )

    # Validate required fields
    missing_fields = []
    for field in form.fields:
        if field.required:
            field_key = str(field.id)
            val = submission.answers.get(field_key)
            if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
                missing_fields.append({"field_id": field.id, "label": field.label})

    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Some required fields are missing.",
                "missing_fields": missing_fields,
            },
        )

    client_ip = request.client.host if request.client else None

    new_response = FormResponse(
        form_id=form.id,
        answers=submission.answers,
        respondent_ip=client_ip,
    )
    db.add(new_response)
    db.commit()
    db.refresh(new_response)

    return {
        "message": form.success_message or "Thank you! Your response has been recorded.",
        "response_id": new_response.id,
        "submitted_at": new_response.submitted_at,
    }
