"""Gemini module tests. A fake client stands in for Gemini: no key, no network.

The one live test is opt-in: set RUN_LIVE_GEMINI=1 with a real key in .env.
"""

import copy
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from google.genai import errors

from backend.ai import service
from backend.api.config import get_settings
from backend.api.errors import UpstreamError
from backend.api.main import app
from backend.api.schemas import ExplainRequest, ParseRequest, Prefs, RouteResponse

SAMPLE = json.loads(
    (Path(__file__).resolve().parents[2] / "docs/samples/route_response.sample.json").read_text()
)
FAKE_KEY = "fake-test-key-123"


class FakeGemini:
    """Records each call and answers with `reply`: a string, or an exception to raise."""

    def __init__(self):
        self.reply = ""
        self.calls = []
        self.clients = 0

    def client(self, api_key, http_options):
        self.clients += 1
        return SimpleNamespace(models=SimpleNamespace(generate_content=self.generate_content))

    def generate_content(self, model, contents, config):
        self.calls.append(SimpleNamespace(model=model, contents=contents, config=config))
        if isinstance(self.reply, Exception):
            raise self.reply
        return SimpleNamespace(text=self.reply)


@pytest.fixture
def gemini(monkeypatch):
    fake = FakeGemini()
    monkeypatch.setattr(service.genai, "Client", fake.client)
    monkeypatch.setattr(
        service,
        "get_settings",
        lambda: SimpleNamespace(gemini_api_key=FAKE_KEY, gemini_model="fake-model"),
    )
    return fake


def explain_req(change=None, **prefs):
    route = copy.deepcopy(SAMPLE)
    if change:
        change(route)
    return ExplainRequest(route=RouteResponse(**route), prefs=Prefs(**prefs))


def not_much_cooler(route):
    route["coolest"].update(shade_pct=27, sun_exposed_s=470)


def much_longer(route):
    route["coolest"].update(duration_s=1500, distance_m=2000)


def same_route(route):
    route["coolest"] = {**route["fastest"], "kind": "coolest"}


# parse_request


def test_parse_reads_the_model_json(gemini):
    gemini.reply = json.dumps(
        {"depart_time": "15:00", "destination_text": None, "avoid_stairs": True,
         "heat_sensitivity": "normal"}
    )
    r = service.parse_request(ParseRequest(text="3 PM, avoid stairs"))
    assert r.depart_time == "15:00"
    assert r.destination_text is None
    assert r.prefs.avoid_stairs is True
    assert r.prefs.heat_sensitivity == "normal"


def test_parse_asks_for_json_with_a_schema_at_zero_temperature(gemini):
    gemini.reply = json.dumps({"depart_time": None, "destination_text": "Mill Ave",
                               "avoid_stairs": False, "heat_sensitivity": "normal"})
    service.parse_request(ParseRequest(text="Walk to Mill Ave"))
    call = gemini.calls[0]
    assert call.model == "fake-model"
    assert call.contents == "Walk to Mill Ave"
    assert call.config.temperature == 0
    assert call.config.response_mime_type == "application/json"
    assert set(call.config.response_json_schema["required"]) == {
        "depart_time", "leave_in_minutes", "destination_text", "avoid_stairs",
        "stated_age", "heat_sensitivity",
    }


def test_parse_replaces_malformed_values_with_defaults(gemini):
    gemini.reply = json.dumps(
        {"depart_time": "3pm", "destination_text": "   ", "avoid_stairs": "yes",
         "heat_sensitivity": "extreme"}
    )
    r = service.parse_request(ParseRequest(text="asdf"))
    assert r.depart_time is None
    assert r.destination_text is None
    assert r.prefs.avoid_stairs is False
    assert r.prefs.heat_sensitivity == "normal"


def test_parse_trims_the_destination(gemini):
    gemini.reply = json.dumps({"depart_time": "14:30", "destination_text": "  Mill Ave ",
                               "avoid_stairs": False, "heat_sensitivity": "high"})
    r = service.parse_request(ParseRequest(text="overheat easily, 2:30 to Mill Ave"))
    assert (r.depart_time, r.destination_text, r.prefs.heat_sensitivity) == (
        "14:30", "Mill Ave", "high"
    )


def model_json(**fields):
    base = {"depart_time": None, "leave_in_minutes": None, "destination_text": None,
            "avoid_stairs": False, "stated_age": None, "heat_sensitivity": "normal"}
    return json.dumps({**base, **fields})


