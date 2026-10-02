# FormBuilder

A complete, modern, production-ready full-stack form building and survey platform built with **FastAPI** (Python 3.12) and **React 18 + Vite** (JavaScript).

---

## Features Overview

### Core Features (Phase 1)
- **User Authentication:** JWT-based user registration, login, and secure session management with bcrypt password hashing.
- **Form Builder Studio:** Visual canvas for creating and modifying survey forms, with real-time preview and theme accent customization.
- **Question Types:** Short Text, Paragraph, Email, Number, Single Choice (Radio), Multiple Choice (Checkboxes), Dropdown (Select), Star Rating, Date Picker, Yes/No Toggle (Switch).
- **Respondent Experience:** Clean, responsive standalone respondent view with required field validation and instant feedback.
- **Analytics & Submissions:** Aggregated statistics, submission counts, average ratings, choice distribution breakdowns, and CSV export.
- **User Isolation:** Strict authorization boundaries ensuring creators only access and manage their own forms, responses, and files.

### Advanced Features (Phase 2)
- **File Upload Question Type:**
  - Configurable allowed file types (presets for Images, PDF/Docs, Spreadsheets, or custom comma-separated extensions).
  - Configurable max file size (1 MB – 25 MB per file) and max number of files (1 – 10).
  - Secure server-side storage with UUID-based filenames, path traversal protection, and file metadata tracking.
  - Respondent drag-and-drop file upload with progress feedback and removal before submission.
  - Authenticated creator download endpoints and public download endpoints.
- **Conditional Visibility Logic:**
  - Creators can set IF/THEN visibility rules for questions based on prior answers.
  - Supports operators: `equals`, `not_equals`, `contains`, `not_contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`.
  - Condition match types: `ALL match (AND)` and `ANY match (OR)`.
  - Actions: `Show question` or `Hide question`.
  - Hidden questions are skipped during required validation on both frontend and backend.
- **Excel XLSX Export:**
  - Full-featured `.xlsx` export using `openpyxl` with styled headers, alternating row fills, and formatted date/file columns.
  - Direct authenticated download via Bearer token or browser URL query parameter (`?token=...`).
- **Account & Profile Management:**
  - View account details (email, account status, joined date, JWT security).
  - Update display name / profile information.
  - Secure password changes with old-password verification and minimum length constraints.
- **Robust Database Migrations (Alembic):**
  - Fully configured Alembic migrations supporting both SQLite development and PostgreSQL production.
  - Idempotent upgrade scripts that preserve existing data and tables without destructive alterations.
- **Production-Ready Docker Support:**
  - Multi-stage `Dockerfile` compiling the React frontend and serving it via FastAPI.
  - Multi-container `docker-compose.yml` orchestrating PostgreSQL and the FastAPI application with health checks and persistent volumes.

---

## Technology Stack

- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn, openpyxl, python-multipart, PyJWT, bcrypt.
- **Frontend:** React 18, Vite, Lucide React icons, Vanilla CSS design system.
- **Database:** PostgreSQL (production), SQLite (local development fallback).
- **Containerization:** Docker (multi-stage build), Docker Compose.

---

## Project Structure

```text
FormBuilder/
├── backend/                       # FastAPI Backend
│   ├── alembic/                   # Alembic database migration scripts
│   │   └── versions/              # Migration revision files (0001, 0002)
│   ├── app/                       # Application source code
│   │   ├── api/                   # API routes and dependencies
│   │   │   └── v1/endpoints/      # auth, forms, fields, public, responses
│   │   ├── core/                  # config, database, security, logic_engine
│   │   ├── models/                # SQLAlchemy models (User, Form, FormField, FormResponse, FormUpload)
│   │   ├── schemas/               # Pydantic validation schemas
│   │   └── main.py                # FastAPI entry point, SPA serving, health checks
│   ├── uploads/                   # Uploaded respondent files storage (gitignored)
│   ├── .env.example               # Backend environment variables template
│   ├── alembic.ini                # Alembic configuration
│   ├── requirements.txt           # Python package dependencies
│   ├── test_api_flow.py           # Core API integration tests
│   ├── test_production_spa.py     # Production SPA routing tests
│   └── test_phase2_comprehensive.py # Comprehensive Phase 2 test suite
├── frontend/                      # React SPA
│   ├── src/                       # React components and logic
│   │   ├── api/client.js          # API client with token & error handling
│   │   ├── components/            # UI components
│   │   │   ├── builder/           # Canvas, Inspector, Toolbox
│   │   │   ├── AccountModal.jsx   # Profile & password management modal
│   │   │   ├── AnalyticsView.jsx  # Responses table, visual charts, exports
│   │   │   ├── AuthModal.jsx      # Login and registration modal
│   │   │   ├── Dashboard.jsx      # User form management grid
│   │   │   ├── Navbar.jsx         # Responsive navigation & account menu
│   │   │   ├── RespondentView.jsx # Live survey respondent view & file uploader
│   │   │   └── Toast.jsx          # Notification toasts
│   │   ├── App.jsx                # Main application orchestrator
│   │   └── index.css              # Custom responsive design system
│   ├── index.html                 # Single page application HTML shell
│   ├── package.json               # Node dependencies and scripts
│   └── vite.config.js             # Vite build & proxy configuration
├── Dockerfile                     # Production multi-stage Docker build
├── docker-compose.yml             # PostgreSQL + FastAPI service orchestration
├── .dockerignore                  # Docker build exclusions
├── .gitignore                     # Git tracking exclusions
└── README.md                      # Project documentation
```

