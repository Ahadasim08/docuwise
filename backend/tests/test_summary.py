from app.services import summary


def test_empty_chunks():
    """Empty chunks list should return empty string."""
    result = summary.summarize_chunks([])
    assert result == ""


def test_single_chunk(monkeypatch):
    """Single chunk should call generate once with appropriate prompt."""
    class FakeProvider:
        def generate(self, prompt: str) -> str:
            return "single summary"

    monkeypatch.setattr(summary, "get_provider", lambda: FakeProvider())
    result = summary.summarize_chunks(["chunk1"])
    assert result == "single summary"


def test_map_reduce(monkeypatch):
    """Multiple chunks should use map-reduce: summarize each, then combine."""
    call_count = [0]

    class FakeProvider:
        def generate(self, prompt: str) -> str:
            call_count[0] += 1
            if call_count[0] <= 2:
                return f"summary{call_count[0]}"
            return "combined summary"

    monkeypatch.setattr(summary, "get_provider", lambda: FakeProvider())
    result = summary.summarize_chunks(["chunk1", "chunk2"])

    # Should be called 3 times: 2 for map, 1 for reduce
    assert call_count[0] == 3
    assert result == "combined summary"
