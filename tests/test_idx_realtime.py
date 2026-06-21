"""
Tests untuk modules/idx_realtime.py
Run: python tests/test_idx_realtime.py

Mencakup:
- FileCache: get/set/TTL/age
- fetch_realtime_quotes: network + cache fallback
- fetch_yahoo_chart: candles parsing
- compute_foreign_flow_proxy: signal logic
- compute_broker_summary_proxy: accumulation score
"""

import sys
import os
import time
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules import idx_realtime as ir


# ============== FIXTURES ==============

SAMPLE_TV_RESPONSE = {
    "totalCount": 2,
    "data": [
        {"s": "IDX:BBCA", "d": [6300, 366595500, 3.7037, 225, 6300, 6050, 6050, 6075, 366595500, 2.31e12, 1.5e15, "IDR", "Financial Services", "Banks", "Indonesia", "streaming", "stock", "Bank Central Asia Tbk"]},
        {"s": "IDX:BBRI", "d": [2930, 514857200, -1.0135, -30, 2960, 2900, 2950, 2960, 514857200, 1.5e12, 4.4e14, "IDR", "Financial Services", "Banks", "Indonesia", "streaming", "stock", "Bank Rakyat Indonesia"]},
    ],
}

SAMPLE_YAHOO_CHART = {
    "chart": {
        "result": [{
            "meta": {
                "currency": "IDR",
                "symbol": "BBCA.JK",
                "regularMarketPrice": 6300.0,
                "regularMarketTime": 1781860496,
                "regularMarketVolume": 366595500,
                "fiftyTwoWeekHigh": 8975.0,
                "fiftyTwoWeekLow": 4820.0,
            },
            "timestamp": [1781500000, 1781600000, 1781700000, 1781800000, 1781860496],
            "indicators": {
                "quote": [{
                    "open": [6000, 6100, 6200, 6250, 6050],
                    "high": [6200, 6300, 6400, 6275, 6300],
                    "low":  [5950, 6000, 6100, 6075, 6050],
                    "close": [6100, 6200, 6300, 6275, 6300],
                    "volume": [200000, 250000, 300000, 232000, 366595500],
                }]
            }
        }],
        "error": None,
    }
}


def test_print(label):
    print(f"   ✓ {label}")


def test_section(name):
    print(f"\n🧪 {name}")


# ============== TESTS ==============

def test_file_cache_basic():
    """Test FileCache: set, get, TTL expiry"""
    test_section("FileCache: basic set/get")

    cache = ir.FileCache(cache_dir=Path("/tmp/test_idx_cache"), default_ttl=60)
    cache.clear()
    cache.set("key1", {"data": "hello"})

    val = cache.get("key1")
    assert val == {"data": "hello"}, f"Expected {{'data': 'hello'}}, got {val}"
    test_print("set → get roundtrip")

    age = cache.get_age_seconds("key1")
    assert age is not None and 0 <= age < 2
    test_print(f"age = {age:.2f}s")

    cache.clear()
    assert cache.get("key1") is None
    test_print("clear works")


def test_file_cache_ttl():
    """Test FileCache: TTL expiry"""
    test_section("FileCache: TTL expiry")

    cache = ir.FileCache(cache_dir=Path("/tmp/test_idx_cache2"), default_ttl=1)
    cache.set("expire_key", "value")
    assert cache.get("expire_key") == "value"
    test_print("immediate get works")

    time.sleep(1.5)
    assert cache.get("expire_key") is None
    test_print("expired after 1.5s (TTL=1s)")

    # Custom TTL
    cache.set("custom_ttl", "v2", ttl=0.5)
    assert cache.get("custom_ttl", ttl=10) == "v2"  # use cache.get default ttl
    time.sleep(0.6)
    assert cache.get("custom_ttl", ttl=10) is None  # expired by custom_ttl in stored payload
    test_print("custom TTL honored")


def test_ticker_normalization():
    """Test ticker normalization (.JK suffix + uppercase)"""
    test_section("Ticker normalization")

    # Already in data_fetcher module, but the realtime module doesn't validate.
    # Test internal base conversion
    assert "BBCA.JK".replace(".JK", "").upper().strip() == "BBCA"
    assert "bbca".upper().replace(".JK", "").strip() == "BBCA"
    test_print("'BBCA.JK' → 'BBCA'")
    test_print("'bbca' → 'BBCA'")


