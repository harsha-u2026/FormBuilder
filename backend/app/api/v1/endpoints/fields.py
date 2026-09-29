from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.form import Form
from app.models.form_field import FormField
from app.schemas.form_field import (
    FormFieldCreate,
    FormFieldUpdate,
    FormFieldRead,
    FieldOrderUpdate,
)

router = APIRouter()


@router.post("/{form_id}/fields", response_model=FormFieldRead, status_code=status.HTTP_201_CREATED)
def add_field(form_id: int, field_in: FormFieldCreate, db: Session = Depends(get_db)):
    """Add a new field to a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    # Determine order if not specified
    if field_in.order == 0:
        max_order = (
            db.query(func.max(FormField.order))
            .filter(FormField.form_id == form_id)
            .scalar()
        )
        calculated_order = (max_order + 1) if max_order is not None else 0
    else:
        calculated_order = field_in.order

    new_field = FormField(
        form_id=form_id,
        field_type=field_in.field_type,
        label=field_in.label,
        placeholder=field_in.placeholder,
        help_text=field_in.help_text,
        required=field_in.required,
        options=field_in.options,
        validation_rules=field_in.validation_rules,
        order=calculated_order,
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return FormFieldRead.model_validate(new_field)


@router.put("/{form_id}/fields/{field_id}", response_model=FormFieldRead)
def update_field(
    form_id: int,
    field_id: int,
    field_in: FormFieldUpdate,
    db: Session = Depends(get_db),
):
    """Update field properties."""
    field = (
        db.query(FormField)
        .filter(FormField.id == field_id, FormField.form_id == form_id)
        .first()
    )
    if not field:
        raise HTTPException(status_code=404, detail="Field not found on this form")

    update_data = field_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return FormFieldRead.model_validate(field)


@router.delete("/{form_id}/fields/{field_id}", status_code=status.HTTP_200_OK)
def delete_field(form_id: int, field_id: int, db: Session = Depends(get_db)):
    """Delete a field from a form."""
    field = (
        db.query(FormField)
        .filter(FormField.id == field_id, FormField.form_id == form_id)
        .first()
    )
    if not field:
        raise HTTPException(status_code=404, detail="Field not found on this form")

    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully", "id": field_id}


@router.put("/{form_id}/fields-order", status_code=status.HTTP_200_OK)
def update_fields_order(
    form_id: int,
    order_in: FieldOrderUpdate,
    db: Session = Depends(get_db),
):
    """Batch update order indices for fields in a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    for item in order_in.fields:
        db.query(FormField).filter(
            FormField.id == item.id, FormField.form_id == form_id
        ).update({"order": item.order})

    db.commit()
    return {"message": "Field order updated successfully"}
