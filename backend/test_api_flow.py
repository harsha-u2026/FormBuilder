import os
import sys
import uuid

# Ensure UTF-8 output encoding on Windows stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app, ensure_database_schema

def run_test():
    ensure_database_schema()
    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, res.text
    print("[OK] Health check passed:", res.json())

    # 2. DB Health check
    res = client.get("/health/db")
    assert res.status_code == 200, res.text
    print("[OK] DB health check passed:", res.json())

    # 3. Register User A
    uid = uuid.uuid4().hex[:6]
    user_a_email = f"user_{uid}@example.com"
    user_a_pass = "SecurePass123!"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": user_a_email, "password": user_a_pass, "full_name": f"User A {uid}"},
    )
    assert reg_res.status_code == 201, reg_res.text
    user_a_token = reg_res.json()["access_token"]
    user_a_headers = {"Authorization": f"Bearer {user_a_token}"}
    print(f"[OK] Registered User A ({user_a_email}) with valid JWT token.")

    # 4. Login User A
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": user_a_email, "password": user_a_pass},
    )
    assert login_res.status_code == 200, login_res.text
    assert "access_token" in login_res.json()
    print("[OK] User A login verified.")

    # 5. Get current user profile (/auth/me)
    me_res = client.get("/api/v1/auth/me", headers=user_a_headers)
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["email"] == user_a_email
    print("[OK] /auth/me returned correct profile:", me_res.json()["email"])

    # 6. Verify unauthenticated request to protected endpoint fails
    unauth_res = client.post("/api/v1/forms/templates/csat")
    assert unauth_res.status_code == 401, f"Expected 401 Unauthorized, got {unauth_res.status_code}"
    print("[OK] Unauthenticated template creation correctly rejected with 401.")

    # 7. Create form from CSAT template as User A
    res = client.post("/api/v1/forms/templates/csat", headers=user_a_headers)
    assert res.status_code == 201, res.text
    form_data = res.json()
    form_id = form_data["id"]
    print(f"[OK] User A created template form {form_id}: '{form_data['title']}' with {len(form_data['fields'])} fields")

    # 8. Add a new field (Number)
    field_payload = {
        "field_type": "number",
        "label": "Net Promoter Score (0-10)",
        "placeholder": "10",
        "required": True,
        "order": 5,
    }
    res = client.post(f"/api/v1/forms/{form_id}/fields", json=field_payload, headers=user_a_headers)
    assert res.status_code == 201, res.text
    added_field = res.json()
    print(f"[OK] Added field: {added_field['label']} (id={added_field['id']})")

    # 9. Fetch public form (NO AUTH REQUIRED - for survey respondents)
    res = client.get(f"/api/v1/public/forms/{form_id}")
    assert res.status_code == 200, res.text
    pub_form = res.json()
    print(f"[OK] Public form retrieved by anonymous respondent: {pub_form['title']}, fields count = {len(pub_form['fields'])}")

    # 10. Submit respondent response (NO AUTH REQUIRED)
    answers = {}
    for f in pub_form["fields"]:
        f_id = str(f["id"])
        if f["field_type"] == "rating":
            answers[f_id] = 5
        elif f["field_type"] == "radio":
            answers[f_id] = "Definitely"
        elif f["field_type"] == "checkbox":
            answers[f_id] = ["Speed & Reliability", "Ease of Use"]
        elif f["field_type"] == "email":
            answers[f_id] = "respondent@example.com"
        elif f["field_type"] == "number":
            answers[f_id] = 10
        else:
            answers[f_id] = "Great experience overall!"

    submit_res = client.post(f"/api/v1/public/forms/{form_id}/submit", json={"answers": answers})
    assert submit_res.status_code == 201, submit_res.text
    print("[OK] Respondent submitted response successfully:", submit_res.json()["response_id"])

    # 11. View responses & analytics (User A authenticated)
    analytics_res = client.get(f"/api/v1/forms/{form_id}/analytics", headers=user_a_headers)
    assert analytics_res.status_code == 200, analytics_res.text
    analytics = analytics_res.json()
    assert analytics["total_responses"] >= 1
    print("[OK] Form analytics validated for owner: total responses =", analytics["total_responses"])

    # 12. Export CSV (User A authenticated via header)
    csv_res = client.get(f"/api/v1/forms/{form_id}/export", headers=user_a_headers)
    assert csv_res.status_code == 200, csv_res.text
    assert "Submission ID" in csv_res.text
    print("[OK] CSV export verified with Bearer header! Header row:", csv_res.text.splitlines()[0][:60], "...")

    # 13. Export CSV (User A authenticated via query param ?token=)
    csv_token_res = client.get(f"/api/v1/forms/{form_id}/export?token={user_a_token}")
    assert csv_token_res.status_code == 200, csv_token_res.text
    assert "Submission ID" in csv_token_res.text
    print("[OK] CSV export verified with ?token= query parameter!")

    # 14. Register User B and verify cross-user isolation and permission checks
    user_b_email = f"user_b_{uid}@example.com"
    reg_b = client.post(
        "/api/v1/auth/register",
        json={"email": user_b_email, "password": "UserBPassword123!", "full_name": "User B"},
    )
    assert reg_b.status_code == 201, reg_b.text
    user_b_token = reg_b.json()["access_token"]
    user_b_headers = {"Authorization": f"Bearer {user_b_token}"}

    # User B should NOT see User A's form in their list
    b_forms_res = client.get("/api/v1/forms", headers=user_b_headers)
    assert b_forms_res.status_code == 200
    b_form_ids = [f["id"] for f in b_forms_res.json()]
    assert form_id not in b_form_ids, f"User B should not see User A's form {form_id} in form listing!"
    print("[OK] User isolation confirmed: User B does not see User A's form in dashboard list.")

    # User B should NOT be able to modify User A's form (403 Forbidden)
    b_edit_res = client.put(f"/api/v1/forms/{form_id}", json={"title": "Hacked Title"}, headers=user_b_headers)
    assert b_edit_res.status_code == 403, f"Expected 403, got {b_edit_res.status_code}"
    print("[OK] User permission check verified: User B receives 403 Forbidden when trying to edit User A's form.")

    # User B should NOT be able to view User A's responses (403 Forbidden)
    b_resp_res = client.get(f"/api/v1/forms/{form_id}/responses", headers=user_b_headers)
    assert b_resp_res.status_code == 403, f"Expected 403, got {b_resp_res.status_code}"
    print("[OK] User permission check verified: User B receives 403 Forbidden when trying to access User A's responses.")

    print("\n=======================================================")
    print("ALL BACKEND AUTH & PERMISSION TESTS PASSED PERFECTLY :)")
    print("=======================================================")

if __name__ == "__main__":
    run_test()
