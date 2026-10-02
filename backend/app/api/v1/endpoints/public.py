import os
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form as FormParam, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.logic_engine import is_field_visible
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.form_upload import FormUpload
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


@router.post("/forms/{form_id}/upload")
async def upload_form_file(
    form_id: int,
    field_id: int = FormParam(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Handle respondent file uploads for a specific form field.
    Validates form publish state, field existence, file types, sizes, and file count.
    Saves files securely with generated UUID keys to prevent directory traversal.
    """
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    if not form.is_published:
        raise HTTPException(
            status_code=403,
            detail="This form is currently closed and not accepting uploads.",
        )

    field = db.query(FormField).filter(FormField.id == field_id, FormField.form_id == form_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found in this form.")

    if field.field_type != "file":
        raise HTTPException(status_code=400, detail="Field is not a file upload question.")

    rules = field.validation_rules or {}
    max_files = int(rules.get("max_files", 5))
    max_mb = float(rules.get("max_file_size_mb", 10))
    max_bytes = int(max_mb * 1024 * 1024)
    allowed_types = rules.get("allowed_types", [])

    if len(files) > max_files:
        raise HTTPException(
            status_code=400,
            detail=f"Exceeded maximum number of files allowed ({max_files}).",
        )

    upload_dir = (Path(settings.UPLOAD_DIR) / f"form_{form_id}").resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    uploaded_metadata = []

    for file in files:
        # Sanitize original filename (strip any path components)
        safe_orig_name = Path(file.filename or "uploaded_file").name
        ext = Path(safe_orig_name).suffix.lower()

        # Check allowed types if specified
        if allowed_types:
            clean_allowed = [t.strip().lower() for t in allowed_types if t.strip()]
            ext_matched = False
            for allowed in clean_allowed:
                if allowed.startswith("."):
                    if ext == allowed:
                        ext_matched = True
                        break
                elif "/" in allowed:
                    if allowed.endswith("/*"):
                        main_type = allowed.split("/")[0]
                        if file.content_type and file.content_type.lower().startswith(f"{main_type}/"):
                            ext_matched = True
                            break
                    elif file.content_type and file.content_type.lower() == allowed:
                        ext_matched = True
                        break
                elif ext.lstrip(".") == allowed:
                    ext_matched = True
                    break

            if not ext_matched:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{safe_orig_name}' has an unsupported file type ({ext or 'unknown'}). Allowed: {', '.join(allowed_types)}",
                )

        # Read content and check size
        content = await file.read()
        file_size = len(content)
        if file_size > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File '{safe_orig_name}' is too large ({round(file_size / (1024*1024), 2)} MB). Maximum allowed is {max_mb} MB.",
            )

        # Generate unique key & stored filename
        file_key = uuid.uuid4().hex
        stored_filename = f"{file_key}{ext}"
        dest_path = (upload_dir / stored_filename).resolve()

        # Path traversal guard: ensure dest_path is strictly within upload_dir
        if not str(dest_path).startswith(str(upload_dir)):
            raise HTTPException(status_code=400, detail="Invalid destination path.")

        # Write file to disk
        with open(dest_path, "wb") as f_out:
            f_out.write(content)

        # Record in DB
        db_upload = FormUpload(
            form_id=form_id,
            field_id=field_id,
            file_key=file_key,
            original_filename=safe_orig_name,
            stored_filename=stored_filename,
            file_path=str(dest_path),
            file_size=file_size,
            content_type=file.content_type,
        )
        db.add(db_upload)
        db.flush()

        uploaded_metadata.append({
            "id": db_upload.id,
            "file_key": file_key,
            "original_filename": safe_orig_name,
            "file_size": file_size,
            "content_type": file.content_type,
            "download_url": f"/api/v1/public/forms/{form_id}/uploads/{file_key}",
        })

    db.commit()
    return uploaded_metadata


@router.get("/forms/{form_id}/uploads/{file_key}")
def get_uploaded_file(form_id: int, file_key: str, db: Session = Depends(get_db)):
    """Safely retrieve or download an uploaded file."""
    upload = (
        db.query(FormUpload)
        .filter(FormUpload.form_id == form_id, FormUpload.file_key == file_key)
        .first()
    )
    if not upload:
        raise HTTPException(status_code=404, detail="File not found.")

    file_path = Path(upload.file_path).resolve()
    base_upload_dir = Path(settings.UPLOAD_DIR).resolve()

    # Prevent path traversal
    if not str(file_path).startswith(str(base_upload_dir)) or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on server.")

    return FileResponse(
        path=str(file_path),
        filename=upload.original_filename,
        media_type=upload.content_type or "application/octet-stream",
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

    # Validate required fields, taking conditional visibility into account
    missing_fields = []
    for field in form.fields:
        # Check conditional visibility
        is_visible = is_field_visible(field.conditional_rules, submission.answers)
        if not is_visible:
            # Conditionally hidden fields are skipped from required validation
            continue

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
    db.flush()

    # Associate uploaded files with this new response
    for field_key, ans in submission.answers.items():
        if isinstance(ans, list):
            for item in ans:
                if isinstance(item, dict) and "file_key" in item:
                    db.query(FormUpload).filter(
                        FormUpload.file_key == item["file_key"],
                        FormUpload.form_id == form.id,
                    ).update({"response_id": new_response.id})

    db.commit()
    db.refresh(new_response)

    return {
        "message": form.success_message or "Thank you! Your response has been recorded.",
        "response_id": new_response.id,
        "submitted_at": new_response.submitted_at,
    }
