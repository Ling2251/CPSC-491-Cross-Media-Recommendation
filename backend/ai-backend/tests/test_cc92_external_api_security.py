"""CC9.2: offline verification of external provider failure handling."""
import pytest
import requests
from app.services.public_data import OpenLibraryCollector, TVMazeCollector

class Response:
    status_code = 200
    headers = {}
    def __init__(self, payload): self.payload = payload
    def raise_for_status(self): pass
    def json(self): return self.payload

class Session:
    def __init__(self, outcomes): self.outcomes = iter(outcomes); self.calls = []
    def get(self, url, **kwargs):
        self.calls.append(kwargs)
        outcome = next(self.outcomes)
        if isinstance(outcome, Exception): raise outcome
        return outcome

@pytest.mark.parametrize('collector', [TVMazeCollector, OpenLibraryCollector])
def test_timeout_retries_then_fails_safely(collector):
    session = Session([requests.Timeout('timeout')] * 3)
    instance = collector(session=session, max_attempts=3, sleep_fn=lambda _: None)
    with pytest.raises(requests.Timeout): instance.collect()
    assert len(session.calls) == 3
    assert all(c['timeout'] == 10 for c in session.calls)

@pytest.mark.parametrize('collector', [TVMazeCollector, OpenLibraryCollector])
def test_unavailable_provider_fails_after_bounded_retries(collector):
    session = Session([requests.ConnectionError('unavailable')] * 2)
    instance = collector(session=session, max_attempts=2, sleep_fn=lambda _: None)
    with pytest.raises(requests.ConnectionError): instance.collect()
    assert len(session.calls) == 2

@pytest.mark.parametrize('collector,payload', [
    (TVMazeCollector, {'not': 'list'}),
    (OpenLibraryCollector, ['not', 'object']),
    (OpenLibraryCollector, {'docs': 'not a list'}),
])
def test_bad_top_level_payload_rejected(collector, payload):
    instance = collector(session=Session([Response(payload)]))
    with pytest.raises(ValueError, match='Invalid'): instance.collect()

@pytest.mark.parametrize('collector,payload', [
    (TVMazeCollector, [None, {'show': 'invalid'}]),
    (OpenLibraryCollector, {'docs': [None, 'invalid']}),
])
def test_bad_entries_skipped_without_crash(collector, payload):
    instance = collector(session=Session([Response(payload)]))
    assert instance.collect() == []

@pytest.mark.parametrize('collector', [TVMazeCollector, OpenLibraryCollector])
def test_bad_json_rejected_without_raw_provider_exception(collector):
    class BadJSON(Response):
        def json(self): raise ValueError('sensitive provider detail')
    instance = collector(session=Session([BadJSON(None)]))
    with pytest.raises(ValueError, match='Invalid JSON from external media provider'):
        instance.collect()
