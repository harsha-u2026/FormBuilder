from typing import List, Optional, Dict, Any
from pathlib import Path
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.core.database import get_db
from app.models.form import Form
from app.models.form_field import FormField
from app.models.form_response import FormResponse
from app.models.user import User
from app.schemas.form import (
    FormCreate,
    FormUpdate,
    FormRead,
    FormListItem,
)
from app.schemas.form_field import FormFieldRead

router = APIRouter()


TEMPLATES: Dict[str, Dict[str, Any]] = {
    "csat": {
        "title": "Customer Satisfaction Survey (CSAT)",
        "description": "Help us improve our service by sharing your honest feedback and experience with our team.",
        "category": "Customer Feedback",
        "theme_color": "#6366f1",
        "theme_settings": {
            "primary_color": "#6366f1",
            "font_family": "inter",
            "button_style": "rounded",
            "background_style": "clean",
        },
        "submit_button_text": "Submit Feedback",
        "success_message": "Thank you for helping us improve! Your feedback has been recorded.",
        "fields": [
            {
                "field_type": "rating",
                "label": "Overall, how satisfied are you with our service?",
                "help_text": "1 = Very Unsatisfied, 5 = Extremely Satisfied",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "radio",
                "label": "How likely are you to recommend us to a friend or colleague?",
                "options": ["Definitely (9-10)", "Probably (7-8)", "Neutral (5-6)", "Unlikely (0-4)"],
                "required": True,
                "order": 1,
            },
            {
                "field_type": "checkbox",
                "label": "Which areas did our team excel in?",
                "options": ["Product Speed & Reliability", "Customer Support Response", "Ease of Use", "Value for Money", "Documentation & Onboarding"],
                "required": False,
                "order": 2,
            },
            {
                "field_type": "textarea",
                "label": "What could we do to improve your experience?",
                "placeholder": "Tell us what you loved or what gave you trouble...",
                "required": False,
                "order": 3,
            },
            {
                "field_type": "email",
                "label": "Your Email (optional, if you would like a follow-up)",
                "placeholder": "you@example.com",
                "required": False,
                "order": 4,
            },
        ],
    },
    "college": {
        "title": "College Course & Faculty Feedback",
        "description": "Constructive evaluation of course quality, instructor delivery, assignments, and campus academic resources.",
        "category": "Education",
        "theme_color": "#8b5cf6",
        "theme_settings": {
            "primary_color": "#8b5cf6",
            "font_family": "outfit",
            "button_style": "rounded",
            "background_style": "clean",
        },
        "submit_button_text": "Submit Evaluation",
        "success_message": "Thank you for your constructive feedback! Your responses help elevate teaching standards.",
        "fields": [
            {
                "field_type": "text",
                "label": "Course Name & Department Code",
                "placeholder": "e.g. CS-301: Distributed Systems",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "text",
                "label": "Instructor / Professor Name",
                "placeholder": "e.g. Dr. Alan Turing",
                "required": True,
                "order": 1,
            },
            {
                "field_type": "rating",
                "label": "Overall Teaching & Delivery Effectiveness",
                "help_text": "1 = Unsatisfactory, 5 = Exceptional",
                "required": True,
                "order": 2,
            },
            {
                "field_type": "radio",
                "label": "Lecture Structure and Concept Clarity",
                "options": ["Always Clear & Well Structured", "Mostly Clear", "Sometimes Disorganized", "Unclear / Hard to Follow"],
                "required": True,
                "order": 3,
            },
            {
                "field_type": "rating",
                "label": "Quality of Course Material & Lab Assignments",
                "help_text": "1 = Inadequate/Outdated, 5 = Highly Relevant & Hands-On",
                "required": True,
                "order": 4,
            },
            {
                "field_type": "radio",
                "label": "Were grading criteria and assignment rubrics communicated clearly?",
                "options": ["Yes, completely clear from day one", "Somewhat clear", "No, grading expectations were ambiguous"],
                "required": False,
                "order": 5,
            },
            {
                "field_type": "textarea",
                "label": "What recommendations or suggestions do you have to improve this course?",
                "placeholder": "Share any thoughts on lecture pacing, lab equipment, or topics you want covered...",
                "required": False,
                "order": 6,
            },
        ],
    },
    "event": {
        "title": "Event Registration & RSVP",
        "description": "Please reserve your spot for our upcoming Annual Tech Innovation Summit.",
        "category": "Events & Meetups",
        "theme_color": "#0ea5e9",
        "theme_settings": {
            "primary_color": "#0ea5e9",
            "font_family": "outfit",
            "button_style": "rounded",
            "background_style": "slate",
        },
        "submit_button_text": "Confirm RSVP",
        "success_message": "Your registration is confirmed! We look forward to seeing you.",
        "fields": [
            {
                "field_type": "text",
                "label": "Full Name",
                "placeholder": "Jane Doe",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "email",
                "label": "Work or Personal Email",
                "placeholder": "jane.doe@company.com",
                "required": True,
                "order": 1,
            },
            {
                "field_type": "radio",
                "label": "Will you be attending in person or virtually?",
                "options": ["In Person (San Francisco HQ)", "Virtually (Live Stream)"],
                "required": True,
                "order": 2,
            },
            {
                "field_type": "select",
                "label": "Workshop Track Preference",
                "options": ["AI & Machine Learning", "Full-Stack Web Architecture", "Cloud Infrastructure & DevOps", "Design Systems & UI/UX"],
                "required": True,
                "order": 3,
            },
            {
                "field_type": "select",
                "label": "Dietary Preference",
                "options": ["None / Standard", "Vegetarian", "Vegan", "Gluten-Free", "Halal / Kosher"],
                "required": False,
                "order": 4,
            },
            {
                "field_type": "textarea",
                "label": "Any accessibility requests or questions for the speakers?",
                "placeholder": "Let us know any special accommodations...",
                "required": False,
                "order": 5,
            },
        ],
    },
    "job": {
        "title": "Job Application Form",
        "description": "Join our team! Complete this form to apply for open engineering, product, and design positions.",
        "category": "Hiring & Careers",
        "theme_color": "#10b981",
        "theme_settings": {
            "primary_color": "#10b981",
            "font_family": "inter",
            "button_style": "rounded",
            "background_style": "clean",
        },
        "submit_button_text": "Submit Application",
        "success_message": "Application submitted successfully! Our recruiting team will review your profile.",
        "fields": [
            {
                "field_type": "text",
                "label": "Full Name",
                "placeholder": "Alex Smith",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "email",
                "label": "Email Address",
                "placeholder": "alex@example.com",
                "required": True,
                "order": 1,
            },
            {
                "field_type": "select",
                "label": "Role You Are Applying For",
                "options": ["Senior Full-Stack Engineer", "Frontend Architect", "Backend Systems Engineer", "Product Designer", "Engineering Manager"],
                "required": True,
                "order": 2,
            },
            {
                "field_type": "text",
                "label": "LinkedIn or Portfolio URL",
                "placeholder": "https://linkedin.com/in/username",
                "required": True,
                "order": 3,
            },
            {
                "field_type": "number",
                "label": "Years of Relevant Experience",
                "placeholder": "5",
                "required": True,
                "order": 4,
            },
            {
                "field_type": "checkbox",
                "label": "Core Technical Skills",
                "options": ["Python / FastAPI / Django", "TypeScript / React / Vue", "PostgreSQL / SQLite / Redis", "Docker / Kubernetes / AWS", "System Architecture & API Design"],
                "required": True,
                "order": 5,
            },
            {
                "field_type": "textarea",
                "label": "Why are you interested in joining our mission?",
                "placeholder": "Share a brief note on what excites you about this role...",
                "required": True,
                "order": 6,
            },
            {
                "field_type": "file",
                "label": "Attach Resume / Portfolio (PDF or DOCX)",
                "help_text": "Max 5MB. Accepted formats: PDF, DOCX, DOC",
                "required": False,
                "validation_rules": {"max_files": 1, "max_file_size_mb": 5, "allowed_types": [".pdf", ".docx", ".doc"]},
                "order": 7,
            },
        ],
    },
    "quiz": {
        "title": "Interactive Knowledge Quiz & Assessment",
        "description": "Test your web architecture and engineering knowledge with this short quiz.",
        "category": "Quizzes & Testing",
        "theme_color": "#f59e0b",
        "theme_settings": {
            "primary_color": "#f59e0b",
            "font_family": "outfit",
            "button_style": "pill",
            "background_style": "warm",
        },
        "submit_button_text": "Submit Quiz Answers",
        "success_message": "Congratulations on completing the quiz! Your answers have been recorded.",
        "fields": [
            {
                "field_type": "text",
                "label": "Participant Name",
                "placeholder": "Enter your full name",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "email",
                "label": "Email Address for Results",
                "placeholder": "participant@example.com",
                "required": True,
                "order": 1,
            },
            {
                "field_type": "radio",
                "label": "Which data structure follows First-In, First-Out (FIFO) ordering?",
                "options": ["Stack", "Queue", "Binary Search Tree", "Hash Map"],
                "required": True,
                "order": 2,
            },
            {
                "field_type": "radio",
                "label": "Which HTTP status code signifies that a new resource was successfully created?",
                "options": ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"],
                "required": True,
                "order": 3,
            },
            {
                "field_type": "checkbox",
                "label": "Which of the following databases natively support SQL transactions? (Select all)",
                "options": ["PostgreSQL", "SQLite", "MySQL", "Redis (in-memory key-value)"],
                "required": True,
                "order": 4,
            },
            {
                "field_type": "rating",
                "label": "Self-assessment: How confident do you feel with distributed web systems?",
                "help_text": "1 = Novice, 5 = Master",
                "required": False,
                "order": 5,
            },
            {
                "field_type": "textarea",
                "label": "Do you have any comments or question ideas for future quizzes?",
                "placeholder": "Share your thoughts...",
                "required": False,
                "order": 6,
            },
        ],
    },
    "bug": {
        "title": "Bug & Issue Tracker",
        "description": "Encountered an issue? Help us troubleshoot and resolve it by providing the details below.",
        "category": "Testing & QA",
        "theme_color": "#f43f5e",
        "theme_settings": {
            "primary_color": "#f43f5e",
            "font_family": "jetbrains",
            "button_style": "sharp",
            "background_style": "clean",
        },
        "submit_button_text": "Report Issue",
        "success_message": "Bug report submitted. Our engineering team has been notified.",
        "fields": [
            {
                "field_type": "text",
                "label": "Brief Summary / Headline",
                "placeholder": "e.g. Save button disabled on edit form",
                "required": True,
                "order": 0,
            },
            {
                "field_type": "select",
                "label": "Severity Level",
                "options": ["Low (Cosmetic)", "Medium (Functional glitch)", "High (Major blocker)", "Critical (Data loss / crash)"],
                "required": True,
                "order": 1,
            },
            {
                "field_type": "textarea",
                "label": "Steps to Reproduce",
                "placeholder": "1. Go to page...\n2. Click button...\n3. Observe error...",
                "required": True,
                "order": 2,
            },
            {
                "field_type": "textarea",
                "label": "Expected vs Actual Behavior",
                "placeholder": "What did you expect to happen and what happened instead?",
                "required": True,
                "order": 3,
            },
            {
                "field_type": "email",
                "label": "Reporter Contact Email",
                "placeholder": "developer@company.com",
                "required": False,
                "order": 4,
            },
        ],
    },
}