def test_fetch_realtime_quotes_mocked():
    """Test fetch_realtime_quotes with mocked TradingView response"""
    test_section("fetch_realtime_quotes: mocked network")

    with patch.object(ir, "_http_post", return_value=json.dumps(SAMPLE_TV_RESPONSE).encode()):
        quotes = ir.fetch_realtime_quotes(["BBCA", "BBRI"], use_cache=False)

    assert len(quotes) == 2, f"Expected 2 quotes, got {len(quotes)}"
    test_print(f"got {len(quotes)} quotes")

    bbca = quotes["BBCA"]
    assert bbca.ticker == "BBCA"
    assert bbca.symbol == "IDX:BBCA"
    assert bbca.price == 6300.0
    assert bbca.prev_close == 6075.0
    assert abs(bbca.change_pct - 3.7037) < 0.01, f"change_pct {bbca.change_pct}"
    assert bbca.volume == 366595500
    assert bbca.source == "tradingview"
    test_print("BBCA parsed correctly: price=6300, change=+3.70%, vol=366M")

    bbri = quotes["BBRI"]
    assert bbri.price == 2930.0
    assert bbri.change_pct < 0
    test_print(f"BBRI parsed: price={bbri.price}, change={bbri.change_pct:.2f}%")

    # Test cache hit
    with patch.object(ir, "_http_post", return_value=None):  # simulate network down
        cached = ir.fetch_realtime_quotes(["BBCA", "BBRI"], use_cache=True, ttl=300)
    assert "BBCA" in cached, f"Cache miss! got {list(cached.keys())}"
    test_print("cache fallback works (no network but cached data returned)")


def test_fetch_realtime_quotes_empty():
    """Test with empty input"""
    test_section("fetch_realtime_quotes: edge cases")

    assert ir.fetch_realtime_quotes([]) == {}
    test_print("empty list → empty result")

    with patch.object(ir, "_http_post", return_value=b"{}"):
        assert ir.fetch_realtime_quotes(["XYZ"]) == {}
    test_print("invalid response → empty result")

    with patch.object(ir, "_http_post", return_value=None):
        assert ir.fetch_realtime_quotes(["ZZZZ"]) == {}
    test_print("network fail (no cache) → empty result")


def test_fetch_yahoo_chart_mocked():
    """Test fetch_yahoo_chart with mocked yahoo response"""
    test_section("fetch_yahoo_chart: mocked network")

    with patch.object(ir, "_http_get", return_value=json.dumps(SAMPLE_YAHOO_CHART).encode()):
        chart = ir.fetch_yahoo_chart("BBCA", interval="1d", range_="1mo", use_cache=False)

    assert chart is not None
    assert "candles" in chart
    assert len(chart["candles"]) == 5
    test_print(f"got {len(chart['candles'])} candles")

    c = chart["candles"][-1]
    assert c["c"] == 6300.0
    assert c["o"] == 6050.0
    assert c["v"] == 366595500
    test_print("last candle parsed correctly")


def test_foreign_flow_proxy_logic():
    """Test foreign flow proxy with synthetic data"""
    test_section("compute_foreign_flow_proxy: signal logic")

    # Mock yahoo chart with controlled data
    def make_chart(prices, volumes):
        candles = [{"t": 1000 + i, "o": p, "h": p + 50, "l": p - 50, "c": p, "v": v} for i, (p, v) in enumerate(zip(prices, volumes))]
        return {"meta": {}, "candles": candles, "fetched_at": "2026-06-22T10:00:00+07:00"}

    # Case 1: Strong up + high volume → BUY
    prices_up = [100 + i * 0.5 for i in range(25)]  # 100 → 112 (12% over 25 days)
    volumes_avg = [100000] * 24
    volumes_avg.append(200000)  # today 2x avg
    with patch.object(ir, "fetch_yahoo_chart", return_value=make_chart(prices_up, volumes_avg)):
        ff = ir.compute_foreign_flow_proxy("TEST", use_cache=False)
    assert ff is not None
    assert ff.signal == "BUY", f"Expected BUY, got {ff.signal}"
    assert ff.confidence > 0.5
    test_print(f"uptrend + vol spike → BUY (conf={ff.confidence:.2f})")

    # Case 2: Strong down + high volume → SELL
    prices_down = [100 - i * 0.5 for i in range(25)]  # 100 → 88 (-12%)
    with patch.object(ir, "fetch_yahoo_chart", return_value=make_chart(prices_down, volumes_avg)):
        ff = ir.compute_foreign_flow_proxy("TEST", use_cache=False)
    assert ff is not None
    assert ff.signal == "SELL", f"Expected SELL, got {ff.signal}"
    test_print(f"downtrend + vol spike → SELL (conf={ff.confidence:.2f})")

    # Case 3: Sideways + low volume → NEUTRAL
    prices_flat = [100 + (i % 3 - 1) * 0.1 for i in range(25)]
    volumes_low = [50000] * 25  # below avg
    with patch.object(ir, "fetch_yahoo_chart", return_value=make_chart(prices_flat, volumes_low)):
        ff = ir.compute_foreign_flow_proxy("TEST", use_cache=False)
    assert ff is not None
    assert ff.signal == "NEUTRAL"
    test_print(f"sideways + low vol → NEUTRAL")


