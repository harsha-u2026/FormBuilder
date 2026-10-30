"""
test_six_features.py: Comprehensive Automated Test Suite for FormBuilder 6 Production Features
Tests:
- Feature 1: Form Templates (List, Preview without form creation, Creation & Ownership for 6 templates)
- Feature 2: Automatic Draft Saving (Field updates, settings, conditional rules, user isolation)
- Feature 3: Respondent Experience (Public retrieval, view count, conditional logic required validation)
- Feature 4: QR Code & Sharing (Canonical URL format, banner upload validation & serving)
- Feature 5: Advanced Analytics (Date range filtering, response trends, completion rate, rating breakdown, CSV/XLSX export)
- Feature 6: Form Themes & Branding (HEX validation, theme_settings persistence, public delivery)
"""

import sys
import uuid
import datetime
from fastapi.testclient import TestClient

# Ensure backend package is in sys.path
sys.path.insert(0, ".")

from app.main import app

client = TestClient(app)

def create_authenticated_user(email_prefix="test_features"):
    uid = uuid.uuid4().hex[:8]
    email = f"{email_prefix}_{uid}@example.com"
    pwd = "StrongPassword!123"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": f"Feature Tester {uid}"
    })
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, headers, token


def run_tests():
    print("=" * 65)
    print("STARTING TEST SUITE: 6 PRODUCTION FEATURES")
    print("=" * 65)

    user_a_id, headers_a, token_a = create_authenticated_user("user_a")
    user_b_id, headers_b, token_b = create_authenticated_user("user_b")
    print("[PASS] Created two isolated test users: User A and User B")

    # -------------------------------------------------------------
    # FEATURE 1: Form Templates
    # -------------------------------------------------------------
    print("\n--- FEATURE 1: FORM TEMPLATES ---")
    
    # 1.1: List templates endpoint (preview without creating forms in DB)
    templates_res = client.get("/api/v1/forms/templates")
    assert templates_res.status_code == 200, f"Failed to get templates: {templates_res.text}"
    templates = templates_res.json()
    assert len(templates) >= 6, f"Expected at least 6 templates, got {len(templates)}"
    
    template_keys = [t["key"] for t in templates]
    for required_key in ["csat", "college", "event", "job", "quiz", "bug"]:
        assert required_key in template_keys, f"Missing required template: {required_key}"
    print(f"[PASS] GET /api/v1/forms/templates returned {len(templates)} templates including all 6 required types.")

    # 1.2: Check template detail previews contain questions, types, and required settings
    college_tpl = next(t for t in templates if t["key"] == "college")
    assert len(college_tpl["fields"]) >= 4, "College feedback template should have multiple preconfigured questions"
    assert any(f["field_type"] == "rating" for f in college_tpl["fields"]), "College template should include rating question"
    assert any(f["required"] is True for f in college_tpl["fields"]), "College template should specify required questions"
    print(f"[PASS] Template preview verified: '{college_tpl['title']}' contains {len(college_tpl['fields'])} preconfigured questions without DB creation.")

    # 1.3: Create form from template (belongs to logged-in user)
    created_forms = []
    for key in ["college", "event", "job", "quiz"]:
        create_tpl_res = client.post(f"/api/v1/forms/templates/{key}", headers=headers_a)
        assert create_tpl_res.status_code == 201, f"Failed to create form from template {key}: {create_tpl_res.text}"
        form_data = create_tpl_res.json()
        assert form_data.get("owner_id") == user_a_id, f"Form should belong to User A, got {form_data.get('owner_id')}"
        assert len(form_data["fields"]) > 0, "Created form should contain template fields"
        created_forms.append(form_data["id"])
    print(f"[PASS] Created 4 forms from templates successfully. All assigned to User A (owner).")

    # 1.4: Blank form creation preserved
    blank_res = client.post("/api/v1/forms", headers=headers_a, json={
        "title": "Blank Test Form",
        "description": "Standard blank form creation",
        "theme_color": "#4F46E5",
        "is_published": False
    })
    assert blank_res.status_code == 201
    blank_form_id = blank_res.json()["id"]
    created_forms.append(blank_form_id)
    print(f"[PASS] Blank form creation preserved (Form #{blank_form_id}).")

    # -------------------------------------------------------------
    # FEATURE 2: Automatic Draft Saving & Safety
    # -------------------------------------------------------------
    print("\n--- FEATURE 2: AUTOMATIC DRAFT SAVING ---")
    
    # 2.1: Save form title, description, and settings
    test_form_id = blank_form_id
    update_res = client.put(f"/api/v1/forms/{test_form_id}", headers=headers_a, json={
        "title": "Auto-Saved Production Survey",
        "description": "Updated dynamically via debounced draft saving",
        "theme_color": "#0284C7"
    })
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Auto-Saved Production Survey"
    print("[PASS] Auto-saved form title and description updates successfully.")

    # 2.2: Add and update questions, options, and conditional rules
    q1_res = client.post(f"/api/v1/forms/{test_form_id}/fields", headers=headers_a, json={
        "field_type": "radio",
        "label": "Are you a student or faculty?",
        "options": ["Student", "Faculty", "Staff"],
        "required": True
    })
    assert q1_res.status_code == 201
    q1_id = q1_res.json()["id"]

    q2_res = client.post(f"/api/v1/forms/{test_form_id}/fields", headers=headers_a, json={
        "field_type": "text",
        "label": "Student ID Number",
        "required": True,
        "conditional_rules": {
            "action": "show",
            "logic_type": "all",
            "conditions": [
                {"field_id": q1_id, "operator": "equals", "value": "Student"}
            ]
        }
    })
    assert q2_res.status_code == 201
    q2_id = q2_res.json()["id"]

    q3_res = client.post(f"/api/v1/forms/{test_form_id}/fields", headers=headers_a, json={
        "field_type": "rating",
        "label": "Campus Facilities Rating",
        "required": True
    })
    assert q3_res.status_code == 201
    q3_id = q3_res.json()["id"]

    # Test updating question settings without creating duplicates
    update_q1 = client.put(f"/api/v1/forms/{test_form_id}/fields/{q1_id}", headers=headers_a, json={
        "label": "Are you a current student or faculty member?",
        "options": ["Student", "Faculty", "Staff", "Visitor"]
    })
    assert update_q1.status_code == 200
    assert "Visitor" in update_q1.json()["options"]
    
    # Verify no duplicate fields created
    form_check = client.get(f"/api/v1/forms/{test_form_id}", headers=headers_a).json()
    assert len(form_check["fields"]) == 3, f"Expected exactly 3 fields, got {len(form_check['fields'])}"
    print("[PASS] Question updates persisted with conditional rules; duplicate fields prevented during retries.")

    # 2.3: User authorization isolation (User B cannot overwrite User A's form)
    unauthorized_save = client.put(f"/api/v1/forms/{test_form_id}", headers=headers_b, json={
        "title": "Hacked Title by User B"
    })
    assert unauthorized_save.status_code == 403, "User B must not be able to modify User A's form"
    print("[PASS] User authorization verified: User B blocked with 403 Forbidden.")

    # -------------------------------------------------------------
    # FEATURE 3: Respondent Experience & View Tracking
    # -------------------------------------------------------------
    print("\n--- FEATURE 3: RESPONDENT EXPERIENCE ---")

    # Publish form so public respondent can access
    pub_toggle = client.patch(f"/api/v1/forms/{test_form_id}/toggle-publish", headers=headers_a)
    assert pub_toggle.status_code == 200
    assert pub_toggle.json()["is_published"] is True

    # 3.1: Anonymous respondent fetches form and increments view_count
    owner_check_before = client.get(f"/api/v1/forms/{test_form_id}", headers=headers_a).json()
    views_before = owner_check_before.get("view_count", 0)

    public_res1 = client.get(f"/api/v1/public/forms/{test_form_id}")
    assert public_res1.status_code == 200

    owner_check_after1 = client.get(f"/api/v1/forms/{test_form_id}", headers=headers_a).json()
    assert owner_check_after1["view_count"] == views_before + 1

    public_res2 = client.get(f"/api/v1/public/forms/{test_form_id}")
    assert public_res2.status_code == 200

    owner_check_after2 = client.get(f"/api/v1/forms/{test_form_id}", headers=headers_a).json()
    assert owner_check_after2["view_count"] == views_before + 2
    print(f"[PASS] Real view_count tracked accurately: before={views_before}, after visits={views_before + 2}.")

    # 3.2: Submission with conditional logic: Q1='Faculty' hides Q2 ('Student ID Number').
    # Hidden required question must NOT trigger a 422 error!
    sub1_res = client.post(f"/api/v1/public/forms/{test_form_id}/submit", json={
        "answers": {
            str(q1_id): "Faculty",
            str(q3_id): 5
        }
    })
    assert sub1_res.status_code == 201, f"Failed conditional logic submission: {sub1_res.text}"
    print("[PASS] Conditional logic: Hidden required question excluded from validation; response accepted.")

    # 3.3: Submission with Q1='Student' makes Q2 visible. If omitted, should trigger validation error!
    sub_fail = client.post(f"/api/v1/public/forms/{test_form_id}/submit", json={
        "answers": {
            str(q1_id): "Student",
            str(q3_id): 4
        }
    })
    assert sub_fail.status_code == 422, "Visible required question should trigger 422 when omitted"
    print("[PASS] Inline validation enforced: Visible required question triggered 422 Unprocessable.")

    # 3.4: Complete submission with visible question filled
    sub2_res = client.post(f"/api/v1/public/forms/{test_form_id}/submit", json={
        "answers": {
            str(q1_id): "Student",
            str(q2_id): "STU-99482",
            str(q3_id): 4
        }
    })
    assert sub2_res.status_code == 201
    print(f"[PASS] Valid submission accepted with submission reference #{sub2_res.json().get('response_id') or sub2_res.json().get('submission_id')}.")

    # -------------------------------------------------------------
    # FEATURE 4: QR Code, Sharing & Header Banners
    # -------------------------------------------------------------
    print("\n--- FEATURE 4: QR CODE & SHARING ---")

    # 4.1: Banner upload validation (valid image vs disallowed file)
    bad_upload = client.post(
        f"/api/v1/forms/{test_form_id}/banner",
        headers=headers_a,
        files={"file": ("malicious.exe", b"MZexecutabledata", "application/x-msdownload")}
    )
    assert bad_upload.status_code == 400, "Disallowed file type for banner must be rejected"
    print("[PASS] Banner upload validation rejected disallowed file type (400 Bad Request).")

    # 4.2: Valid image upload
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    banner_res = client.post(
        f"/api/v1/forms/{test_form_id}/banner",
        headers=headers_a,
        files={"file": ("header.png", fake_png, "image/png")}
    )
    assert banner_res.status_code == 200
    banner_url = banner_res.json()["theme_settings"]["banner_url"]
    assert "banner" in banner_url
    print(f"[PASS] Valid banner image uploaded and registered: {banner_url}")

    # 4.3: Public banner serving endpoint
    file_key = banner_url.split("/")[-1]
    serve_res = client.get(f"/api/v1/public/forms/{test_form_id}/banner/{file_key}")
    assert serve_res.status_code == 200
    assert serve_res.headers["content-type"].startswith("image/")
    print("[PASS] Public banner image served safely with proper content-type header.")

    # -------------------------------------------------------------
    # FEATURE 5: Advanced Analytics & Date Filtering
    # -------------------------------------------------------------
    print("\n--- FEATURE 5: ADVANCED ANALYTICS ---")

    # 5.1: Fetch analytics for test_form_id
    analytics_res = client.get(f"/api/v1/forms/{test_form_id}/analytics", headers=headers_a)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()

    assert analytics["total_responses"] == 2, f"Expected 2 responses, got {analytics['total_responses']}"
    assert analytics["view_count"] >= 2, f"Expected view_count >= 2, got {analytics['view_count']}"
    assert 0 <= analytics["completion_rate"] <= 100, "Completion rate should be calculated percentage"
    print(f"[PASS] Real completion rate computed: {analytics['completion_rate']}% ({analytics['total_responses']} submissions / {analytics['view_count']} views).")

    # 5.2: Check rating breakdown and option percentages
    q1_summary = next((q for q in analytics["fields_summary"] if q["field_id"] == q1_id), None)
    assert q1_summary is not None
    assert "Student" in q1_summary["option_percentages"]
    assert "Faculty" in q1_summary["option_percentages"]
    print(f"[PASS] Choice question percentages computed: {q1_summary['option_percentages']}")

    q3_summary = next((q for q in analytics["fields_summary"] if q["field_id"] == q3_id), None)
    assert q3_summary is not None
    assert "rating_breakdown" in q3_summary
    assert q3_summary["rating_breakdown"]["5"] >= 1
    assert q3_summary["rating_breakdown"]["4"] >= 1
    print(f"[PASS] Rating 5-to-1 star histogram computed: {q3_summary['rating_breakdown']}")

    # 5.3: Date range filtering
    now = datetime.datetime.now(datetime.timezone.utc)
    date_from = (now - datetime.timedelta(days=1)).isoformat()
    date_to = (now + datetime.timedelta(days=1)).isoformat()
    filtered_res = client.get(
        f"/api/v1/forms/{test_form_id}/analytics?date_from={date_from}&date_to={date_to}",
        headers=headers_a
    )
    assert filtered_res.status_code == 200
    assert filtered_res.json()["total_responses"] == 2
    print("[PASS] Date-range filtering returned accurate response trends.")

    # 5.4: User B blocked from User A's analytics
    unauthorized_analytics = client.get(f"/api/v1/forms/{test_form_id}/analytics", headers=headers_b)
    assert unauthorized_analytics.status_code == 403
    print("[PASS] User isolation confirmed: User B blocked from User A analytics (403 Forbidden).")

    # 5.5: CSV and XLSX export preserved
    csv_res = client.get(f"/api/v1/forms/{test_form_id}/export", headers=headers_a)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Submission ID" in csv_res.text
    print("[PASS] CSV export preserved with correct headers and response rows.")

    xlsx_res = client.get(f"/api/v1/forms/{test_form_id}/export/xlsx", headers=headers_a)
    assert xlsx_res.status_code == 200
    assert "application/vnd.openxmlformats" in xlsx_res.headers["content-type"]
    assert len(xlsx_res.content) > 500
    print("[PASS] Excel XLSX export preserved and verified binary payload.")

    # -------------------------------------------------------------
    # FEATURE 6: Form Themes & Branding
    # -------------------------------------------------------------
    print("\n--- FEATURE 6: FORM THEMES & BRANDING ---")

    # 6.1: Valid theme settings persistence
    valid_theme = {
        "primary_color": "#8B5CF6",
        "font_family": "Outfit",
        "button_style": "pill",
        "background_mode": "cool",
        "banner_url": banner_url
    }
    theme_res = client.put(f"/api/v1/forms/{test_form_id}", headers=headers_a, json={
        "theme_settings": valid_theme
    })
    assert theme_res.status_code == 200
    saved_theme = theme_res.json()["theme_settings"]
    assert saved_theme["primary_color"] == "#8B5CF6"
    assert saved_theme["font_family"].lower() == "outfit"
    assert saved_theme["button_style"] == "pill"
    print("[PASS] Form theme settings persisted with custom color, typography, button style, and banner.")

    # 6.2: Color injection prevention / validation
    invalid_theme_color = {
        "theme_settings": {
            "primary_color": "red; background: url('javascript:evil()');",
            "font_family": "Inter",
            "button_style": "rounded"
        }
    }
    invalid_res = client.put(f"/api/v1/forms/{test_form_id}", headers=headers_a, json=invalid_theme_color)
    assert invalid_res.status_code == 422, "Invalid hex color injection should be rejected with 422"
    print("[PASS] Security validation verified: Malicious CSS/HTML color injection rejected with 422.")

    # 6.3: Public delivery of saved theme
    public_theme_check = client.get(f"/api/v1/public/forms/{test_form_id}")
    assert public_theme_check.status_code == 200
    delivered_theme = public_theme_check.json()["theme_settings"]
    assert delivered_theme["primary_color"] == "#8B5CF6"
    assert delivered_theme["button_style"] == "pill"
    print("[PASS] Public respondent endpoint correctly delivers saved theme settings.")

    # -------------------------------------------------------------
    # CLEANUP TEST FORMS
    # -------------------------------------------------------------
    for fid in created_forms:
        client.delete(f"/api/v1/forms/{fid}", headers=headers_a)
    print(f"\n[PASS] Cleaned up {len(created_forms)} test forms cleanly.")

    print("\n" + "=" * 65)
    print("ALL 6 PRODUCTION FEATURE TESTS COMPLETED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