def _build_form_read(form: Form, db: Session) -> FormRead:
    resp_count = (
        db.query(func.count(FormResponse.id))
        .filter(FormResponse.form_id == form.id)
        .scalar()
        or 0
    )
    ordered_fields = sorted(form.fields, key=lambda f: f.order)
    return FormRead(
        id=form.id,
        owner_id=form.owner_id,
        title=form.title,
        description=form.description,
        is_published=form.is_published,
        theme_color=form.theme_color,
        theme_settings=form.theme_settings,
        submit_button_text=form.submit_button_text,
        success_message=form.success_message,
        created_at=form.created_at,
        updated_at=form.updated_at,
        fields=[FormFieldRead.model_validate(f) for f in ordered_fields],
        response_count=resp_count,
        view_count=form.view_count or 0,
    )


def _check_form_access(form: Form, current_user: User) -> None:
    """Verify that current_user has permission to access or modify this form."""
    if form.owner_id is not None and form.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this form.",
        )


@router.get("", response_model=List[FormListItem])
def list_forms(
    search: Optional[str] = Query(None, description="Search term for form title/description"),
    status: Optional[str] = Query(None, description="'published', 'draft', or None for all"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """List forms for the authenticated user. If not logged in, returns empty list."""
    if not current_user:
        return []

    query = db.query(Form).filter(
        (Form.owner_id == current_user.id) | (Form.owner_id.is_(None))
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Form.title.ilike(search_pattern)) | (Form.description.ilike(search_pattern))
        )

    if status == "published":
        query = query.filter(Form.is_published.is_(True))
    elif status == "draft":
        query = query.filter(Form.is_published.is_(False))

    forms = query.order_by(Form.updated_at.desc()).all()

    # Build list with counts
    result = []
    for form in forms:
        f_count = db.query(func.count(FormField.id)).filter(FormField.form_id == form.id).scalar() or 0
        r_count = db.query(func.count(FormResponse.id)).filter(FormResponse.form_id == form.id).scalar() or 0
        result.append(
            FormListItem(
                id=form.id,
                owner_id=form.owner_id,
                title=form.title,
                description=form.description,
                is_published=form.is_published,
                theme_color=form.theme_color,
                theme_settings=form.theme_settings,
                submit_button_text=form.submit_button_text,
                created_at=form.created_at,
                updated_at=form.updated_at,
                field_count=f_count,
                response_count=r_count,
                view_count=form.view_count or 0,
            )
        )
    return result


@router.get("/templates", response_model=List[Dict[str, Any]])
def list_templates():
    """Return all pre-built form templates with preview questions, categories, and theme settings."""
    templates_list = []
    for key, tpl in TEMPLATES.items():
        templates_list.append({
            "key": key,
            "title": tpl["title"],
            "description": tpl["description"],
            "category": tpl.get("category", "General"),
            "theme_color": tpl["theme_color"],
            "theme_settings": tpl.get("theme_settings"),
            "submit_button_text": tpl["submit_button_text"],
            "success_message": tpl.get("success_message"),
            "fields": tpl["fields"],
            "field_count": len(tpl["fields"]),
        })
    return templates_list


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED)
def create_form(
    form_in: FormCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new form with optional initial fields assigned to current user."""
    form = Form(
        owner_id=current_user.id,
        title=form_in.title,
        description=form_in.description,
        is_published=form_in.is_published,
        theme_color=form_in.theme_color,
        theme_settings=form_in.theme_settings,
        submit_button_text=form_in.submit_button_text,
        success_message=form_in.success_message,
    )
    db.add(form)
    db.flush()

    if form_in.initial_fields:
        for idx, field_in in enumerate(form_in.initial_fields):
            new_field = FormField(
                form_id=form.id,
                field_type=field_in.field_type,
                label=field_in.label,
                placeholder=field_in.placeholder,
                help_text=field_in.help_text,
                required=field_in.required,
                options=field_in.options,
                validation_rules=field_in.validation_rules,
                conditional_rules=field_in.conditional_rules,
                order=field_in.order if field_in.order is not None else idx,
            )
            db.add(new_field)

    db.commit()
    db.refresh(form)
    return _build_form_read(form, db)


@router.get("/{form_id}", response_model=FormRead)
def get_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific form by ID with its ordered fields and response count."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)
    return _build_form_read(form, db)


@router.put("/{form_id}", response_model=FormRead)
def update_form(
    form_id: int,
    form_in: FormUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update form attributes."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    update_data = form_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(form, key, value)

    db.commit()
    db.refresh(form)
    return _build_form_read(form, db)


@router.delete("/{form_id}", status_code=status.HTTP_200_OK)
def delete_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a form and all associated fields and responses."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    db.delete(form)
    db.commit()
    return {"message": "Form deleted successfully", "id": form_id}


@router.post("/{form_id}/duplicate", response_model=FormRead, status_code=status.HTTP_201_CREATED)
def duplicate_form(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clone an existing form and its fields."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    new_form = Form(
        owner_id=current_user.id,
        title=f"{form.title} (Copy)",
        description=form.description,
        is_published=False,  # default duplicated forms to draft
        theme_color=form.theme_color,
        theme_settings=form.theme_settings,
        submit_button_text=form.submit_button_text,
        success_message=form.success_message,
    )
    db.add(new_form)
    db.flush()

    for field in form.fields:
        duplicated_field = FormField(
            form_id=new_form.id,
            field_type=field.field_type,
            label=field.label,
            placeholder=field.placeholder,
            help_text=field.help_text,
            required=field.required,
            options=field.options,
            validation_rules=field.validation_rules,
            conditional_rules=field.conditional_rules,
            order=field.order,
        )
        db.add(duplicated_field)

    db.commit()
    db.refresh(new_form)
    return _build_form_read(new_form, db)


@router.patch("/{form_id}/toggle-publish")
def toggle_publish(
    form_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle is_published status of a form."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    form.is_published = not form.is_published
    db.commit()
    db.refresh(form)
    return {"id": form.id, "is_published": form.is_published}


@router.post("/templates/{template_key}", response_model=FormRead, status_code=status.HTTP_201_CREATED)
def create_from_template(
    template_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new form populated from a pre-built template."""
    if template_key not in TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown template key. Choose from: {list(TEMPLATES.keys())}",
        )

    tpl = TEMPLATES[template_key]
    form = Form(
        owner_id=current_user.id,
        title=tpl["title"],
        description=tpl["description"],
        is_published=True,
        theme_color=tpl["theme_color"],
        theme_settings=tpl.get("theme_settings"),
        submit_button_text=tpl["submit_button_text"],
        success_message=tpl["success_message"],
    )
    db.add(form)
    db.flush()

    for item in tpl["fields"]:
        field = FormField(
            form_id=form.id,
            field_type=item["field_type"],
            label=item["label"],
            placeholder=item.get("placeholder"),
            help_text=item.get("help_text"),
            required=item.get("required", False),
            options=item.get("options"),
            validation_rules=item.get("validation_rules"),
            order=item["order"],
        )
        db.add(field)

    db.commit()
    db.refresh(form)
    return _build_form_read(form, db)


@router.post("/{form_id}/banner", response_model=FormRead)
async def upload_form_banner(
    form_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and set a branded header banner image for a form (authenticated owner)."""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    _check_form_access(form, current_user)

    # Validate image mime type and extension
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}

    ext = Path(file.filename or "").suffix.lower()
    if file.content_type not in allowed_types or ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed banner formats: JPG, PNG, WEBP, GIF, SVG.",
        )

    # Read and validate size (max 5 MB)
    max_bytes = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="Banner image exceeds maximum allowed size (5 MB).")

    # Save to uploads directory
    banner_dir = (Path(settings.UPLOAD_DIR) / f"form_{form_id}" / "banners").resolve()
    banner_dir.mkdir(parents=True, exist_ok=True)

    file_key = uuid.uuid4().hex[:12]
    stored_name = f"banner_{file_key}{ext}"
    dest_path = banner_dir / stored_name

    with open(dest_path, "wb") as f_out:
        f_out.write(content)

    banner_url = f"/api/v1/public/forms/{form_id}/banner/{file_key}"
    current_settings = dict(form.theme_settings or {})
    current_settings["banner_url"] = banner_url
    form.theme_settings = current_settings

    db.commit()
    db.refresh(form)
    return _build_form_read(form, db)

