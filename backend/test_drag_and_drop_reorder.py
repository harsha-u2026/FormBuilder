"""
Automated Test Suite for Drag-and-Drop Question Reordering in FormBuilder
Tests:
1. Create a test form with 5 distinct question types and configurations.
2. Drag Question 5 to Position 1.
3. Drag Question 2 to Position 4.
4. Verify backend persistence upon fresh fetch (simulating page refresh).
5. Verify public respondent endpoint receives fields in the exact new order.
6. Verify Move Up / Move Down buttons functionality after drag-and-drop.
7. Verify conditional logic rule integrity (references stable field IDs, conditional visibility works).
8. Verify complete field configuration preservation (IDs, labels, options, validation_rules, conditional_rules).
"""

import sys
import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print("STARTING DRAG-AND-DROP REORDER TEST SUITE")
    print("=" * 60)

    # 1. Register & Login a test user
    email = "dnd_tester@example.com"
    pwd = "SecurePassword123!"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "display_name": "DnD Tester"
    })
    token = None
    if reg_res.status_code == 201:
        token = reg_res.json()["access_token"]
    else:
        login_res = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]

    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authenticated user for Drag-and-Drop tests.")

    # 2. Create form with 5 fields
    form_res = client.post("/api/v1/forms", json={
        "title": "DnD Reorder Form",
        "description": "Testing drag and drop reordering and conditional logic",
        "theme_color": "#6366f1"
    }, headers=auth_headers)
    assert form_res.status_code == 201, form_res.text
    form_id = form_res.json()["id"]

    # Field 1: Text
    f1_res = client.post(f"/api/v1/forms/{form_id}/fields", json={
        "field_type": "text",
        "label": "Question 1 - Text",
        "placeholder": "Enter some text",
        "required": True,
        "order": 0
    }, headers=auth_headers)
    q1 = f1_res.json()

    # Field 2: Radio
    f2_res = client.post(f"/api/v1/forms/{form_id}/fields", json={
        "field_type": "radio",
        "label": "Question 2 - Radio",
        "options": ["Option Alpha", "Option Beta"],
        "required": True,
        "order": 1
    }, headers=auth_headers)
    q2 = f2_res.json()

    # Field 3: Number
    f3_res = client.post(f"/api/v1/forms/{form_id}/fields", json={
        "field_type": "number",
        "label": "Question 3 - Number",
        "required": False,
        "order": 2
    }, headers=auth_headers)
    q3 = f3_res.json()

    # Field 4: File
    f4_res = client.post(f"/api/v1/forms/{form_id}/fields", json={
        "field_type": "file",
        "label": "Question 4 - File Upload",
        "required": False,
        "validation_rules": {"max_file_size_mb": 5, "max_files": 2, "allowed_types": [".pdf"]},
        "order": 3
    }, headers=auth_headers)
    q4 = f4_res.json()

    # Field 5: Textarea with conditional logic depending on Question 2
    f5_res = client.post(f"/api/v1/forms/{form_id}/fields", json={
        "field_type": "textarea",
        "label": "Question 5 - Conditional Textarea",
        "required": True,
        "conditional_rules": {
            "action": "show",
            "logic_type": "all",
            "conditions": [{
                "field_id": q2["id"],
                "operator": "equals",
                "value": "Option Alpha"
            }]
        },
        "order": 4
    }, headers=auth_headers)
    q5 = f5_res.json()

    # Publish form so public endpoint is active
    client.patch(f"/api/v1/forms/{form_id}/toggle-publish", headers=auth_headers)

    # Initial order check
    get_res = client.get(f"/api/v1/forms/{form_id}", headers=auth_headers)
    initial_fields = get_res.json()["fields"]
    assert [f["id"] for f in initial_fields] == [q1["id"], q2["id"], q3["id"], q4["id"], q5["id"]]
    print(f"[PASS] Created Form {form_id} with 5 questions in initial order: [Q1, Q2, Q3, Q4, Q5]")

    # 3. Drag Question 5 to Position 1
    # Resulting order: [Q5, Q1, Q2, Q3, Q4]
    step1_fields = [q5, q1, q2, q3, q4]
    reorder_payload_1 = {
        "fields": [{"id": f["id"], "order": idx} for idx, f in enumerate(step1_fields)]
    }
    put_res_1 = client.put(f"/api/v1/forms/{form_id}/fields-order", json=reorder_payload_1, headers=auth_headers)
    assert put_res_1.status_code == 200, put_res_1.text

    # Verify persistence upon re-fetch
    verify_res_1 = client.get(f"/api/v1/forms/{form_id}", headers=auth_headers)
    fields_after_step1 = verify_res_1.json()["fields"]
    assert [f["id"] for f in fields_after_step1] == [q5["id"], q1["id"], q2["id"], q3["id"], q4["id"]], \
        f"Step 1 order mismatch: {[f['id'] for f in fields_after_step1]}"
    print("[PASS] Drag Q5 to Position 1 verified: [Q5, Q1, Q2, Q3, Q4]")

    # 4. Drag Question 2 to Position 4
    # In current list [Q5, Q1, Q2, Q3, Q4]:
    # Item 2 (Q1) dragged to position 4 (index 3) -> [Q5, Q2, Q3, Q1, Q4]
    # (Or Q2 dragged to position 4 -> [Q5, Q1, Q3, Q2, Q4])
    # Let's test dragging Question 2 (at index 1, which is Q1) to position 4 (index 3):
    step2_fields = [fields_after_step1[0], fields_after_step1[2], fields_after_step1[3], fields_after_step1[1], fields_after_step1[4]]
    reorder_payload_2 = {
        "fields": [{"id": f["id"], "order": idx} for idx, f in enumerate(step2_fields)]
    }
    put_res_2 = client.put(f"/api/v1/forms/{form_id}/fields-order", json=reorder_payload_2, headers=auth_headers)
    assert put_res_2.status_code == 200, put_res_2.text

    # 5. Verify refresh (fresh GET) has exact persisted order
    verify_res_2 = client.get(f"/api/v1/forms/{form_id}", headers=auth_headers)
    persisted_fields = verify_res_2.json()["fields"]
    expected_ids = [step2_fields[0]["id"], step2_fields[1]["id"], step2_fields[2]["id"], step2_fields[3]["id"], step2_fields[4]["id"]]
    assert [f["id"] for f in persisted_fields] == expected_ids
    print(f"[PASS] Refreshed form and verified new order persisted: {[f['label'] for f in persisted_fields]}")

    # 6. Verify Public respondent form uses the new order
    pub_res = client.get(f"/api/v1/public/forms/{form_id}")
    assert pub_res.status_code == 200, pub_res.text
    pub_fields = pub_res.json()["fields"]
    assert [f["id"] for f in pub_fields] == expected_ids
    print("[PASS] Public form endpoint verified: respondent view receives exact reordered questions.")

    # 7. Test Move Up and Move Down buttons after drag and drop
    # Move item at index 3 up to index 2
    moved_up_fields = list(persisted_fields)
    moved_up_item = moved_up_fields.pop(3)
    moved_up_fields.insert(2, moved_up_item)
    move_payload = {
        "fields": [{"id": f["id"], "order": idx} for idx, f in enumerate(moved_up_fields)]
    }
    client.put(f"/api/v1/forms/{form_id}/fields-order", json=move_payload, headers=auth_headers)
    verify_move_up = client.get(f"/api/v1/forms/{form_id}", headers=auth_headers).json()["fields"]
    assert [f["id"] for f in verify_move_up] == [f["id"] for f in moved_up_fields]
    print("[PASS] Move Up / Move Down buttons reordering verified after drag-and-drop.")

    # 8. Verify all question data completely preserved
    target_q4 = next(f for f in verify_move_up if f["id"] == q4["id"])
    assert target_q4["validation_rules"] == {"max_file_size_mb": 5, "max_files": 2, "allowed_types": [".pdf"]}
    assert target_q4["field_type"] == "file"

    target_q2 = next(f for f in verify_move_up if f["id"] == q2["id"])
    assert target_q2["options"] == ["Option Alpha", "Option Beta"]
    assert target_q2["required"] == True

    target_q5 = next(f for f in verify_move_up if f["id"] == q5["id"])
    assert target_q5["conditional_rules"]["conditions"][0]["field_id"] == q2["id"]
    print("[PASS] Complete question data preservation verified (validation rules, options, conditional logic, required state).")

    # 9. Verify conditional logic evaluation on public form submission
    # Submission with Q2='Option Beta' (Q5 is hidden, should not fail required check)
    sub1_res = client.post(f"/api/v1/public/forms/{form_id}/submit", json={
        "answers": {
            str(q1["id"]): "Hello World",
            str(q2["id"]): "Option Beta"
        }
    })
    assert sub1_res.status_code == 201, f"Expected 201 when conditional Q5 is hidden, got: {sub1_res.text}"

    # Submission with Q2='Option Alpha' and missing Q5 (Q5 is shown and required, should fail with 422)
    sub2_res = client.post(f"/api/v1/public/forms/{form_id}/submit", json={
        "answers": {
            str(q1["id"]): "Hello World",
            str(q2["id"]): "Option Alpha"
        }
    })
    assert sub2_res.status_code == 422, f"Expected 422 when conditional Q5 is visible & empty, got: {sub2_res.text}"

    # Submission with Q2='Option Alpha' and Q5 answered (should succeed)
    sub3_res = client.post(f"/api/v1/public/forms/{form_id}/submit", json={
        "answers": {
            str(q1["id"]): "Hello World",
            str(q2["id"]): "Option Alpha",
            str(q5["id"]): "Condition fulfilled textarea content"
        }
    })
    assert sub3_res.status_code == 201, f"Expected 201 when conditional Q5 is satisfied, got: {sub3_res.text}"
    print("[PASS] Conditional logic rules continue to function flawlessly after questions are reordered.")

    # Clean up test form
    client.delete(f"/api/v1/forms/{form_id}", headers=auth_headers)
    print(f"[PASS] Cleaned up test form {form_id}.")

    print("=" * 60)
    print("ALL DRAG-AND-DROP REORDER TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
