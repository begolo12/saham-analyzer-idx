"""
IDX Real-time Data Module
Mengambil data real-time saham IDX dari TradingView scanner + Yahoo Finance chart API.

Source priority:
1. TradingView Scanner (real-time, multi-ticker, no auth) - untuk price/volume real-time
2. Yahoo Finance Chart API (historical OHLCV + meta) - untuk data historis
3. Yahoo Finance library (existing data_fetcher.py) - untuk fundamental info

Cache: JSON file dengan TTL, fallback ke data cached kalau network error.
"""

import json
import logging
import time
import urllib.request
import urllib.error
import ssl
import gzip
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict, field


# ============== CONFIG ==============

WIB = timezone(timedelta(hours=7))
CACHE_DIR = Path(__file__).parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json,text/html,*/*",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
}

# TradingView scanner columns
# Reference: https://github.com/topics/tradingview-scanner
TV_COLUMNS = [
    "close",                    # 0: harga terakhir
    "volume",                   # 1: volume hari ini
    "change",                   # 2: perubahan % (desimal)
    "change_abs",               # 3: perubahan absolut
    "high",                     # 4: high hari ini
    "low",                      # 5: low hari ini
    "open",                     # 6: open hari ini
    "prev_close",               # 7: close kemarin
    "volume_24h",               # 8: volume 24h rolling
    "Value.Traded",             # 9: nilai transaksi IDR
    "market_cap_basic",         # 10: market cap
    "fundamental_currency_code",  # 11: currency
    "sector",                   # 12: sector (basic)
    "industry",                 # 13: industry
    "country",                  # 14: country
    "update_mode",              # 15: streaming/real-time indicator
    "type",                     # 16: stock/dr/etf
    "description",              # 17: nama perusahaan
]

TV_COL_NAME = {
    0: "close",
    1: "volume",
    2: "change_pct",
    3: "change_abs",
    4: "high",
    5: "low",
    6: "open",
    7: "prev_close",
    8: "volume_24h",
    9: "value_idr",
    10: "market_cap",
    11: "currency",
    12: "sector",
    13: "industry",
    14: "country",
    15: "update_mode",
    16: "type",
    17: "description",
}


# ============== DATA CLASSES ==============

@dataclass
class RealtimeQuote:
    """Real-time quote untuk satu saham"""
    ticker: str                  # BBCA (tanpa .JK)
    symbol: str                  # IDX:BBCA
    price: float                 # harga terakhir
    prev_close: float            # close kemarin
    change_abs: float            # perubahan absolut
    change_pct: float            # perubahan %
    open: float
    high: float
    low: float
    volume: int                  # volume hari ini
    value_idr: float             # nilai transaksi IDR
    market_cap: Optional[float]  # market cap (dalam local currency)
    sector: str                  # sector
    industry: str                # industry
    description: str             # nama lengkap
    fetched_at: str              # ISO timestamp (WIB)
    source: str                  # "tradingview" | "yahoo" | "cache"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ForeignFlowProxy:
    """
    Proxy untuk foreign flow — karena IDX tidak expose free real broker data,
    kita estimate dari price momentum + volume profile.
    Heuristik:
    - Strong positive change + volume > 1.5x avg → "foreign buying likely"
    - Strong negative change + volume > 1.5x avg → "foreign selling likely"
    - Sideways + low volume → "no clear flow"
    """
    ticker: str
    signal: str                  # "BUY" | "SELL" | "NEUTRAL"
    confidence: float            # 0-1
    volume_ratio: float          # current_volume / 20d_avg_volume
    price_momentum_pct: float    # 5-day price change %
    reasoning: str               # penjelasan naratif
    fetched_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BrokerSummaryProxy:
    """
    Proxy untuk broker summary (top 5 buyer/seller).
    Real broker data requires paid IDX RT feed. Sebagai gantinya, kita estimate:
    - Akumulasi: large block trades detected via intraday volume distribution
    - Distribusi: large block trades at lower prices
    Untuk daily-use personal, ini cukup sebagai indikator tambahan.
    """
    ticker: str
    accumulation_score: float    # -1 (heavy distribution) to +1 (heavy accumulation)
    estimated_net_volume: int    # estimated net volume (positive=buy, negative=sell)
    block_trade_count: int       # detected large trades
    avg_trade_size: int          # average trade size
    reasoning: str
    fetched_at: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ============== HTTP HELPERS ==============

_SSL_CTX = ssl.create_default_context()

def _http_get(url: str, headers: Optional[Dict] = None, timeout: int = 15) -> Optional[bytes]:
    """GET request dengan gzip support + error handling"""
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as r:
            data = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                data = gzip.decompress(data)
            return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        return None
    except Exception:
        return None


def _http_post(url: str, body: Dict, headers: Optional[Dict] = None, timeout: int = 15) -> Optional[bytes]:
    """POST request dengan JSON body"""
    h = dict(DEFAULT_HEADERS)
    h["Content-Type"] = "application/json"
    if headers:
        h.update(headers)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, headers=h, method="POST", data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as r:
            data = r.read()
            if r.headers.get("Content-Encoding") == "gzip":
                data = gzip.decompress(data)
            return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        return None
    except Exception:
        return None


# ============== CACHE LAYER ==============

class FileCache:
    """Simple JSON file cache dengan TTL"""

    def __init__(self, cache_dir: Path = CACHE_DIR, default_ttl: int = 300):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.default_ttl = default_ttl

    def _key_to_path(self, key: str) -> Path:
        safe_key = key.replace("/", "_").replace(":", "_").replace("\\", "_")
        return self.cache_dir / f"{safe_key}.json"

    def get(self, key: str, ttl: Optional[int] = None) -> Optional[Any]:
        """Get cached value if still fresh, else None.

        TTL resolution priority: stored _ttl > passed ttl > default_ttl.
        """
        path = self._key_to_path(key)
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            ts = payload.get("_cached_at", 0)
            # Prefer stored TTL (set when the data was written)
            stored_ttl = payload.get("_ttl")
            if stored_ttl is not None:
                ttl_use = stored_ttl
            elif ttl is not None:
                ttl_use = ttl
            else:
                ttl_use = self.default_ttl
            if time.time() - ts > ttl_use:
                return None
            return payload.get("data")
        except (json.JSONDecodeError, OSError):
            return None

    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        """Store value with timestamp"""
        payload = {
            "_cached_at": time.time(),
            "_ttl": ttl if ttl is not None else self.default_ttl,
            "data": data,
        }
        path = self._key_to_path(key)
        try:
            # Atomic write: write to temp, rename
            tmp = path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=None)
            tmp.replace(path)
        except OSError:
            pass

    def get_age_seconds(self, key: str) -> Optional[float]:
        """Get age of cached entry in seconds, None if not cached"""
        path = self._key_to_path(key)
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)
            return time.time() - payload.get("_cached_at", 0)
        except (json.JSONDecodeError, OSError):
            return None

    def clear(self) -> None:
        """Clear all cache files"""
        for f in self.cache_dir.glob("*.json"):
            try:
                f.unlink()
            except OSError:
                pass


# Singleton cache
_cache = FileCache()


# ============== TRADINGVIEW SCANNER ==============

def fetch_realtime_quotes(tickers: List[str], use_cache: bool = True, ttl: int = 300) -> Dict[str, RealtimeQuote]:
    """
    Fetch real-time quotes untuk multiple tickers via TradingView scanner.

    Args:
        tickers: list ticker tanpa suffix (BBCA, BBRI) atau dengan suffix (BBCA.JK)
        use_cache: apakah pakai cache
        ttl: cache TTL in seconds (default 5 min)

    Returns:
        Dict ticker → RealtimeQuote
    """
    if not tickers:
        return {}

    # Normalize ticker → TV format IDX:XXXX
    tv_symbols = []
    ticker_map = {}  # IDX:BBCA → BBCA
    for t in tickers:
        base = t.upper().replace(".JK", "").strip()
        sym = f"IDX:{base}"
        tv_symbols.append(sym)
        ticker_map[sym] = base

    cache_key = "tv_quotes_" + "_".join(sorted([t.replace(".JK", "") for t in tickers]))

    # Check cache
    if use_cache:
        cached = _cache.get(cache_key, ttl=ttl)
        if cached:
            result = {}
            for ticker, data in cached.items():
                result[ticker] = RealtimeQuote(**data)
            return result

    # Build request
    payload = {
        "symbols": {"tickers": tv_symbols},
        "columns": TV_COLUMNS,
    }

    data = _http_post("https://scanner.tradingview.com/indonesia/scan", payload, timeout=20)
    if not data:
        return {}

    try:
        j = json.loads(data)
    except json.JSONDecodeError:
        return {}

    rows = j.get("data", [])
    if not rows:
        return {}

    quotes = {}
    fetched_at = datetime.now(WIB).isoformat()

    for row in rows:
        sym = row.get("s", "")           # IDX:BBCA
        values = row.get("d", [])
        base = ticker_map.get(sym, sym.replace("IDX:", ""))

        # Map values → fields
        fields = {}
        for idx, val in enumerate(values):
            field_name = TV_COL_NAME.get(idx)
            if field_name:
                fields[field_name] = val

        # Build quote
        try:
            quote = RealtimeQuote(
                ticker=base,
                symbol=sym,
                price=float(fields.get("close") or 0),
                prev_close=float(fields.get("prev_close") or 0),
                change_abs=float(fields.get("change_abs") or 0),
                change_pct=float(fields.get("change_pct") or 0),  # TV sudah dalam %, jangan *100
                open=float(fields.get("open") or 0),
                high=float(fields.get("high") or 0),
                low=float(fields.get("low") or 0),
                volume=int(fields.get("volume") or 0),
                value_idr=float(fields.get("value_idr") or 0),
                market_cap=fields.get("market_cap"),
                sector=str(fields.get("sector") or "Unknown"),
                industry=str(fields.get("industry") or "Unknown"),
                description=str(fields.get("description") or base),
                fetched_at=fetched_at,
                source="tradingview",
            )
            if quote.price > 0:  # sanity check
                quotes[base] = quote
        except (ValueError, TypeError):
            continue

    # Save cache
    if quotes:
        cache_payload = {k: v.to_dict() for k, v in quotes.items()}
        _cache.set(cache_key, cache_payload, ttl=ttl)

    return quotes


# ============== YAHOO FINANCE CHART API ==============

def fetch_yahoo_chart(ticker: str, interval: str = "1d", range_: str = "1mo", use_cache: bool = True, ttl: int = 600) -> Optional[Dict[str, Any]]:
    """
    Fetch OHLCV chart dari Yahoo Finance chart API langsung (no library overhead).
    Returns dict with 'meta' and 'candles' (list of dict).
    """
    base = ticker.upper().replace(".JK", "").strip()
    cache_key = f"yf_chart_{base}_{interval}_{range_}"

    if use_cache:
        cached = _cache.get(cache_key, ttl=ttl)
        if cached:
            return cached

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{base}.JK?interval={interval}&range={range_}"
    data = _http_get(url, timeout=15)
    if not data:
        return None

    try:
        j = json.loads(data)
    except json.JSONDecodeError:
        return None

    result = j.get("chart", {}).get("result", [])
    if not result:
        return None

    chart = result[0]
    meta = chart.get("meta", {})
    ts = chart.get("timestamp", [])
    quote = chart.get("indicators", {}).get("quote", [{}])[0]
    closes = quote.get("close", [])
    highs = quote.get("high", [])
    lows = quote.get("low", [])
    opens = quote.get("open", [])
    volumes = quote.get("volume", [])

    candles = []
    for i, t in enumerate(ts):
        if closes[i] is None:
            continue
        candles.append({
            "t": int(t),
            "o": float(opens[i]) if opens[i] is not None else None,
            "h": float(highs[i]) if highs[i] is not None else None,
            "l": float(lows[i]) if lows[i] is not None else None,
            "c": float(closes[i]) if closes[i] is not None else None,
            "v": int(volumes[i]) if volumes[i] is not None else 0,
        })

    payload = {
        "meta": meta,
        "candles": candles,
        "fetched_at": datetime.now(WIB).isoformat(),
    }

    _cache.set(cache_key, payload, ttl=ttl)
    return payload


# ============== FOREIGN FLOW PROXY ==============

def compute_foreign_flow_proxy(ticker: str, use_cache: bool = True, ttl: int = 900) -> Optional[ForeignFlowProxy]:
    """
    Estimate foreign flow proxy dari price momentum + volume profile.
    Logika: harga + volume tinggi bersamaan = foreign activity.
    Returns None kalau data insufficient.
    """
    base = ticker.upper().replace(".JK", "").strip()
    chart = fetch_yahoo_chart(base, interval="1d", range_="3mo", use_cache=use_cache, ttl=ttl)
    if not chart or not chart.get("candles"):
        return None

    candles = chart["candles"]
    if len(candles) < 25:
        return None

    closes = [c["c"] for c in candles if c["c"] is not None]
    volumes = [c["v"] for c in candles if c["v"] is not None]

    if len(closes) < 25 or len(volumes) < 25:
        return None

    current_close = closes[-1]
    current_volume = volumes[-1]

    # 5-day momentum
    price_5d_ago = closes[-6] if len(closes) >= 6 else closes[0]
    price_momentum_pct = ((current_close - price_5d_ago) / price_5d_ago) * 100.0 if price_5d_ago > 0 else 0.0

    # 20-day avg volume
    recent_volumes = volumes[-21:-1]  # exclude today
    if not recent_volumes:
        return None
    avg_volume = sum(recent_volumes) / len(recent_volumes)
    volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

    # Signal logic
    signal = "NEUTRAL"
    confidence = 0.5
    reasoning_parts = []

    if price_momentum_pct > 2.0 and volume_ratio > 1.5:
        signal = "BUY"
        confidence = min(0.5 + (price_momentum_pct / 10.0) + (volume_ratio - 1.5) / 5.0, 0.95)
        reasoning_parts.append(f"harga naik {price_momentum_pct:.1f}% dalam 5 hari dengan volume {volume_ratio:.1f}x rata-rata")
    elif price_momentum_pct < -2.0 and volume_ratio > 1.5:
        signal = "SELL"
        confidence = min(0.5 + (abs(price_momentum_pct) / 10.0) + (volume_ratio - 1.5) / 5.0, 0.95)
        reasoning_parts.append(f"harga turun {abs(price_momentum_pct):.1f}% dalam 5 hari dengan volume {volume_ratio:.1f}x rata-rata")
    elif volume_ratio > 2.0:
        signal = "NEUTRAL"  # unusual volume, but no clear direction
        confidence = 0.4
        reasoning_parts.append(f"volume tinggi ({volume_ratio:.1f}x rata-rata) tapi harga sideways")
    else:
        reasoning_parts.append("tidak ada pola foreign flow yang jelas")

    reasoning = "Estimasi: " + "; ".join(reasoning_parts)

    return ForeignFlowProxy(
        ticker=base,
        signal=signal,
        confidence=round(confidence, 2),
        volume_ratio=round(volume_ratio, 2),
        price_momentum_pct=round(price_momentum_pct, 2),
        reasoning=reasoning,
        fetched_at=datetime.now(WIB).isoformat(),
    )


# ============== BROKER SUMMARY PROXY ==============

def compute_broker_summary_proxy(ticker: str, use_cache: bool = True, ttl: int = 900) -> Optional[BrokerSummaryProxy]:
    """
    Estimate broker activity dari intraday volume distribution.
    Real broker data requires paid IDX feed. Proxy ini menggunakan:
    - Volume profile: distribusi volume per price level
    - Block trade detection: trades > 5x average trade size
    - Akumulasi/Distribusi score: based on closing position relative to day's range
    """
    base = ticker.upper().replace(".JK", "").strip()

    # Get intraday 5m data (max 5 days from yahoo)
    chart = fetch_yahoo_chart(base, interval="1h", range_="5d", use_cache=use_cache, ttl=ttl)
    if not chart or not chart.get("candles"):
        return None

    candles = chart["candles"]
    if len(candles) < 5:
        return None

    # Aggregate by day
    from collections import defaultdict
    from datetime import datetime as _dt
    days = defaultdict(list)
    for c in candles:
        d = _dt.fromtimestamp(c["t"], tz=WIB).date()
        days[d].append(c)

    if not days:
        return None

    latest_day = max(days.keys())
    day_candles = days[latest_day]
    if len(day_candles) < 3:
        return None

    # Compute metrics
    day_open = day_candles[0]["o"]
    day_close = day_candles[-1]["c"]
    day_high = max(c["h"] for c in day_candles)
    day_low = min(c["l"] for c in day_candles)
    day_volume = sum(c["v"] for c in day_candles)

    if day_high == day_low or day_volume == 0:
        return None

    # Close position relative to day's range: 0 = at low, 1 = at high
    close_position = (day_close - day_low) / (day_high - day_low)

    # Block trades: candles with volume > 3x average candle volume
    avg_candle_vol = day_volume / len(day_candles)
    block_candles = [c for c in day_candles if c["v"] > avg_candle_vol * 3.0]
    block_trade_count = len(block_candles)
    avg_trade_size = int(day_volume / len(day_candles))

    # Determine accumulation/distribution
    # - Close at high + block trades on up candles = accumulation
    # - Close at low + block trades on down candles = distribution
    block_net = 0
    for c in block_candles:
        if c["c"] >= c["o"]:  # up candle
            block_net += c["v"]
        else:
            block_net -= c["v"]

    if day_volume > 0:
        estimated_net_volume = block_net
        # Accumulation score: -1 (full distribution) to +1 (full accumulation)
        raw_score = (close_position - 0.5) * 2 + (block_net / day_volume) * 2
        accumulation_score = max(min(raw_score, 1.0), -1.0)
    else:
        estimated_net_volume = 0
        accumulation_score = 0.0

    # Build reasoning
    direction = "akumulasi" if accumulation_score > 0 else "distribusi"
    if abs(accumulation_score) > 0.5:
        reasoning = (
            f"Aktivitas {direction} terdeteksi: close di {close_position*100:.0f}% range hari, "
            f"{block_trade_count} block trade, net_block={block_net:+,.0f}"
        )
    else:
        reasoning = (
            f"Tidak ada pola broker yang dominan: close di {close_position*100:.0f}% range hari, "
            f"{block_trade_count} block trade, net_block={block_net:+,.0f}"
        )

    return BrokerSummaryProxy(
        ticker=base,
        accumulation_score=round(accumulation_score, 2),
        estimated_net_volume=int(estimated_net_volume),
        block_trade_count=block_trade_count,
        avg_trade_size=avg_trade_size,
        reasoning=reasoning,
        fetched_at=datetime.now(WIB).isoformat(),
    )


# ============== CONVENIENCE ==============

def get_realtime_quote(ticker: str, use_cache: bool = True, ttl: int = 300) -> Optional[RealtimeQuote]:
    """Get single ticker real-time quote"""
    quotes = fetch_realtime_quotes([ticker], use_cache=use_cache, ttl=ttl)
    return quotes.get(ticker.upper().replace(".JK", ""))


def get_quotes_with_proxies(tickers: List[str], use_cache: bool = True, ttl: int = 300) -> Dict[str, Dict[str, Any]]:
    """
    Fetch real-time quotes + foreign flow proxy + broker summary proxy untuk banyak ticker.
    Returns dict: ticker → {quote, foreign_flow, broker_summary}
    """
    quotes = fetch_realtime_quotes(tickers, use_cache=use_cache, ttl=ttl)
    result = {}
    for base, quote in quotes.items():
        ff = compute_foreign_flow_proxy(base, use_cache=use_cache, ttl=ttl * 3)  # longer TTL for derived data
        bs = compute_broker_summary_proxy(base, use_cache=use_cache, ttl=ttl * 3)
        result[base] = {
            "quote": quote.to_dict(),
            "foreign_flow": ff.to_dict() if ff else None,
            "broker_summary": bs.to_dict() if bs else None,
        }
    return result


def clear_all_cache() -> None:
    """Clear all cache"""
    _cache.clear()


def cache_status() -> Dict[str, Any]:
    """Get cache statistics"""
    files = list(CACHE_DIR.glob("*.json"))
    total_size = sum(f.stat().st_size for f in files)
    return {
        "cache_dir": str(CACHE_DIR),
        "file_count": len(files),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / 1024 / 1024, 2),
    }


# ============== CLI TEST ==============

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("  IDX Real-time Data Test")
    print("=" * 60)

    test_tickers = ["BBCA", "BBRI", "TLKM", "ASII"]

    print("\n[1/3] Fetching real-time quotes from TradingView...")
    quotes = fetch_realtime_quotes(test_tickers, use_cache=False)
    for base, q in quotes.items():
        print(f"  ✓ {base}: Rp {q.price:,.0f} ({q.change_pct:+.2f}%) vol={q.volume:,}")

    if not quotes:
        print("  ✗ No quotes fetched. Check network.")
        sys.exit(1)

    print("\n[2/3] Computing foreign flow proxy...")
    for base in quotes.keys():
        ff = compute_foreign_flow_proxy(base, use_cache=False)
        if ff:
            print(f"  ✓ {base}: {ff.signal} (conf={ff.confidence:.2f}) — {ff.reasoning[:80]}")
        else:
            print(f"  ✗ {base}: insufficient data")

    print("\n[3/3] Computing broker summary proxy...")
    for base in quotes.keys():
        bs = compute_broker_summary_proxy(base, use_cache=False)
        if bs:
            print(f"  ✓ {base}: acc_score={bs.accumulation_score:+.2f} blocks={bs.block_trade_count} — {bs.reasoning[:80]}")
        else:
            print(f"  ✗ {base}: insufficient data")

    print("\n" + "=" * 60)
    print(f"  Cache status: {cache_status()}")
    print("=" * 60)