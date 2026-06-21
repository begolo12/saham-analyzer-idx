"""
Saham Analyzer IDX - Telegram Bot
==================================

Bot Telegram untuk alert saham & quick check via chat.
Independent dari Hermes AirevoBot (yang untuk AI agent gateway).

Commands:
  /start      - Welcome + command list
  /help       - Show all commands
  /price BBCA - Get real-time price + change
  /signal BBCA - Get recommendation (Buy/Hold/Sell)
  /portfolio  - Quick portfolio summary (if linked)
  /watchlist  - Show your watchlist
  /alerts     - List active alerts
  /setalert BBCA 7000 above - Set price alert

Setup:
  1. Chat @BotFather di Telegram, /newbot, simpan TOKEN
  2. Set env TELEGRAM_BOT_TOKEN=<token>
  3. Run: python -m modules.telegram_bot
     (long-polling mode, no webhook needed for local dev)

Production (Vercel):
  - Use webhook via web/app/api/telegram/webhook/route.ts
  - Set env TELEGRAM_WEBHOOK_URL + TELEGRAM_BOT_TOKEN

Storage: SQLite (saham_bot.db) di instance dir
  - users: chat_id, username, linked_at
  - alerts: id, chat_id, ticker, target_price, direction, active, created_at
"""
import os
import sys
import json
import time
import logging
import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    import requests
except ImportError:
    print("ERROR: 'requests' required. pip install requests")
    sys.exit(1)

try:
    from modules.idx_realtime import get_realtime_quote
    from modules.data_fetcher import StockDataFetcher
    from modules.recommender import StockRecommender
    HAS_ANALYZER = True
except ImportError as e:
    HAS_ANALYZER = False
    print(f"WARN: analyzer modules not importable: {e}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
WIB = timezone(timedelta(hours=7))
DB_PATH = ROOT / "data" / "saham_bot.db"

# Telegram rate limit: 30 msg/sec per bot, 1 msg/sec per chat
MSG_RATE_LIMIT = 1.0  # seconds between messages to same chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("saham_bot")


# ---------------------------------------------------------------------------
# Database — SQLite for users + alerts
# ---------------------------------------------------------------------------
def init_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            chat_id INTEGER PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id INTEGER NOT NULL,
            ticker TEXT NOT NULL,
            target_price REAL NOT NULL,
            direction TEXT NOT NULL,  -- 'above' | 'below'
            active INTEGER DEFAULT 1,
            triggered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES users(chat_id)
        )
    """)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active, ticker)"
    )
    conn.commit()
    return conn


# ---------------------------------------------------------------------------
# Telegram API — minimal wrapper
# ---------------------------------------------------------------------------
class TelegramAPI:
    def __init__(self, token: str):
        if not token:
            raise ValueError("TELEGRAM_BOT_TOKEN empty")
        self.base = f"https://api.telegram.org/bot{token}"
        self.session = requests.Session()
        self._rate_lock = threading.Lock()
        self._last_send: Dict[int, float] = {}

    def get_updates(self, offset: Optional[int] = None, timeout: int = 30) -> List[dict]:
        params = {"timeout": timeout, "allowed_updates": ["message", "callback_query"]}
        if offset is not None:
            params["offset"] = offset
        try:
            r = self.session.post(f"{self.base}/getUpdates", params=params, timeout=timeout + 10)
            r.raise_for_status()
            return r.json().get("result", [])
        except Exception as e:
            log.error(f"getUpdates failed: {e}")
            return []

    def send_message(self, chat_id: int, text: str, parse_mode: str = "HTML") -> bool:
        # Per-chat rate limit
        with self._rate_lock:
            now = time.time()
            last = self._last_send.get(chat_id, 0)
            wait = MSG_RATE_LIMIT - (now - last)
            if wait > 0:
                time.sleep(wait)
            self._last_send[chat_id] = time.time()

        # Telegram max 4096 chars
        if len(text) > 4000:
            text = text[:3990] + "\n\n[…truncated]"

        try:
            r = self.session.post(
                f"{self.base}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode,
                    "disable_web_page_preview": True,
                },
                timeout=15,
            )
            if not r.ok:
                log.warning(f"sendMessage {r.status_code}: {r.text[:200]}")
            return r.ok
        except Exception as e:
            log.error(f"sendMessage failed: {e}")
            return False

    def answer_callback(self, callback_id: str, text: str = "") -> bool:
        try:
            r = self.session.post(
                f"{self.base}/answerCallbackQuery",
                json={"callback_query_id": callback_id, "text": text},
                timeout=10,
            )
            return r.ok
        except Exception as e:
            log.error(f"answerCallback failed: {e}")
            return False


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------
def fmt_idr(n: Optional[float]) -> str:
    if n is None:
        return "N/A"
    return f"Rp {n:,.0f}".replace(",", ".")


def fmt_pct(n: Optional[float]) -> str:
    if n is None:
        return "N/A"
    sign = "+" if n >= 0 else ""
    return f"{sign}{n:.2f}%"


def fmt_ts(ts: Optional[float] = None) -> str:
    if ts is None:
        ts = time.time()
    return datetime.fromtimestamp(ts, WIB).strftime("%d %b %Y %H:%M WIB")


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------
HELP_TEXT = """🤖 <b>Saham Analyzer IDX — Bot</b>

