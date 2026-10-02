import sys
from fastapi.testclient import TestClient
from app.main import app

def test_production_spa():
    client = TestClient(app)

    # 1. Root SPA test
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.status_code}"
    assert '<div id="root">' in res.text, "index.html not returned at root"
    print("[OK] GET / serves frontend index.html")

    # 2. Public query parameter route
    res = client.get("/?public=19")
    assert res.status_code == 200
    assert '<div id="root">' in res.text
    print("[OK] GET /?public=19 serves frontend index.html")

    # 3. Path-based public survey route (fallback)
    res = client.get("/public/19")
    assert res.status_code == 200
    assert '<div id="root">' in res.text
    print("[OK] GET /public/19 fallback serves frontend index.html")

    # 4. Short public survey route (fallback)
    res = client.get("/p/19")
    assert res.status_code == 200
    assert '<div id="root">' in res.text
    print("[OK] GET /p/19 fallback serves frontend index.html")

    # 5. Builder deep link route (fallback)
    res = client.get("/builder")
    assert res.status_code == 200
    assert '<div id="root">' in res.text
    print("[OK] GET /builder fallback serves frontend index.html")

    # 6. Static asset test
    from pathlib import Path
    from app.main import FRONTEND_DIST_DIR
    asset_files = list((FRONTEND_DIST_DIR / "assets").glob("*.js"))
    assert len(asset_files) > 0, "No JS asset found in dist/assets"
    asset_name = asset_files[0].name
    res = client.get(f"/assets/{asset_name}")
    assert res.status_code == 200
    assert "javascript" in res.headers.get("content-type", "")
    print(f"[OK] GET /assets/{asset_name} serves static JS bundle")

    # 7. Unmatched API route returns 404 JSON, not HTML fallback
    res = client.get("/api/v1/unknown-endpoint")
    assert res.status_code == 404
    print("[OK] GET /api/v1/... correctly returns 404 without HTML fallback")

    # 8. Health check intact
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    print("[OK] GET /health intact")

    print("\n=======================================================")
    print("ALL PRODUCTION ROUTING & SPA FALLBACK TESTS PASSED :)")
    print("=======================================================")

if __name__ == "__main__":
    test_production_spa()