@pytest.mark.parametrize(
    "model_fields, expected",
    [
        ({"leave_in_minutes": 60}, "15:10"),  # "leave in an hour"
        ({"leave_in_minutes": 0}, "14:10"),  # "leave now"
        ({"leave_in_minutes": 600}, "00:10"),  # wraps past midnight
        ({"leave_in_minutes": 60, "depart_time": "09:00"}, "09:00"),  # clock time wins
        ({"leave_in_minutes": -30}, None),
        ({"leave_in_minutes": 5000}, None),
        ({"leave_in_minutes": "60"}, None),
    ],
)
def test_relative_time_uses_the_tempe_clock(gemini, monkeypatch, model_fields, expected):
    monkeypatch.setattr(
        service, "_now", lambda: datetime(2026, 11, 14, 14, 10, tzinfo=service.TEMPE_TZ)
    )
    gemini.reply = model_json(**model_fields)
    assert service.parse_request(ParseRequest(text="leave in an hour")).depart_time == expected


def test_tempe_clock_is_utc_minus_7():
    assert service._now().utcoffset() == timedelta(hours=-7)


@pytest.mark.parametrize(
    "text, model_fields, expected",
    [
        ("I'm 78", {"stated_age": 78}, "high"),
        ("I'm 30", {"stated_age": 30}, "normal"),
        ("I'm old", {}, "normal"),
        ("I'm 65", {"stated_age": 65}, "high"),
        ("I'm 64", {"stated_age": 64}, "normal"),
        ("I'm 30 and have diabetes", {"stated_age": 30, "heat_sensitivity": "high"}, "high"),
        ("I'm 70 and heat doesn't bother me", {"stated_age": 70, "heat_sensitivity": "low"}, "high"),
    ],
)
def test_age_rule_is_decided_by_code(gemini, text, model_fields, expected):
    gemini.reply = model_json(**model_fields)
    assert service.parse_request(ParseRequest(text=text)).prefs.heat_sensitivity == expected


@pytest.mark.parametrize("age", ["78", 300, 0, -5, True, 70.5])
def test_malformed_age_is_ignored(gemini, age):
    gemini.reply = model_json(stated_age=age)
    assert service.parse_request(ParseRequest(text="I'm old")).prefs.heat_sensitivity == "normal"


def test_age_is_not_returned_to_the_app(gemini):
    gemini.reply = model_json(stated_age=78)
    r = service.parse_request(ParseRequest(text="I'm 78"))
    assert "78" not in r.model_dump_json()


@pytest.mark.parametrize("reply", ["not json", "[1, 2]", '"just a string"'])
def test_parse_rejects_unreadable_answers(gemini, reply):
    gemini.reply = reply
    with pytest.raises(UpstreamError, match="unreadable"):
        service.parse_request(ParseRequest(text="3 PM"))


# explain_route: verdicts and wording decided by code


@pytest.mark.parametrize(
    "change, verdict",
    [
        (None, "clearly cooler"),
        (not_much_cooler, "not much cooler"),
        (much_longer, "cooler but much longer"),
        (same_route, "same route"),
    ],
)
def test_verdict_is_decided_by_code(change, verdict):
    assert service._route_facts(explain_req(change))["verdict"].startswith(verdict)


def test_facts_from_the_sample_route():
    facts = service._route_facts(explain_req())
    assert facts["fastest_minutes"] == 11
    assert facts["cooler_minutes"] == 12
    assert facts["extra_minutes"] == 1
    assert facts["fastest_shade_pct"] == 22
    assert facts["cooler_shade_pct"] == 64
    assert facts["fastest_sun_minutes"] == 8
    assert facts["cooler_sun_minutes"] == 4
    assert facts["sun_minutes_saved"] == 4


@pytest.mark.parametrize("change", [None, not_much_cooler, much_longer, same_route])
def test_template_text_cites_only_input_numbers(change):
    req = explain_req(change)
    facts = service._route_facts(req)
    text = service._template_explanation(facts)
    assert service._is_safe(text, service._allowed_numbers(req, facts))


def test_template_is_honest_when_not_much_cooler():
    text = service._template_explanation(service._route_facts(explain_req(not_much_cooler)))
    assert "not much cooler" in text


def test_template_names_the_cost_when_much_longer():
    text = service._template_explanation(service._route_facts(explain_req(much_longer)))
    assert "14 minutes longer" in text


# explain_route: checking the model's text