---

## Local Development Setup

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

3. Install required Python packages:
   ```bash
   python -m pip install -r requirements.txt
   ```

4. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --reload-dir app --port 8000
   ```
   - API endpoints: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
   - Interactive API Docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Web application: [http://localhost:5173](http://localhost:5173)

---

## Production Deployment & Serving

In production, FormBuilder runs as a unified full-stack application where FastAPI serves the compiled React single-page application alongside all backend API routes:

1. Build the production React bundle:
   ```bash
   cd frontend
   npm run build
   ```

2. Run the production FastAPI server:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
   ```

FastAPI automatically:
- Serves the compiled SPA index at `/`
- Mounts static JavaScript and CSS assets at `/assets`
- Handles SPA deep links, routing, and browser refreshes (`/public/:id`, `/p/:id`, `/builder`, etc.) via catch-all fallback
- Serves API routes at `/api/v1` and health endpoints at `/health` and `/health/db`

---

## Docker Deployment

To launch the complete application with PostgreSQL in Docker:

1. Configure your environment variables in `.env` (optional, sensible defaults provided):
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=formbuilder_db
   SECRET_KEY=your-production-secret-key-change-me
   PORT=8000
   ```

2. Build and start the containers:
   ```bash
   docker compose up --build -d
   ```

3. View container logs:
   ```bash
   docker compose logs -f
   ```

4. Stop the containers:
   ```bash
   docker compose down
   ```

---

## Running the Automated Test Suite

All tests can be executed directly using the backend Python virtual environment:

```bash
# 1. Comprehensive Phase 2 Test Suite (Auth, Uploads, Conditional Logic, Exports, Isolation)
.\backend\.venv\Scripts\python.exe backend/test_phase2_comprehensive.py

# 2. Production SPA & Deep Link Route Verification
.\backend\.venv\Scripts\python.exe backend/test_production_spa.py

# 3. Core API Flow & Permission Tests
.\backend\.venv\Scripts\python.exe backend/test_api_flow.py

# 4. Frontend Production Build Verification
cd frontend && npm run build
```

---

## Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Runtime environment (`development` / `production`) |
| `DATABASE_URL` | `postgresql+psycopg2://...` | Primary PostgreSQL connection string |
| `ENABLE_SQLITE_FALLBACK` | `true` | Fallback to local SQLite if PostgreSQL is unreachable |
| `SQLITE_FALLBACK_URL` | `sqlite:///backend/formbuilder.db` | Local SQLite file destination |
| `SECRET_KEY` | *(configured secret)* | Secret key used for signing JWT access tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | Lifetime of signed JWT tokens |
| `CORS_ORIGINS` | `*` / localhost list | Permitted cross-origin origins |
| `UPLOAD_DIR` | `backend/uploads` | Filesystem destination for respondent uploaded files |
| `BACKEND_PORT` | `8000` | Port for the Uvicorn server |

---

## Security & Reliability Design

- **Path Traversal Protection:** Stored files use random UUID keys, and destination paths are strictly validated to prevent directory traversal.
- **Uploaded File Isolation:** Uploaded files are excluded from Git tracking via `.gitignore` and `.dockerignore`.
- **Safe Database Schema Handling:** Database schema migrations run idempotently without dropping existing tables or data.
- **User Isolation:** Form ownership is strictly enforced on all CRUD operations, response queries, analytics, and file downloads.
- **Session Expiration Handling:** The frontend intercepts 401 Unauthorized responses, clears stale authentication, and prompts the user to re-authenticate without blank screens.
