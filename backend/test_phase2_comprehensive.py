import io
import os
import sys
import uuid
import openpyxl

# Ensure UTF-8 output encoding on Windows stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app, ensure_database_schema
from app.models.form_upload import FormUpload


def run_phase2_comprehensive_tests():
    ensure_database_schema()
    client = TestClient(app)

    print("=======================================================")
    print("STARTING PHASE 2 COMPREHENSIVE TEST SUITE")
    print("=======================================================\n")

    # ---------------------------------------------------------
    # TEST 1: User Registration, Profile Update, and Password Change
    # ---------------------------------------------------------
    uid = uuid.uuid4().hex[:6]
    email = f"creator_{uid}@example.com"
    pwd = "OriginalPassword123!"

    reg_res = client.post("/api/v1/auth/register", json={"email": email, "password": pwd, "full_name": "Original Name"})
    assert reg_res.status_code == 201, reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Registered user {email}")

    # Update profile display name
    prof_res = client.put("/api/v1/auth/profile", json={"full_name": "Updated Creator Name"}, headers=headers)
    assert prof_res.status_code == 200, prof_res.text
    assert prof_res.json()["full_name"] == "Updated Creator Name"
    print("[PASS] Profile display name updated to 'Updated Creator Name'")

    # Change password - wrong current password
    bad_pass_res = client.put(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPassword", "new_password": "NewSecretPassword123!"},
        headers=headers,
    )
    assert bad_pass_res.status_code == 400, "Expected 400 for incorrect current password"
    print("[PASS] Change password rejected invalid current password (400)")

    # Change password - new password too short (<6 chars)
    short_pass_res = client.put(
        "/api/v1/auth/change-password",
        json={"current_password": pwd, "new_password": "123"},
        headers=headers,
    )
    assert short_pass_res.status_code == 422, "Expected 422 for short password"
    print("[PASS] Change password rejected short new password (422)")

    # Change password - valid
    new_pwd = "NewSecretPassword123!"
    good_pass_res = client.put(
        "/api/v1/auth/change-password",
        json={"current_password": pwd, "new_password": new_pwd},
        headers=headers,
    )
    assert good_pass_res.status_code == 200, good_pass_res.text
    print("[PASS] Password changed successfully")

    # Login with old password fails
    old_login = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert old_login.status_code == 401, "Expected 401 with revoked old password"
    print("[PASS] Login with old password rejected (401)")

    # Login with new password succeeds
    new_login = client.post("/api/v1/auth/login", json={"email": email, "password": new_pwd})
    assert new_login.status_code == 200, new_login.text
    token = new_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Login with new password verified")

    # ---------------------------------------------------------
    # TEST 2: Form Creation with File Upload and Conditional Rules
    # ---------------------------------------------------------
    create_form_res = client.post(
        "/api/v1/forms",
        json={
            "title": f"Phase 2 Test Form {uid}",
            "description": "Testing conditional logic, file upload, and xlsx export",
            "is_published": False,
        },
        headers=headers,
    )
    assert create_form_res.status_code == 201, create_form_res.text
    form_id = create_form_res.json()["id"]
    print(f"[PASS] Created Form {form_id}")

    # Field 1: Single Choice (Parent Question)
    f1_res = client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={
            "field_type": "radio",
            "label": "Do you have prior experience?",
            "required": True,
            "options": ["Yes", "No"],
            "order": 1,
        },
        headers=headers,
    )
    assert f1_res.status_code == 201, f1_res.text
    f1_id = f1_res.json()["id"]

    # Field 2: Number (Years of experience) - Conditionally shown IF Question 1 == "Yes"
    f2_res = client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={
            "field_type": "number",
            "label": "Years of experience",
            "required": True,
            "order": 2,
            "conditional_rules": {
                "action": "show",
                "logic_type": "all",
                "conditions": [
                    {"field_id": f1_id, "operator": "equals", "value": "Yes"}
                ],
            },
        },
        headers=headers,
    )
    assert f2_res.status_code == 201, f2_res.text
    f2_id = f2_res.json()["id"]

    # Field 3: File Upload - Conditionally shown IF Question 1 == "Yes"
    f3_res = client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={
            "field_type": "file",
            "label": "Attach Resume or Certification",
            "required": True,
            "order": 3,
            "validation_rules": {
                "allowed_types": [".pdf", ".png", ".jpg"],
                "max_file_size_mb": 2,
                "max_files": 2,
            },
            "conditional_rules": {
                "action": "show",
                "logic_type": "all",
                "conditions": [
                    {"field_id": f1_id, "operator": "equals", "value": "Yes"}
                ],
            },
        },
        headers=headers,
    )
    assert f3_res.status_code == 201, f3_res.text
    f3_id = f3_res.json()["id"]

    # Field 4: Text (General feedback) - Always visible
    f4_res = client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={
            "field_type": "text",
            "label": "Why do you want to join?",
            "required": True,
            "order": 4,
        },
        headers=headers,
    )
    assert f4_res.status_code == 201, f4_res.text
    f4_id = f4_res.json()["id"]

    # Publish the form
    pub_toggle = client.patch(f"/api/v1/forms/{form_id}/toggle-publish", headers=headers)
    assert pub_toggle.status_code == 200
    assert pub_toggle.json()["is_published"] is True
    print("[PASS] Form configured with 4 fields, conditional visibility rules, file upload limits, and published.")

    # ---------------------------------------------------------
    # TEST 3: Conditional Logic Validation on Submission
    # ---------------------------------------------------------
    # Case A: Question 1 = "No".
    # Fields 2 & 3 are conditionally HIDDEN. Even though they are marked required=True,
    # the backend MUST skip them and allow submission without them!
    sub_no_res = client.post(
        f"/api/v1/public/forms/{form_id}/submit",
        json={
            "answers": {
                str(f1_id): "No",
                str(f4_id): "Passionate about learning new technologies.",
            }
        },
    )
    assert sub_no_res.status_code == 201, f"Expected 201, got {sub_no_res.status_code}: {sub_no_res.text}"
    print("[PASS] Conditional Logic: Submission with Q1='No' skipped hidden required fields (201 Created)")

    # Case B: Question 1 = "Yes".
    # Fields 2 & 3 are now conditionally VISIBLE. Omitting them must trigger a 422 validation error!
    sub_yes_missing_res = client.post(
        f"/api/v1/public/forms/{form_id}/submit",
        json={
            "answers": {
                str(f1_id): "Yes",
                str(f4_id): "Extensive background in the field.",
            }
        },
    )
    assert sub_yes_missing_res.status_code == 422, f"Expected 422, got {sub_yes_missing_res.status_code}"
    print("[PASS] Conditional Logic: Submission with Q1='Yes' enforced visible required fields (422 Unprocessable)")

    # ---------------------------------------------------------
    # TEST 4: File Upload Validations (Type, Size, Count)
    # ---------------------------------------------------------
    # Invalid extension (.sh)
    bad_ext_file = ("script.sh", b"echo 'test'", "text/x-sh")
    bad_ext_res = client.post(
        f"/api/v1/public/forms/{form_id}/upload",
        data={"field_id": f3_id},
        files=[("files", bad_ext_file)],
    )
    assert bad_ext_res.status_code == 400, f"Expected 400 for bad extension, got {bad_ext_res.status_code}"
    assert "unsupported file type" in bad_ext_res.text.lower()
    print("[PASS] File upload validation: disallowed extension rejected (400)")

    # File size exceeding max_file_size_mb (2MB limit, sending 3MB dummy payload)
    large_bytes = b"0" * (3 * 1024 * 1024)
    large_file = ("large_document.pdf", large_bytes, "application/pdf")
    large_res = client.post(
        f"/api/v1/public/forms/{form_id}/upload",
        data={"field_id": f3_id},
        files=[("files", large_file)],
    )
    assert large_res.status_code == 400, f"Expected 400 for oversized file, got {large_res.status_code}"
    assert "too large" in large_res.text.lower()
    print("[PASS] File upload validation: oversized file (>2MB) rejected (400)")

    # Exceeding max_files (limit is 2, sending 3 files)
    file_a = ("doc1.pdf", b"pdf content 1", "application/pdf")
    file_b = ("doc2.pdf", b"pdf content 2", "application/pdf")
    file_c = ("doc3.pdf", b"pdf content 3", "application/pdf")
    too_many_res = client.post(
        f"/api/v1/public/forms/{form_id}/upload",
        data={"field_id": f3_id},
        files=[("files", file_a), ("files", file_b), ("files", file_c)],
    )
    assert too_many_res.status_code == 400, f"Expected 400 for too many files, got {too_many_res.status_code}"
    assert "exceeded maximum number of files" in too_many_res.text.lower()
    print("[PASS] File upload validation: excessive file count (>2) rejected (400)")

    # Valid upload of 2 files
    valid_pdf = ("official_resume.pdf", b"%PDF-1.4 sample resume content...", "application/pdf")
    valid_png = ("cert_badge.png", b"\x89PNG\r\n\x1a\n sample png content...", "image/png")
    upload_success_res = client.post(
        f"/api/v1/public/forms/{form_id}/upload",
        data={"field_id": f3_id},
        files=[("files", valid_pdf), ("files", valid_png)],
    )
    assert upload_success_res.status_code == 200, upload_success_res.text
    uploaded_files_meta = upload_success_res.json()
    assert len(uploaded_files_meta) == 2
    f_key_pdf = uploaded_files_meta[0]["file_key"]
    f_key_png = uploaded_files_meta[1]["file_key"]
    print(f"[PASS] Successfully uploaded 2 valid files: keys=[{f_key_pdf[:8]}..., {f_key_png[:8]}...]")

    # Download uploaded file via public endpoint
    pub_dl_res = client.get(f"/api/v1/public/forms/{form_id}/uploads/{f_key_pdf}")
    assert pub_dl_res.status_code == 200
    assert b"%PDF-1.4" in pub_dl_res.content
    print("[PASS] Public file download endpoint verified")

    # Download uploaded file via owner endpoint
    owner_dl_res = client.get(f"/api/v1/forms/{form_id}/uploads/{f_key_png}", headers=headers)
    assert owner_dl_res.status_code == 200
    assert b"\x89PNG" in owner_dl_res.content
    print("[PASS] Owner authenticated file download endpoint verified")

    # Submit second complete response with files attached
    sub_yes_full_res = client.post(
        f"/api/v1/public/forms/{form_id}/submit",
        json={
            "answers": {
                str(f1_id): "Yes",
                str(f2_id): 5,
                str(f3_id): uploaded_files_meta,
                str(f4_id): "I have 5 years building scalable web applications.",
            }
        },
    )
    assert sub_yes_full_res.status_code == 201, sub_yes_full_res.text
    resp2_id = sub_yes_full_res.json()["response_id"]
    print(f"[PASS] Complete submission with uploaded file metadata accepted (Response #{resp2_id})")

    # ---------------------------------------------------------
    # TEST 5: XLSX Export
    # ---------------------------------------------------------
    # Via Bearer Header
    xlsx_res = client.get(f"/api/v1/forms/{form_id}/export/xlsx", headers=headers)
    assert xlsx_res.status_code == 200, xlsx_res.text
    assert "spreadsheetml.sheet" in xlsx_res.headers.get("content-type", "")

    # Validate workbook contents using openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_res.content))
    ws = wb.active
    assert ws.title == "Form Responses"
    headers_row = [cell.value for cell in ws[1]]
    assert "Submission ID" in headers_row
    assert "Submitted At" in headers_row
    assert "Do you have prior experience?" in headers_row
    assert "Years of experience" in headers_row
    assert "Attach Resume or Certification" in headers_row

    # Verify data rows
    assert ws.max_row >= 3  # Header + 2 submissions
    print(f"[PASS] Excel XLSX Export generated and verified successfully ({ws.max_row} rows, {ws.max_column} columns)")

    # Via ?token= URL parameter (browser download mode)
    xlsx_token_res = client.get(f"/api/v1/forms/{form_id}/export/xlsx?token={token}")
    assert xlsx_token_res.status_code == 200
    assert len(xlsx_token_res.content) > 1000
    print("[PASS] Excel XLSX Export with ?token= download parameter verified")

    # ---------------------------------------------------------
    # TEST 6: CSV Export with File Upload Answers
    # ---------------------------------------------------------
    csv_res = client.get(f"/api/v1/forms/{form_id}/export", headers=headers)
    assert csv_res.status_code == 200
    csv_text = csv_res.text
    assert "Submission ID" in csv_text
    assert "official_resume.pdf" in csv_text
    print("[PASS] CSV Export with formatted file upload names verified")

    # ---------------------------------------------------------
    # TEST 7: Analytics with File Upload Question
    # ---------------------------------------------------------
    analytics_res = client.get(f"/api/v1/forms/{form_id}/analytics", headers=headers)
    assert analytics_res.status_code == 200
    ana_data = analytics_res.json()
    assert ana_data["total_responses"] == 2
    f3_summary = next(f for f in ana_data["fields_summary"] if f["field_id"] == f3_id)
    assert f3_summary["total_answers"] == 1
    assert "official_resume.pdf" in f3_summary["recent_answers"]
    print("[PASS] Analytics aggregated responses and file upload summaries correctly")

    # ---------------------------------------------------------
    # TEST 8: Form Duplication Preserves Rules & Field Types
    # ---------------------------------------------------------
    dup_res = client.post(f"/api/v1/forms/{form_id}/duplicate", headers=headers)
    assert dup_res.status_code == 201, dup_res.text
    dup_form = dup_res.json()
    assert dup_form["id"] != form_id
    assert len(dup_form["fields"]) == 4
    dup_file_field = next(f for f in dup_form["fields"] if f["field_type"] == "file")
    assert dup_file_field["validation_rules"]["max_file_size_mb"] == 2
    assert len(dup_file_field["conditional_rules"]["conditions"]) == 1
    print(f"[PASS] Form duplication created Form {dup_form['id']} preserving conditional rules and file validation")

    # Delete duplicate
    del_res = client.delete(f"/api/v1/forms/{dup_form['id']}", headers=headers)
    assert del_res.status_code == 200
    print("[PASS] Cleaned up duplicate form")

    # ---------------------------------------------------------
    # TEST 9: User Isolation & Permissions (User B vs User A)
    # ---------------------------------------------------------
    user_b_res = client.post(
        "/api/v1/auth/register",
        json={"email": f"intruder_{uid}@example.com", "password": "Password123!", "full_name": "Intruder User"},
    )
    user_b_token = user_b_res.json()["access_token"]
    user_b_headers = {"Authorization": f"Bearer {user_b_token}"}

    # User B cannot view User A's responses
    b_resp = client.get(f"/api/v1/forms/{form_id}/responses", headers=user_b_headers)
    assert b_resp.status_code == 403
    print("[PASS] User isolation: User B blocked from User A responses (403)")

    # User B cannot export User A's XLSX
    b_xlsx = client.get(f"/api/v1/forms/{form_id}/export/xlsx", headers=user_b_headers)
    assert b_xlsx.status_code == 403
    print("[PASS] User isolation: User B blocked from User A XLSX export (403)")

    # User B cannot download User A's private uploads
    b_upload = client.get(f"/api/v1/forms/{form_id}/uploads/{f_key_pdf}", headers=user_b_headers)
    assert b_upload.status_code == 403
    print("[PASS] User isolation: User B blocked from User A response attachments (403)")

    print("\n=======================================================")
    print("ALL PHASE 2 COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS!")
    print("=======================================================")


if __name__ == "__main__":
    run_phase2_comprehensive_tests()