<b>Quick check:</b>
/price <code>BBCA</code> — Harga real-time
/signal <code>BBCA</code> — Rekomendasi Buy/Hold/Sell
/chart <code>BBCA</code> — Link ke chart interaktif

<b>Portfolio:</b>
/portfolio — Ringkasan portofolio
/watchlist — Watchlist kamu

<b>Alerts:</b>
/alerts — Alert aktif
/setalert <code>BBCA 7000 above</code> — Alert harga
/delalert <code>&lt;id&gt;</code> — Hapus alert

<b>Lainnya:</b>
/help — Tampilkan pesan ini
/start — Welcome

💡 <i>Data real-time via TradingView Scanner. Delay &lt; 5 detik.</i>
"""


def cmd_start(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    cur = db.cursor()
    cur.execute(
        "INSERT OR IGNORE INTO users(chat_id, first_name) VALUES (?, ?)",
        (chat_id, args[0] if args else None),
    )
    db.commit()
    api.send_message(chat_id, HELP_TEXT)


def cmd_help(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    api.send_message(chat_id, HELP_TEXT)


def cmd_price(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    if not args:
        api.send_message(chat_id, "⚠️ Format: <code>/price BBCA</code>")
        return
    ticker = args[0].upper().replace(".JK", "")
    if not HAS_ANALYZER:
        api.send_message(chat_id, "❌ Analyzer module tidak tersedia.")
        return

    q = get_realtime_quote(ticker, use_cache=True, ttl=60)
    if not q:
        api.send_message(chat_id, f"❌ Tidak bisa mengambil data untuk <b>{ticker}</b>.")
        return

    arrow = "🟢" if (q.change_pct or 0) >= 0 else "🔴"
    text = (
        f"{arrow} <b>{ticker}</b>\n"
        f"Harga: <b>{fmt_idr(q.price)}</b> ({fmt_pct(q.change_pct)})\n"
        f"Perubahan: {fmt_idr(q.change_abs)}\n"
    )
    if q.volume:
        text += f"Volume: {q.volume:,.0f}\n".replace(",", ".")
    if q.prev_close:
        text += f"Prev close: {fmt_idr(q.prev_close)}\n"
    text += f"\n<i>Update: {fmt_ts(q.fetched_at)}</i>"
    api.send_message(chat_id, text)


def cmd_signal(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    if not args:
        api.send_message(chat_id, "⚠️ Format: <code>/signal BBCA</code>")
        return
    ticker = args[0].upper().replace(".JK", "")
    if not HAS_ANALYZER:
        api.send_message(chat_id, "❌ Analyzer module tidak tersedia.")
        return

    try:
        fetcher = StockDataFetcher()
        rec_engine = StockRecommender()
        # Quick signal — technical + fundamental summary
        rec = fetcher.get_recommendation(ticker) if hasattr(fetcher, "get_recommendation") else None
        if not rec:
            # Fallback: just give price + simple RSI/MACD verdict
            q = get_realtime_quote(ticker, use_cache=True, ttl=60)
            if not q:
                api.send_message(chat_id, f"❌ Data untuk {ticker} tidak tersedia.")
                return
            text = (
                f"📊 <b>{ticker}</b>\n"
                f"Harga: <b>{fmt_idr(q.price)}</b> ({fmt_pct(q.change_pct)})\n\n"
                f"⚠️ Sinyal lengkap belum tersedia. Lihat detail di web:\n"
                f"https://saham-claude.vercel.app/stock/{ticker}"
            )
        else:
            emoji = {"STRONG_BUY": "🟢🟢", "BUY": "🟢", "HOLD": "🟡",
                     "SELL": "🔴", "STRONG_SELL": "🔴🔴"}.get(rec.get("action", "HOLD"), "⚪")
            text = (
                f"{emoji} <b>{ticker} — {rec.get('action', 'N/A')}</b>\n"
                f"Confidence: {rec.get('confidence', 0):.0f}%\n"
                f"Current: {fmt_idr(rec.get('currentPrice'))}\n"
            )
            if rec.get("targetPrice"):
                text += f"Target: {fmt_idr(rec['targetPrice'])}\n"
            if rec.get("stopLoss"):
                text += f"Stop: {fmt_idr(rec['stopLoss'])}\n"
            text += f"\n<i>Update: {fmt_ts()}</i>"
        api.send_message(chat_id, text)
    except Exception as e:
        log.error(f"signal {ticker}: {e}")
        api.send_message(chat_id, f"❌ Error analyzing {ticker}: {e}")


def cmd_setalert(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    """Format: /setalert BBCA 7000 above"""
    if len(args) < 3:
        api.send_message(
            chat_id,
            "⚠️ Format: <code>/setalert BBCA 7000 above</code>\n"
            "Arah: <b>above</b> (harga naik ke target) atau <b>below</b> (turun ke target)",
        )
        return
    ticker = args[0].upper().replace(".JK", "")
    try:
        target = float(args[1].replace(".", "").replace(",", ""))
    except ValueError:
        api.send_message(chat_id, "❌ Target price harus angka.")
        return
    direction = args[2].lower()
    if direction not in ("above", "below"):
        api.send_message(chat_id, "❌ Arah harus <code>above</code> atau <code>below</code>.")
        return

    cur = db.cursor()
    cur.execute(
        "INSERT INTO alerts(chat_id, ticker, target_price, direction) VALUES (?, ?, ?, ?)",
        (chat_id, ticker, target, direction),
    )
    db.commit()
    alert_id = cur.lastrowid
    api.send_message(
        chat_id,
        f"✅ Alert #{alert_id} dibuat: <b>{ticker}</b> {direction} {fmt_idr(target)}",
    )


def cmd_alerts(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    cur = db.cursor()
    cur.execute(
        "SELECT id, ticker, target_price, direction, active FROM alerts WHERE chat_id = ? ORDER BY id DESC",
        (chat_id,),
    )
    rows = cur.fetchall()
    if not rows:
        api.send_message(chat_id, "📭 Tidak ada alert aktif.\nBuat: <code>/setalert BBCA 7000 above</code>")
        return
    lines = ["🔔 <b>Alert aktif:</b>\n"]
    for r in rows:
        status = "✅" if r["active"] else "✓ done"
        lines.append(
            f"{status} #{r['id']} <b>{r['ticker']}</b> {r['direction']} {fmt_idr(r['target_price'])}"
        )
    lines.append(f"\n<i>Total: {len(rows)} alert</i>")
    api.send_message(chat_id, "\n".join(lines))


def cmd_delalert(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    if not args:
        api.send_message(chat_id, "⚠️ Format: <code>/delalert 3</code>")
        return
    try:
        alert_id = int(args[0])
    except ValueError:
        api.send_message(chat_id, "❌ ID harus angka.")
        return
    cur = db.cursor()
    cur.execute(
        "UPDATE alerts SET active = 0 WHERE id = ? AND chat_id = ?",
        (alert_id, chat_id),
    )
    db.commit()
    if cur.rowcount > 0:
        api.send_message(chat_id, f"✅ Alert #{alert_id} dinonaktifkan.")
    else:
        api.send_message(chat_id, f"❌ Alert #{alert_id} tidak ditemukan.")


def cmd_portfolio(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    """Quick portfolio summary. Reads from web storage if available."""
    # Web uses localStorage — bot can't read directly.
    # Future: link account via web dashboard.
    api.send_message(
        chat_id,
        "📂 <b>Portfolio</b>\n\n"
        "Untuk melihat portfolio via Telegram, link akun di web:\n"
        "<i>https://saham-claude.vercel.app/settings → Telegram Link</i>\n\n"
        "Atau gunakan /watchlist untuk saham yang kamu pantau.",
    )


def cmd_watchlist(api: TelegramAPI, chat_id: int, args: List[str], db: sqlite3.Connection):
    """Quick watchlist — uses IDX popular by default (account link future)."""
    api.send_message(
        chat_id,
        "⭐ <b>Watchlist default</b>\n\n"
        "Top 5 IDX blue chips (live):\n"
        "Lihat: <code>/price BBCA</code>, <code>/price BBRI</code>, dll.\n\n"
        "Untuk watchlist personal, link akun via web settings.",
    )


COMMANDS = {
    "/start": cmd_start,
    "/help": cmd_help,
    "/price": cmd_price,
    "/signal": cmd_signal,
    "/setalert": cmd_setalert,
    "/alerts": cmd_alerts,
    "/delalert": cmd_delalert,
    "/portfolio": cmd_portfolio,
    "/watchlist": cmd_watchlist,
}


# ---------------------------------------------------------------------------
# Alert checker (background thread)
# ---------------------------------------------------------------------------
def alert_checker(api: TelegramAPI, db: sqlite3.Connection, interval: int = 30):
    """Check active alerts every N seconds, notify if triggered."""
    log.info(f"Alert checker started (interval={interval}s)")
    while True:
        try:
            cur = db.cursor()
            cur.execute(
                """SELECT id, chat_id, ticker, target_price, direction
                   FROM alerts WHERE active = 1"""
            )
            active = cur.fetchall()
            if active:
                # Group by ticker to fetch once
                tickers = {r["ticker"] for r in active}
                for ticker in tickers:
                    q = get_realtime_quote(ticker, use_cache=False, ttl=15)
                    if not q or not q.price:
                        continue
                    for r in active:
                        if r["ticker"] != ticker:
                            continue
                        triggered = (
                            (r["direction"] == "above" and q.price >= r["target_price"])
                            or (r["direction"] == "below" and q.price <= r["target_price"])
                        )
                        if triggered:
                            arrow = "📈" if r["direction"] == "above" else "📉"
                            text = (
                                f"{arrow} <b>ALERT #{r['id']} TRIGGERED</b>\n\n"
                                f"<b>{r['ticker']}</b> {r['direction']} "
                                f"{fmt_idr(r['target_price'])}\n"
                                f"Current: <b>{fmt_idr(q.price)}</b> "
                                f"({fmt_pct(q.change_pct)})\n\n"
                                f"<i>{fmt_ts()}</i>"
                            )
                            api.send_message(r["chat_id"], text)
                            cur.execute(
                                "UPDATE alerts SET active = 0, triggered_at = CURRENT_TIMESTAMP WHERE id = ?",
                                (r["id"],),
                            )
                            db.commit()
        except Exception as e:
            log.error(f"alert_checker: {e}")
        time.sleep(interval)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main():
    if not BOT_TOKEN:
        print(
            "ERROR: TELEGRAM_BOT_TOKEN env var not set.\n"
            "Setup:\n"
            "  1. Chat @BotFather di Telegram\n"
            "  2. /newbot, save token\n"
            "  3. export TELEGRAM_BOT_TOKEN=...\n"
            "  4. python -m modules.telegram_bot",
            file=sys.stderr,
        )
        sys.exit(1)

    log.info("=" * 50)
    log.info("Saham Analyzer IDX — Telegram Bot")
    log.info(f"DB: {DB_PATH}")
    log.info(f"Analyzer: {'OK' if HAS_ANALYZER else 'DEGRADED'}")
    log.info("=" * 50)

    api = TelegramAPI(BOT_TOKEN)
    db = init_db()

    # Verify token by calling getMe
    try:
        me = api.session.get(f"{api.base}/getMe", timeout=10).json()
        if me.get("ok"):
            bot_info = me["result"]
            log.info(f"Connected as @{bot_info.get('username')} ({bot_info.get('first_name')})")
        else:
            log.error(f"Token invalid: {me}")
            sys.exit(1)
    except Exception as e:
        log.error(f"Cannot reach Telegram API: {e}")
        sys.exit(1)

    # Start alert checker in background
    checker = threading.Thread(target=alert_checker, args=(api, db, 30), daemon=True)
    checker.start()

    # Long polling loop
    log.info("Listening for messages...")
    offset = None
    while True:
        try:
            updates = api.get_updates(offset=offset, timeout=30)
            for u in updates:
                offset = u["update_id"] + 1
                msg = u.get("message") or {}
                chat = msg.get("chat", {})
                chat_id = chat.get("id")
                text = msg.get("text", "").strip()
                if not chat_id or not text:
                    continue
                # Ensure user in DB
                cur = db.cursor()
                cur.execute(
                    "INSERT OR IGNORE INTO users(chat_id, username, first_name) VALUES (?, ?, ?)",
                    (chat_id, chat.get("username"), chat.get("first_name")),
                )
                db.commit()
                # Parse command
                parts = text.split()
                cmd, args = parts[0].lower(), parts[1:]
                handler = COMMANDS.get(cmd)
                if handler:
                    handler(api, chat_id, args, db)
                elif text.startswith("/"):
                    api.send_message(chat_id, f"❓ Perintah tidak dikenal: <code>{cmd}</code>\nKetik /help")
        except KeyboardInterrupt:
            log.info("Stopping...")
            break
        except Exception as e:
            log.error(f"Main loop: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
