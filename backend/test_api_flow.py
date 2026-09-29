import os
import sys

# Ensure UTF-8 output encoding on Windows stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine

def run_test():
    # Ensure tables
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, res.text
    print("[OK] Health check passed:", res.json())

    # 2. DB Health check
    res = client.get("/health/db")
    assert res.status_code == 200, res.text
    print("[OK] DB health check passed:", res.json())

    # 3. Create form from CSAT template
    res = client.post("/api/v1/forms/templates/csat")
    assert res.status_code == 201, res.text
    form_data = res.json()
    form_id = form_data["id"]
    print(f"[OK] Created template form {form_id}: '{form_data['title']}' with {len(form_data['fields'])} fields")

    # 4. Add a new field
    field_payload = {
        "field_type": "number",
        "label": "Net Promoter Score (0-10)",
        "placeholder": "10",
        "required": True,
        "order": 5,
    }
    res = client.post(f"/api/v1/forms/{form_id}/fields", json=field_payload)
    assert res.status_code == 201, res.text
    added_field = res.json()
    print(f"[OK] Added field: {added_field['label']} (id={added_field['id']})")

    # 5. Fetch public form
    res = client.get(f"/api/v1/public/forms/{form_id}")
    assert res.status_code == 200, res.text
    pub_form = res.json()
    print(f"[OK] Public form retrieved: {pub_form['title']}, fields count = {len(pub_form['fields'])}")

    # 6. Submit a response
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
            answers[f_id] = "tester@example.com"
        elif f["field_type"] == "number":
            answers[f_id] = 10
        else:
            answers[f_id] = "Great experience overall!"

    submit_res = client.post(f"/api/v1/public/forms/{form_id}/submit", json={"answers": answers})
    assert submit_res.status_code == 201, submit_res.text
    print("[OK] Form submitted successfully:", submit_res.json())

    # 7. Get analytics
    analytics_res = client.get(f"/api/v1/forms/{form_id}/analytics")
    assert analytics_res.status_code == 200, analytics_res.text
    analytics = analytics_res.json()
    assert analytics["total_responses"] >= 1
    print("[OK] Analytics validated: total responses =", analytics["total_responses"])

    # 8. Export CSV
    csv_res = client.get(f"/api/v1/forms/{form_id}/export")
    assert csv_res.status_code == 200, csv_res.text
    assert "Submission ID" in csv_res.text
    print("[OK] CSV export verified! Header:", csv_res.text.splitlines()[0])

    # 9. List forms
    list_res = client.get("/api/v1/forms")
    assert list_res.status_code == 200, list_res.text
    forms_list = list_res.json()
    assert len(forms_list) >= 1
    print(f"[OK] Forms listing verified: found {len(forms_list)} form(s)")

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY! :)")

if __name__ == "__main__":
    run_test()