def test_explain_keeps_model_text_that_uses_input_numbers(gemini):
    gemini.reply = (
        "The cooler route takes 12 minutes, only 1 minute more than the fastest.\n"
        "It is 64% shaded and saves about 4 minutes in direct sun."
    )
    text = service.explain_route(explain_req()).text
    assert text == (
        "The cooler route takes 12 minutes, only 1 minute more than the fastest. "
        "It is 64% shaded and saves about 4 minutes in direct sun."
    )
    assert "64" in gemini.calls[0].contents


@pytest.mark.parametrize(
    "reply",
    [
        "The cooler route is 42% cooler.",  # number not in the input
        "It is 10 degrees cooler in the shade.",  # made-up temperature
        "Take the cooler route and see a doctor if you feel dizzy.",  # medical advice
        "The cooler route is 64% shaded and saves",  # cut off mid-sentence
        "The cooler route has 64 shade_pct.",  # leaked field name
        "The cooler route has 4 sun minutes.",  # leaked field wording
        "Because you're 78, take the cooler route with 64% shade.",  # age
        "Because you're sensitive to heat, the 64% shaded route is better.",
        "As someone 78 years old, the cooler route is better.",
        "For elderly walkers the cooler route is 64% shaded.",
    ],
)
def test_explain_falls_back_to_template_on_bad_model_text(gemini, reply):
    gemini.reply = reply
    req = explain_req()
    text = service.explain_route(req).text
    assert text == service._template_explanation(service._route_facts(req))


# Errors: every Gemini failure becomes a short UpstreamError without the key.


def test_missing_key_raises_without_calling_gemini(monkeypatch, gemini):
    monkeypatch.setattr(
        service, "get_settings", lambda: SimpleNamespace(gemini_api_key="", gemini_model="m")
    )
    with pytest.raises(UpstreamError, match="not configured"):
        service.parse_request(ParseRequest(text="3 PM"))
    assert gemini.clients == 0


def test_missing_model_raises(monkeypatch, gemini):
    monkeypatch.setattr(
        service, "get_settings", lambda: SimpleNamespace(gemini_api_key=FAKE_KEY, gemini_model="")
    )
    with pytest.raises(UpstreamError, match="not configured"):
        service.explain_route(explain_req())


def api_error(code):
    cls = errors.ClientError if code < 500 else errors.ServerError
    return cls(code, {"error": {"code": code, "message": f"key {FAKE_KEY} failed"}})


@pytest.mark.parametrize(
    "failure, message",
    [
        (api_error(429), "rate limit"),
        (api_error(400), "rejected"),
        (api_error(403), "rejected"),
        (api_error(503), "unavailable"),
        (httpx.ReadTimeout("timed out"), "timed out"),
        (httpx.ConnectError("no route"), "Could not reach"),
    ],
)
def test_gemini_failures_become_safe_upstream_errors(gemini, failure, message):
    gemini.reply = failure
    for call in (
        lambda: service.parse_request(ParseRequest(text="3 PM")),
        lambda: service.explain_route(explain_req()),
    ):
        with pytest.raises(UpstreamError, match=message) as info:
            call()
        assert FAKE_KEY not in str(info.value)
        assert info.value.__suppress_context__  # raw upstream error is not chained


def test_empty_answer_raises(gemini):
    gemini.reply = ""
    with pytest.raises(UpstreamError, match="empty"):
        service.explain_route(explain_req())


def test_api_returns_502_without_the_key_or_a_stack_trace(gemini):
    gemini.reply = api_error(429)
    client = TestClient(app)
    for r in (
        client.post("/parse", json={"text": "3 PM, avoid stairs"}),
        client.post("/explain", json={"route": SAMPLE, "prefs": {}}),
    ):
        assert r.status_code == 502
        assert r.json() == {"detail": "Gemini rate limit reached, try again shortly"}
        assert FAKE_KEY not in r.text


# Opt-in live check against the real API.


@pytest.mark.skipif(
    os.getenv("RUN_LIVE_GEMINI") != "1" or not get_settings().gemini_api_key,
    reason="set RUN_LIVE_GEMINI=1 and GEMINI_API_KEY to call the real Gemini API",
)
def test_live_gemini_parse_and_explain():
    r = service.parse_request(ParseRequest(text="3 PM, avoid stairs"))
    assert r.depart_time == "15:00"
    assert r.prefs.avoid_stairs is True

    req = explain_req()
    text = service.explain_route(req).text
    assert service._is_safe(text, service._allowed_numbers(req, service._route_facts(req)))
