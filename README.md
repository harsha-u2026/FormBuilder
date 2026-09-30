# FormBuilder (MVP)

A modular, full-stack form building and survey application built with FastAPI (Python) and React + Vite (JavaScript).

## Tech Stack
- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn
- **Frontend:** React 18, Vite, Vanilla CSS
- **Database:** PostgreSQL

---

## Project Structure

```text
FormBuilder/
├── backend/                  # FastAPI Application
│   ├── alembic/              # Database migration scripts
│   ├── app/                  # Application code
│   │   ├── api/              # API endpoints and routers
│   │   ├── core/             # Configuration and database connection
│   │   ├── models/           # SQLAlchemy ORM models (for upcoming features)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── main.py           # FastAPI application entry point
│   ├── .env.example          # Backend environment variables template
│   ├── alembic.ini           # Alembic migration configuration
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React + Vite Application
│   ├── public/               # Static assets
│   ├── src/                  # React source code
│   │   ├── App.jsx           # Main React component
│   │   ├── index.css         # Design system & styles
│   │   └── main.jsx          # React DOM entry point
│   ├── .env.example          # Frontend environment variables template
│   ├── index.html            # Single page application HTML shell
│   ├── package.json          # Node dependencies and scripts
│   └── vite.config.js        # Vite build & dev server configuration
├── .env.example              # Root environment template
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

---

## Quick Start Guide

### 1. Backend Setup

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be available at [http://localhost:8000](http://localhost:8000).  
   Interactive API documentation (Swagger UI) is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at [http://localhost:5173](http://localhost:5173).

---

## 🟢 Authentication & User Management (Implemented)

Secure multi-user support with JWT authentication, bcrypt password hashing, and user-specific ownership:

* **Register:** Users can create their own FormBuilder account with instant validation.
* **Login:** Users can securely authenticate and obtain a signed JWT token.
* **User Accounts:** Each user has their own profile, avatar, and authenticated session state.
* **User-Specific Forms:** Creators only see and manage forms belonging to their account. Legacy unassigned forms are safely preserved.
* **User Permissions:** Protected endpoints ensure only form owners can edit forms, modify fields, view private respondent answers, and export CSVs, while public respondents can submit answers without login.

---

# FormBuilder Future Roadmap

> [!NOTE]
> All items listed below represent planned **FUTURE** features and enhancements.

## 🟡 Useful Improvements

### Drag-and-Drop Question Ordering

Allow creators to reorder questions by dragging and dropping them in the form builder.

### Advanced Validation

Support additional field validation such as:

* Minimum/maximum length
* Minimum/maximum numeric values
* Pattern validation
* Email validation
* Custom validation rules
* Other field-specific constraints

### Automated Frontend/Backend Test Suites

Introduce automated testing for:

* Backend APIs
* Database behavior
* Frontend components
* User flows
* Form creation
* Form submission
* Validation
* Analytics
* Export functionality

### Proper Alembic Migrations

Replace the current startup-based table creation approach with proper version-controlled Alembic database migrations.

### Deployment

Prepare the application for deployment with appropriate frontend hosting, backend hosting, environment configuration, database configuration, and production settings.

---

## 🔵 Advanced Features

### Conditional / Skip Logic

Allow questions or sections to appear, disappear, or be skipped based on previous answers.

### File Uploads

Allow respondents to upload supported files through forms, with appropriate validation and storage handling.

### Multi-Step Forms

Allow creators to divide a form into multiple pages or steps with navigation between them.

### Email Notifications

Support configurable email notifications for events such as new form submissions.

### Webhooks

Allow forms to send submission events to external services through configurable webhook endpoints.

### Response Limits / Scheduling

Allow creators to configure:

* Maximum number of responses
* Start date/time
* End date/time
* Automatic closing of forms
* Response limit messages