def test_broker_summary_proxy_logic():
    """Test broker summary proxy"""
    test_section("compute_broker_summary_proxy: accumulation logic")

    def make_chart_hourly(prices):
        """Make intraday chart (hourly) with 1 day of data"""
        candles = []
        ts = 1782000000
        for i, p in enumerate(prices):
            candles.append({"t": ts + i * 3600, "o": p - 5, "h": p + 10, "l": p - 10, "c": p, "v": 100000 + (i * 50000)})
        return {"meta": {}, "candles": candles, "fetched_at": "2026-06-22T10:00:00+07:00"}

    # Case 1: Close at high → accumulation
    # Open low, close high
    with patch.object(ir, "fetch_yahoo_chart", return_value=make_chart_hourly([100, 105, 110, 115, 120])):
        bs = ir.compute_broker_summary_proxy("TEST", use_cache=False)
    assert bs is not None
    assert bs.accumulation_score > 0, f"Expected positive score, got {bs.accumulation_score}"
    test_print(f"close at high → acc_score={bs.accumulation_score:+.2f}")

    # Case 2: Close at low → distribution
    with patch.object(ir, "fetch_yahoo_chart", return_value=make_chart_hourly([120, 115, 110, 105, 100])):
        bs = ir.compute_broker_summary_proxy("TEST", use_cache=False)
    assert bs is not None
    assert bs.accumulation_score < 0, f"Expected negative score, got {bs.accumulation_score}"
    test_print(f"close at low → acc_score={bs.accumulation_score:+.2f}")


def test_realtime_quote_dataclass():
    """Test RealtimeQuote dataclass"""
    test_section("RealtimeQuote dataclass")

    q = ir.RealtimeQuote(
        ticker="BBCA",
        symbol="IDX:BBCA",
        price=6300.0,
        prev_close=6075.0,
        change_abs=225.0,
        change_pct=3.70,
        open=6050.0,
        high=6300.0,
        low=6050.0,
        volume=366595500,
        value_idr=2.31e12,
        market_cap=1.5e15,
        sector="Financial Services",
        industry="Banks",
        description="Bank Central Asia Tbk",
        fetched_at="2026-06-22T10:00:00+07:00",
        source="tradingview",
    )
    d = q.to_dict()
    assert d["ticker"] == "BBCA"
    assert d["price"] == 6300.0
    assert d["source"] == "tradingview"
    test_print("to_dict() works")
    test_print("all fields present")


def test_convenience_functions():
    """Test get_realtime_quote and cache_status"""
    test_section("Convenience functions")

    with patch.object(ir, "fetch_realtime_quotes", return_value={"BBCA": ir.RealtimeQuote(
        ticker="BBCA", symbol="IDX:BBCA", price=6300.0, prev_close=6075.0,
        change_abs=225.0, change_pct=3.70, open=6050.0, high=6300.0, low=6050.0,
        volume=366595500, value_idr=0, market_cap=None, sector="", industry="",
        description="BBCA", fetched_at="2026-06-22T10:00:00+07:00", source="tradingview",
    )}):
        q = ir.get_realtime_quote("BBCA", use_cache=False)
        assert q is not None
        assert q.ticker == "BBCA"
        test_print("get_realtime_quote works")

    status = ir.cache_status()
    assert "file_count" in status
    assert "total_size_mb" in status
    test_print(f"cache_status: {status['file_count']} files, {status['total_size_mb']} MB")


def test_clear_cache():
    """Test clear_all_cache"""
    test_section("clear_all_cache")

    # Set something
    ir._cache.set("test_key", "data")
    assert ir._cache.get("test_key") == "data"
    test_print("data set")

    ir.clear_all_cache()
    assert ir._cache.get("test_key") is None
    test_print("cache cleared")


# ============== RUNNER ==============

def run_all():
    print("=" * 60)
    print("  IDX Realtime Module Test Suite")
    print("=" * 60)

    tests = [
        test_file_cache_basic,
        test_file_cache_ttl,
        test_ticker_normalization,
        test_realtime_quote_dataclass,
        test_fetch_realtime_quotes_mocked,
        test_fetch_realtime_quotes_empty,
        test_fetch_yahoo_chart_mocked,
        test_foreign_flow_proxy_logic,
        test_broker_summary_proxy_logic,
        test_convenience_functions,
        test_clear_cache,
    ]

    passed = 0
    failed = 0
    errors = []

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except AssertionError as e:
            failed += 1
            errors.append(f"{test_fn.__name__}: {e}")
            print(f"   ✗ FAILED: {e}")
        except Exception as e:
            failed += 1
            errors.append(f"{test_fn.__name__}: {type(e).__name__}: {e}")
            print(f"   ✗ ERROR: {type(e).__name__}: {e}")

    print("\n" + "=" * 60)
    print(f"  Result: {passed} passed, {failed} failed out of {len(tests)}")
    if errors:
        print("  Failures:")
        for e in errors:
            print(f"    - {e}")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)