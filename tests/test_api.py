import copy
from fastapi.testclient import TestClient

import src.app as app_module

client = TestClient(app_module.app)

# Snapshot of original activities so each test can reset state
_original_activities = copy.deepcopy(app_module.activities)


def setup_function():
    # Reset in-memory activities before each test
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(_original_activities))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_get():
    email = "tester@example.com"
    # Use encoded path for activity with space
    resp = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert resp.status_code == 200
    assert email in app_module.activities["Chess Club"]["participants"]

    # Ensure GET /activities reflects the change
    resp2 = client.get("/activities")
    assert resp2.status_code == 200
    assert email in resp2.json()["Chess Club"]["participants"]


def test_signup_duplicate():
    email = "dup@example.com"
    r1 = client.post(f"/activities/Programming%20Class/signup?email={email}")
    assert r1.status_code == 200
    r2 = client.post(f"/activities/Programming%20Class/signup?email={email}")
    assert r2.status_code == 400


def test_unregister():
    email = "remove@example.com"
    client.post(f"/activities/Gym%20Class/signup?email={email}")
    r = client.delete(f"/activities/Gym%20Class/unregister?email={email}")
    assert r.status_code == 200
    assert email not in app_module.activities["Gym Class"]["participants"]


def test_unregister_not_found():
    r = client.delete("/activities/Chess%20Club/unregister?email=doesnotexist@example.com")
    assert r.status_code == 404
