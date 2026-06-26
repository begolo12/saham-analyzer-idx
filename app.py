"""
Saham Analyzer - Indonesian Stock Analysis Application
Main UI menggunakan Streamlit (Daily-Use Production Grade).

Run: streamlit run app.py
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import sys
import os
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Tambah path ke modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.data_fetcher import StockDataFetcher, DEFAULT_STOCK_LIST, POPULAR_IDX_STOCKS
from modules.technical import TechnicalAnalyzer
from modules.fundamental import FundamentalAnalyzer
from modules.behavioral import BehavioralAnalyzer
from modules.sentiment import analyze_sentiment, IndonesianSentimentAnalyzer
from modules.recommender import Recommender, Action, TimeHorizon
from modules.idx_realtime import (
    fetch_realtime_quotes,
    get_realtime_quote,
    compute_foreign_flow_proxy,
    compute_broker_summary_proxy,
    cache_status as idx_cache_status,
    clear_all_cache as idx_clear_cache,
    WIB as IDX_WIB,
)


# === PAGE CONFIG ===
st.set_page_config(
    page_title="Saham Analyzer IDX",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="collapsed",  # Mobile default
    menu_items={
        'About': "Saham Analyzer - Alat bantu analisa saham IDX. Bukan saran finansial."
    }
)


# === CUSTOM CSS - MODERN CARD DESIGN ===
st.markdown("""
<style>
    /* === TYPOGRAPHY === */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* === HEADER === */
    .main-header {
        font-size: clamp(1.5rem, 4vw, 2.5rem);
        font-weight: 800;
        background: linear-gradient(135deg, #00C853 0%, #1E88E5 50%, #7C4DFF 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0;
        line-height: 1.2;
    }
    .subheader {
        color: #6b7280;
        font-size: clamp(0.85rem, 2vw, 1.05rem);
        margin-top: 0.25rem;
        margin-bottom: 1rem;
    }

    /* === MODERN CARDS === */
    .card {
        background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 1.25rem;
        margin: 0.5rem 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        transition: all 0.2s ease;
    }
    .card:hover {
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        transform: translateY(-2px);
    }
    .card-glass {
        background: rgba(255,255,255,0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.5);
        border-radius: 16px;
        padding: 1.25rem;
    }

    /* === RECOMMENDATION CARDS === */
    .rec-card-strong-buy {
        background: linear-gradient(135deg, #00C853 0%, #00E676 100%);
        color: white;
        border-radius: 20px;
        padding: 1.75rem;
        box-shadow: 0 8px 32px rgba(0,200,83,0.3);
    }
    .rec-card-buy {
        background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
        color: white;
        border-radius: 20px;
        padding: 1.75rem;
        box-shadow: 0 8px 32px rgba(76,175,80,0.3);
    }
    .rec-card-hold {
        background: linear-gradient(135deg, #FFA726 0%, #FFB74D 100%);
        color: white;
        border-radius: 20px;
        padding: 1.75rem;
        box-shadow: 0 8px 32px rgba(255,167,38,0.3);
    }
    .rec-card-sell {
        background: linear-gradient(135deg, #F44336 0%, #EF5350 100%);
        color: white;
        border-radius: 20px;
        padding: 1.75rem;
        box-shadow: 0 8px 32px rgba(244,67,54,0.3);
    }
    .rec-card-strong-sell {
        background: linear-gradient(135deg, #B71C1C 0%, #C62828 100%);
        color: white;
        border-radius: 20px;
        padding: 1.75rem;
        box-shadow: 0 8px 32px rgba(183,28,28,0.4);
    }

    /* === SIGNAL BADGES === */
    .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }
    .badge-bull { background: #dcfce7; color: #166534; }
    .badge-bear { background: #fee2e2; color: #991b1b; }
    .badge-neutral { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }

    /* === METRIC CARDS === */
    .metric-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1rem;
        text-align: left;
    }
    .metric-label {
        color: #6b7280;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
    }
    .metric-value {
        font-size: clamp(1.25rem, 3vw, 1.75rem);
        font-weight: 700;
        color: #111827;
    }
    .metric-delta-up { color: #16a34a; font-size: 0.875rem; font-weight: 600; }
    .metric-delta-down { color: #dc2626; font-size: 0.875rem; font-weight: 600; }

    /* === WATCHLIST CARDS === */
    .watch-card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 1rem;
        transition: all 0.2s;
        cursor: pointer;
    }
    .watch-card:hover {
        border-color: #1E88E5;
        box-shadow: 0 4px 16px rgba(30,136,229,0.15);
    }

    /* === ALERTS === */
    .warning-box {
        background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
        border-left: 4px solid #ffc107;
        border-radius: 8px;
        padding: 1rem;
        color: #856404;
        margin: 0.5rem 0;
    }
    .info-box {
        background: linear-gradient(135deg, #cfe2ff 0%, #b6d4fe 100%);
        border-left: 4px solid #0d6efd;
        border-radius: 8px;
        padding: 1rem;
        color: #084298;
        margin: 0.5rem 0;
    }
    .danger-box {
        background: linear-gradient(135deg, #f8d7da 0%, #f1aeb5 100%);
        border-left: 4px solid #dc3545;
        border-radius: 8px;
        padding: 1rem;
        color: #721c24;
        margin: 0.5rem 0;
    }

    /* === MOBILE OPTIMIZATIONS === */
    @media (max-width: 768px) {
        .block-container { padding: 1rem 0.5rem !important; }
        .stTabs [data-baseweb="tab-list"] { gap: 0; flex-wrap: wrap; }
        .stTabs [data-baseweb="tab"] { padding: 0.5rem 0.75rem; font-size: 0.85rem; }
        [data-testid="stMetricValue"] { font-size: 1.1rem !important; }
        [data-testid="stMetricLabel"] { font-size: 0.75rem !important; }
        div.row-widget.stHorizontal > div { gap: 0.25rem; }
    }

    /* === ANIMATIONS === */
    @keyframes pulse-soft {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
    .pulse { animation: pulse-soft 2s infinite; }

    /* === STREAMLIT OVERRIDES === */
    div[data-testid="stMetricValue"] { font-weight: 700; }
    .stProgress > div > div > div > div { background: linear-gradient(90deg, #1E88E5, #7C4DFF); }
    .stTabs [data-baseweb="tab-list"] button[aria-selected="true"] {
        background: linear-gradient(135deg, #1E88E5 0%, #7C4DFF 100%);
        color: white !important;
        border-radius: 8px;
    }

    /* === LOADING SKELETON === */
    .skeleton {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: skeleton 1.5s infinite;
        border-radius: 8px;
        height: 1rem;
    }
    @keyframes skeleton {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* === HIDE STREAMLIT BRANDING === */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    .viewerBadge_link__qRIco {display: none !important;}
</style>
""", unsafe_allow_html=True)


# === SESSION STATE INITIALIZATION ===

def init_session_state():
    """Initialize session state variables"""
    if 'watchlist' not in st.session_state:
        st.session_state.watchlist = []
    if 'current_ticker' not in st.session_state:
        st.session_state.current_ticker = None
    if 'analysis_cache' not in st.session_state:
        st.session_state.analysis_cache = {}
    if 'theme' not in st.session_state:
        st.session_state.theme = 'light'

init_session_state()


# === HELPER FUNCTIONS ===

@st.cache_data(ttl=300)
def fetch_stock_data(ticker: str, period: str = "1y"):
    """Cache data fetch untuk hemat API calls"""
    try:
        fetcher = StockDataFetcher(ticker)
        if not fetcher.is_valid():
            return None, None
        df = fetcher.get_historical_data(period=period)
        info = fetcher.get_info()
        summary = fetcher.get_summary()
        return df, {"info": info, "summary": summary}
    except Exception as e:
        return None, {"error": str(e)}


@st.cache_data(ttl=600)
def analyze_technical_cached(df_hash: str, _df: pd.DataFrame):
    return TechnicalAnalyzer(_df).analyze()


@st.cache_data(ttl=600)
def analyze_fundamental_cached(_info_str: str, info: dict):
    return FundamentalAnalyzer(info).analyze()


@st.cache_data(ttl=600)
def analyze_behavioral_cached(df_hash: str, _df: pd.DataFrame):
    return BehavioralAnalyzer(_df).analyze()


@st.cache_data(ttl=1800)
def analyze_sentiment_cached(_ticker: str, _name: str, max_articles: int = 15):
    return analyze_sentiment(_name, _ticker, max_articles=max_articles)


def format_idr(value):
    """Format angka ke Rupiah"""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "N/A"
    return f"Rp {value:,.0f}".replace(",", ".")


def format_freshness(iso_ts: str) -> str:
    """Format ISO timestamp → human-readable 'X detik/menit/jam yang lalu'"""
    try:
        from datetime import datetime
        ts = datetime.fromisoformat(iso_ts)
        delta = datetime.now(IDX_WIB) - ts
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return f"{seconds} detik lalu"
        if seconds < 3600:
            return f"{seconds // 60} menit lalu"
        if seconds < 86400:
            return f"{seconds // 3600} jam lalu"
        return f"{seconds // 86400} hari lalu"
    except Exception:
        return "waktu tidak diketahui"


@st.cache_data(ttl=300)
def get_realtime_quotes_cached(tickers_tuple: tuple) -> dict:
    """Cache real-time quotes (5 min TTL)"""
    return {t: q.to_dict() for t, q in fetch_realtime_quotes(list(tickers_tuple), use_cache=True, ttl=300).items()}


@st.cache_data(ttl=900)
def get_foreign_flow_cached(ticker: str) -> Optional[dict]:
    ff = compute_foreign_flow_proxy(ticker, use_cache=True, ttl=900)
    return ff.to_dict() if ff else None


@st.cache_data(ttl=900)
def get_broker_summary_cached(ticker: str) -> Optional[dict]:
    bs = compute_broker_summary_proxy(ticker, use_cache=True, ttl=900)
    return bs.to_dict() if bs else None


def get_rec_card_class(action_value: str) -> str:
    """Map action to CSS card class"""
    mapping = {
        "STRONG_BUY": "rec-card-strong-buy",
        "BUY": "rec-card-buy",
        "HOLD": "rec-card-hold",
        "SELL": "rec-card-sell",
        "STRONG_SELL": "rec-card-strong-sell",
    }
    return mapping.get(action_value, "rec-card-hold")


def get_signal_badge_html(label: str, score: float) -> str:
    """Generate colored badge HTML"""
    if score > 0.5:
        return f'<span class="badge badge-bull">🟢 {label}</span>'
    elif score < -0.5:
        return f'<span class="badge badge-bear">🔴 {label}</span>'
    else:
        return f'<span class="badge badge-neutral">🟡 {label}</span>'


# === MOBILE-FRIENDLY NAVIGATION ===

def render_top_nav():
    """Top navigation bar yang mobile-friendly"""
    cols = st.columns([2, 3, 1])
    with cols[0]:
        st.markdown("📈 **SahamIDX**", unsafe_allow_html=True)
    with cols[1]:
        nav_options = ["🔍 Analisa", "⭐ Watchlist", "📊 Pasar"]
        selected = st.radio(
            "Navigation",
            nav_options,
            horizontal=True,
            label_visibility="collapsed",
            key="nav_radio",
        )
    with cols[2]:
        if st.button("🔄", help="Refresh data", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    return selected


def render_stock_search():
    """Mobile-friendly stock search"""
    st.markdown("### 🔍 Cari Saham")
    tab_input, tab_picker = st.tabs(["⌨️ Ketik", "📋 Pilih Populer"])

    with tab_input:
        custom = st.text_input(
            "Kode saham (contoh: BBCA)",
            placeholder="BBCA, BBRI, TLKM...",
            label_visibility="collapsed",
        ).strip().upper()
        return custom if custom else None

    with tab_picker:
        # Group stocks by sector
        sector_groups = {
            "Perbankan": ["BBCA", "BBRI", "BMRI", "BBNI", "BRIS", "BSIM"],
            "Telekomunikasi": ["TLKM", "ISAT", "EXCL"],
            "Konsumer": ["UNVR", "ICBP", "INDF", "MYOR", "KLBF", "SIDO"],
            "Otomotif": ["ASII", "AUTO", "UNTR"],
            "Pertambangan": ["ANTM", "PTBA", "ADRO", "ITMG", "MEDC", "INCO", "AMMN", "MDKA"],
            "Properti": ["BSDE", "PWON", "CTRA", "SMGR", "INTP"],
            "Ritel": ["MAPI", "ACES", "LPPF", "AMRT"],
            "Tech": ["GOTO", "EMTK", "BRPT", "TPIA", "ESSA", "SRTG"],
        }

        selected_sector = st.selectbox(
            "Sektor",
            list(sector_groups.keys()),
            label_visibility="collapsed",
        )
        stock_options = sector_groups.get(selected_sector, [])
        if stock_options:
            choice = st.selectbox(
                "Saham",
                ["—"] + stock_options,
                label_visibility="collapsed",
            )
            if choice != "—":
                return choice
        return None


# === WATCHLIST MANAGEMENT ===

def add_to_watchlist(ticker: str):
    """Add ticker to watchlist"""
    if ticker and ticker not in st.session_state.watchlist:
        st.session_state.watchlist.append(ticker)
        st.toast(f"⭐ {ticker} ditambahkan ke watchlist!", icon="✅")


def remove_from_watchlist(ticker: str):
    """Remove ticker from watchlist"""
    if ticker in st.session_state.watchlist:
        st.session_state.watchlist.remove(ticker)
        st.toast(f"❌ {ticker} dihapus dari watchlist", icon="🗑️")


def render_watchlist():
    """Render watchlist page"""
    st.markdown("## ⭐ Watchlist Saya")

    if not st.session_state.watchlist:
        st.info("📝 Watchlist masih kosong. Tambahkan saham favorit dari halaman analisa!")
        return

    cols_per_row = 2 if st.session_state.get('mobile', True) else 3
    cols = st.columns(cols_per_row)

    for i, ticker in enumerate(st.session_state.watchlist):
        with cols[i % cols_per_row]:
            with st.container():
                st.markdown(f'<div class="watch-card">', unsafe_allow_html=True)
                try:
                    fetcher = StockDataFetcher(f"{ticker}.JK")
                    price = fetcher.get_current_price()
                    prev_close = fetcher.get_info().get("previousClose")
                    if price and prev_close:
                        change = ((price - prev_close) / prev_close) * 100
                        delta_color = "🟢" if change >= 0 else "🔴"
                        col_a, col_b = st.columns([2, 1])
                        with col_a:
                            st.markdown(f"**{ticker}**")
                            st.caption(fetcher.get_company_name()[:30])
                        with col_b:
                            st.markdown(f"{delta_color} {change:+.2f}%")
                        st.markdown(f"### {format_idr(price)}")
                except Exception:
                    st.markdown(f"**{ticker}**")
                    st.caption("Gagal memuat")

                col_btn1, col_btn2 = st.columns(2)
                with col_btn1:
                    if st.button("📊 Analisa", key=f"analyze_{ticker}", use_container_width=True):
                        st.session_state.current_ticker = ticker
                        st.rerun()
                with col_btn2:
                    if st.button("🗑️", key=f"remove_{ticker}", use_container_width=True):
                        remove_from_watchlist(ticker)
                        st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)


def render_market_overview():
    """Render quick market overview - real-time via TradingView scanner"""
    st.markdown("## 📊 Overview Pasar")

    # Quick movers - top stocks via real-time data
    popular = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "UNVR", "ICBP", "KLBF", "GOTO", "AMMN", "ANTM", "ADRO"]

    # Fetch real-time data
    with st.spinner("🔄 Memuat data real-time..."):
        rt_data = get_realtime_quotes_cached(tuple(popular))

    if not rt_data:
        st.warning("⚠️ Data real-time tidak tersedia. Cek koneksi internet.")
        # Fallback ke yfinance
        popular_yf = [t + ".JK" for t in popular[:6]]
        cols = st.columns(2)
        for i, ticker in enumerate(popular_yf[:6]):
            with cols[i % 2]:
                try:
                    fetcher = StockDataFetcher(ticker)
                    if fetcher.is_valid():
                        summary = fetcher.get_summary()
                        price = summary.get("current_price")
                        prev = summary.get("previous_close")
                        name = POPULAR_IDX_STOCKS.get(ticker, ticker)[:25]
                        if price and prev:
                            change = ((price - prev) / prev) * 100
                            delta_emoji = "🟢" if change >= 0 else "🔴"
                            if st.button(
                                f"**{ticker.replace('.JK','')}** • {format_idr(price)} • {delta_emoji} {change:+.2f}%",
                                key=f"market_{ticker}",
                                use_container_width=True,
                            ):
                                st.session_state.current_ticker = ticker.replace('.JK', '')
                                st.rerun()
                            st.caption(name)
                except Exception:
                    continue
        return

    # Data freshness indicator
    sample_quote = next(iter(rt_data.values()))
    fetched_at = sample_quote.get("fetched_at", "")
    freshness = format_freshness(fetched_at)
    st.markdown(
        f'<div class="info-box">📡 <b>Data Real-time</b> (TradingView) • Update: {freshness} • {len(rt_data)} saham</div>',
        unsafe_allow_html=True,
    )

    st.markdown("### 🏆 Saham Populer (Real-time)")

    # Sort by absolute change (most active first)
    sorted_quotes = sorted(
        rt_data.values(),
        key=lambda q: abs(q.get("change_pct", 0)),
        reverse=True,
    )

    cols = st.columns(2)
    for i, q in enumerate(sorted_quotes[:10]):
        base = q["ticker"]
        price = q["price"]
        change_pct = q["change_pct"]
        delta_emoji = "🟢" if change_pct >= 0 else "🔴"
        desc = q.get("description", base)[:25]
        volume = q.get("volume", 0)
        vol_str = f"{volume // 1000:,}K" if volume < 1_000_000 else f"{volume // 1_000_000:,}M"

        with cols[i % 2]:
            if st.button(
                f"**{base}** • {format_idr(price)} • {delta_emoji} {change_pct:+.2f}%",
                key=f"market_{base}",
                use_container_width=True,
            ):
                st.session_state.current_ticker = base
                st.rerun()
            st.caption(f"{desc} • Vol: {vol_str}")

    # === TOP MOVERS ===
    st.markdown("### 📈 Top Gainers")
    gainers = sorted(rt_data.values(), key=lambda q: q.get("change_pct", 0), reverse=True)[:3]
    cols = st.columns(3)
    for i, q in enumerate(gainers):
        with cols[i]:
            st.markdown(f"""
            <div class="metric-card" style="border-left: 4px solid #16a34a;">
                <div class="metric-label">{q['ticker']}</div>
                <div class="metric-value" style="font-size: 1.1rem;">{format_idr(q['price'])}</div>
                <div class="metric-delta-up">🟢 {q['change_pct']:+.2f}%</div>
                <div class="metric-label" style="margin-top: 0.5rem;">Vol: {q.get('volume', 0):,}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("### 📉 Top Losers")
    losers = sorted(rt_data.values(), key=lambda q: q.get("change_pct", 0))[:3]
    cols = st.columns(3)
    for i, q in enumerate(losers):
        with cols[i]:
            st.markdown(f"""
            <div class="metric-card" style="border-left: 4px solid #dc2626;">
                <div class="metric-label">{q['ticker']}</div>
                <div class="metric-value" style="font-size: 1.1rem;">{format_idr(q['price'])}</div>
                <div class="metric-delta-down">🔴 {q['change_pct']:+.2f}%</div>
                <div class="metric-label" style="margin-top: 0.5rem;">Vol: {q.get('volume', 0):,}</div>
            </div>
            """, unsafe_allow_html=True)


# === STOCK DETAIL PAGE ===

def render_stock_detail(ticker_input: str):
    """Render full stock analysis"""
    ticker_clean = ticker_input.replace(".JK", "").strip()
    ticker_full = f"{ticker_clean}.JK"

    # Header with watchlist button
    col_h1, col_h2 = st.columns([4, 1])
    with col_h1:
        st.markdown(f"## 📊 {ticker_clean}")
    with col_h2:
        is_watched = ticker_clean in st.session_state.watchlist
        if is_watched:
            if st.button("⭐", help="Hapus dari watchlist", use_container_width=True):
                remove_from_watchlist(ticker_clean)
                st.rerun()
        else:
            if st.button("☆", help="Tambah ke watchlist", use_container_width=True):
                add_to_watchlist(ticker_clean)
                st.rerun()

    # Fetch data
    with st.spinner(f"🔄 Mengambil data {ticker_full}..."):
        df, info_data = fetch_stock_data(ticker_full, "1y")

    if df is None or df.empty:
        st.error(f"❌ Gagal mengambil data **{ticker_full}**")
        return

    info = info_data["info"]
    summary = info_data["summary"]
    current_price = summary.get("current_price") or float(df["Close"].iloc[-1])
    company_name = summary.get("name", ticker_clean)

    st.caption(f"**{company_name}** • {summary.get('sector', 'N/A')}")

    # === REAL-TIME PANEL (NEW) ===
    with st.spinner("📡 Memuat data real-time..."):
        rt_quote = get_realtime_quote(ticker_clean, use_cache=True, ttl=300)
        foreign_flow = get_foreign_flow_cached(ticker_clean)
        broker_summary = get_broker_summary_cached(ticker_clean)

    if rt_quote:
        rt_dict = rt_quote.to_dict() if hasattr(rt_quote, "to_dict") else rt_quote
        freshness = format_freshness(rt_dict.get("fetched_at", ""))
        rt_change = rt_dict.get("change_pct", 0)
        rt_delta_class = "metric-delta-up" if rt_change >= 0 else "metric-delta-down"
        rt_delta_emoji = "🟢" if rt_change >= 0 else "🔴"

        st.markdown(
            f'<div class="info-box">📡 <b>Harga Real-time</b> via TradingView • Update: {freshness}</div>',
            unsafe_allow_html=True,
        )

        cols = st.columns(3)
        with cols[0]:
            st.markdown(f"""
            <div class="metric-card" style="border-left: 4px solid {('#16a34a' if rt_change >= 0 else '#dc2626')};">
                <div class="metric-label">Harga RT</div>
                <div class="metric-value">{format_idr(rt_dict.get('price'))}</div>
                <div class="{rt_delta_class}">{rt_delta_emoji} {rt_change:+.2f}%</div>
            </div>
            """, unsafe_allow_html=True)
        with cols[1]:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Volume</div>
                <div class="metric-value" style="font-size: 1.1rem;">{rt_dict.get('volume', 0):,}</div>
                <div class="metric-label">Value: {format_idr(rt_dict.get('value_idr', 0))}</div>
            </div>
            """, unsafe_allow_html=True)
        with cols[2]:
            mcap = rt_dict.get("market_cap")
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Market Cap</div>
                <div class="metric-value" style="font-size: 1.1rem;">{(f'{mcap/1e12:.2f}T' if mcap and mcap > 1e12 else (f'{mcap/1e9:.1f}B' if mcap else 'N/A'))}</div>
                <div class="metric-label">IDR</div>
            </div>
            """, unsafe_allow_html=True)

    # === FOREIGN FLOW + BROKER SUMMARY (NEW) ===
    if foreign_flow or broker_summary:
        st.markdown("### 🌊 Bandarmologi (Proxy)")
        cols = st.columns(2)
        with cols[0]:
            if foreign_flow:
                ff_emoji = {"BUY": "🟢", "SELL": "🔴", "NEUTRAL": "🟡"}.get(foreign_flow.get("signal"), "⚪")
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-label">Foreign Flow (estimasi)</div>
                    <div class="metric-value" style="font-size: 1.25rem;">{ff_emoji} {foreign_flow.get('signal', 'N/A')}</div>
                    <div class="metric-label">Confidence: {foreign_flow.get('confidence', 0)*100:.0f}%</div>
                    <div class="metric-label" style="margin-top: 0.5rem;">{foreign_flow.get('reasoning', '')}</div>
                </div>
                """, unsafe_allow_html=True)
        with cols[1]:
            if broker_summary:
                bs_score = broker_summary.get("accumulation_score", 0)
                bs_emoji = "🟢 Akumulasi" if bs_score > 0.3 else ("🔴 Distribusi" if bs_score < -0.3 else "🟡 Netral")
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-label">Aktivitas Broker (proxy)</div>
                    <div class="metric-value" style="font-size: 1.25rem;">{bs_emoji}</div>
                    <div class="metric-label">Block trade: {broker_summary.get('block_trade_count', 0)} • Score: {bs_score:+.2f}</div>
                    <div class="metric-label" style="margin-top: 0.5rem;">{broker_summary.get('reasoning', '')}</div>
                </div>
                """, unsafe_allow_html=True)
        st.caption("⚠️ Catatan: Foreign flow & broker summary adalah **estimasi berbasis price-volume** (IDX tidak expose data broker gratis). Untuk data real, gunakan VIP IDX feed.")


    # === METRIC CARDS (Mobile-friendly grid) ===
    price_change = float(df["Close"].iloc[-1] - df["Close"].iloc[-2])
    price_change_pct = (price_change / df["Close"].iloc[-2]) * 100
    delta_class = "metric-delta-up" if price_change >= 0 else "metric-delta-down"
    delta_sign = "+" if price_change >= 0 else ""

    cols = st.columns(2)  # 2 columns for mobile
    with cols[0]:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Harga Terakhir</div>
            <div class="metric-value">{format_idr(current_price)}</div>
            <div class="{delta_class}">{delta_sign}{price_change:,.0f} ({delta_sign}{price_change_pct:.2f}%)</div>
        </div>
        """, unsafe_allow_html=True)
    with cols[1]:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Volume</div>
            <div class="metric-value">{int(summary.get('volume') or 0):,}</div>
            <div class="metric-delta-up">Avg: {int(summary.get('avg_volume') or 0):,}</div>
        </div>
        """, unsafe_allow_html=True)

    cols = st.columns(2)
    with cols[0]:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">52w High</div>
            <div class="metric-value">{format_idr(summary.get('52w_high'))}</div>
        </div>
        """, unsafe_allow_html=True)
    with cols[1]:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">52w Low</div>
            <div class="metric-value">{format_idr(summary.get('52w_low'))}</div>
        </div>
        """, unsafe_allow_html=True)

    # === RUN ANALYSIS ===
    import hashlib
    df_hash = hashlib.md5(str(df.values.tobytes()).encode()).hexdigest()[:16]
    info_str = str(sorted(info.items()))

    with st.spinner("🔬 Menganalisa..."):
        technical = analyze_technical_cached(df_hash, df)
        fundamental = analyze_fundamental_cached(info_str, info)
        behavioral = analyze_behavioral_cached(df_hash, df)

        sentiment = None
        try:
            sentiment = analyze_sentiment_cached(ticker_clean, company_name, 10)
        except Exception:
            pass

    rec = Recommender(
        technical=technical, fundamental=fundamental,
        behavioral=behavioral, sentiment=sentiment,
        current_price=current_price,
    ).recommend()

    # === RECOMMENDATION CARD (Hero) ===
    render_hero_recommendation(rec, current_price)

    # === WARNINGS ===
    for w in rec.warnings:
        st.markdown(f'<div class="warning-box">⚠️ {w}</div>', unsafe_allow_html=True)

    # === TABS: DETAILED ANALYSIS ===
    render_analysis_tabs(technical, fundamental, behavioral, sentiment, df, ticker_clean)


def render_hero_recommendation(rec, current_price):
    """Render prominent recommendation card"""
    card_class = get_rec_card_class(rec.action.value)

    confidence_color = "#ffffff" if rec.confidence >= 40 else "rgba(255,255,255,0.9)"

    horizon_short = {
        "SHORT": "Jangka Pendek (1-7 hari)",
        "MEDIUM": "Jangka Menengah (1-4 minggu)",
        "LONG": "Jangka Panjang (1-6 bulan)",
    }.get(rec.horizon.value, rec.horizon.value)

    # Recommendation card HTML
    rec_html = f"""
    <div class="{card_class}">
        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
            <div>
                <div style="font-size: 0.85rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;">📊 Rekomendasi</div>
                <div style="font-size: clamp(2rem, 5vw, 3rem); font-weight: 900; line-height: 1; margin-top: 0.25rem;">
                    {rec.action.emoji} {rec.action.indonesian}
                </div>
                <div style="font-size: 0.95rem; opacity: 0.95; margin-top: 0.5rem;">
                    🕐 {horizon_short}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.85rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;">Confidence</div>
                <div style="font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 900; line-height: 1;">
                    {rec.confidence:.0f}%
                </div>
                <div style="font-size: 0.85rem; opacity: 0.95; margin-top: 0.25rem;">
                    💰 {format_idr(current_price)}
                </div>
            </div>
        </div>
    </div>
    """
    st.markdown(rec_html, unsafe_allow_html=True)

    # Price targets grid
    if rec.entry_zone or rec.target_price or rec.stop_loss:
        st.markdown("### 💰 Price Action Plan")
        cols = st.columns(3)
        with cols[0]:
            if rec.entry_zone:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-label">📍 Entry Zone</div>
                    <div class="metric-value" style="font-size: 1rem;">
                        {format_idr(rec.entry_zone[0])}<br>
                        <small>— {format_idr(rec.entry_zone[1])}</small>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        with cols[1]:
            if rec.target_price:
                change = ((rec.target_price - current_price) / current_price * 100) if current_price else 0
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-label">🎯 Target</div>
                    <div class="metric-value" style="font-size: 1rem;">{format_idr(rec.target_price)}</div>
                    <div class="metric-delta-up">{change:+.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
        with cols[2]:
            if rec.stop_loss:
                sl_change = ((rec.stop_loss - current_price) / current_price * 100) if current_price else 0
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-label">🛑 Stop Loss</div>
                    <div class="metric-value" style="font-size: 1rem;">{format_idr(rec.stop_loss)}</div>
                    <div class="metric-delta-down">{sl_change:+.1f}%</div>
                </div>
                """, unsafe_allow_html=True)

        if rec.risk_reward_ratio:
            rr_status = "✅ Bagus" if rec.risk_reward_ratio >= 2 else ("⚠️ Cukup" if rec.risk_reward_ratio >= 1 else "❌ Kurang")
            st.markdown(f"**Risk/Reward:** {rec.risk_reward_ratio:.2f}x — {rr_status}")


def render_analysis_tabs(technical, fundamental, behavioral, sentiment, df, ticker):
    """Render all analysis in tabs"""
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Teknikal", "💼 Fundamental", "🔍 Pattern", "📰 Sentimen", "📈 Chart"
    ])

    with tab1:
        st.markdown(f"### 📊 Technical Analysis")
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Overall Score", f"{technical.overall_score:.0f}/100")
        with col2:
            st.metric("Trend", technical.trend)
        with col3:
            st.metric("Signal", technical.overall_signal.indonesian)
        st.markdown(f"_{technical.summary}_")

        st.markdown("#### Indikator")
        for ind in technical.indicators:
            with st.container():
                col_a, col_b = st.columns([1, 3])
                with col_a:
                    st.markdown(f"**{ind.name}**")
                    st.caption(f"Nilai: {ind.value}")
                with col_b:
                    st.markdown(get_signal_badge_html(ind.signal.indonesian, ind.score), unsafe_allow_html=True)
                    st.caption(ind.explanation)

    with tab2:
        st.markdown(f"### 💼 Fundamental Analysis")
        avail = fundamental.data_availability * 100
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Overall Score", f"{fundamental.overall_score:.0f}/100")
        with col2:
            st.metric("Data Availability", f"{avail:.0f}%")
        st.markdown(f"_{fundamental.summary}_")

        st.markdown("#### Metrik Detail")
        for m in fundamental.metrics:
            if m.signal.value == "UNKNOWN":
                continue
            with st.container():
                col_a, col_b = st.columns([1, 3])
                with col_a:
                    st.markdown(f"**{m.name}**")
                    st.caption(f"Benchmark: {m.benchmark}")
                with col_b:
                    st.markdown(get_signal_badge_html(m.signal.indonesian, m.score), unsafe_allow_html=True)
                    st.caption(f"{m.formatted} — {m.explanation}")

    with tab3:
        st.markdown(f"### 🔍 Behavioral Patterns")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Overall Score", f"{behavioral.overall_score:.0f}/100")
        with col2:
            st.metric("Signal", behavioral.overall_signal.indonesian)
        st.markdown(f"_{behavioral.summary}_")

        st.markdown("#### Pola Terdeteksi")
        for p in behavioral.patterns:
            with st.container():
                col_a, col_b = st.columns([1, 3])
                with col_a:
                    st.markdown(f"**{p.name}**")
                    st.caption(p.pattern)
                with col_b:
                    st.markdown(get_signal_badge_html(p.signal.indonesian, p.score), unsafe_allow_html=True)
                    st.caption(p.description)

        if behavioral.support_levels or behavioral.resistance_levels:
            st.markdown("#### Key Levels")
            cols = st.columns(2)
            with cols[0]:
                if behavioral.support_levels:
                    st.success("🟢 Support: " + ", ".join([format_idr(s) for s in behavioral.support_levels]))
            with cols[1]:
                if behavioral.resistance_levels:
                    st.error("🔴 Resistance: " + ", ".join([format_idr(r) for r in behavioral.resistance_levels]))

    with tab4:
        if sentiment is None or not sentiment.articles:
            st.info("📰 Sentimen tidak tersedia. Aktifkan di pengaturan.")
        else:
            st.markdown(f"### 📰 Sentimen Berita")
            col1, col2, col3 = st.columns(3)
            with col1:
                mood_emoji = {
                    "VERY_POSITIVE": "😄", "POSITIVE": "🙂",
                    "NEUTRAL": "😐", "NEGATIVE": "🙁", "VERY_NEGATIVE": "😠",
                }.get(sentiment.overall_label.value, "❓")
                st.metric("Overall", f"{mood_emoji} {sentiment.overall_label.indonesian}")
            with col2:
                st.metric("Score", f"{sentiment.overall_score:+.0f}/100")
            with col3:
                st.metric("Artikel", len(sentiment.articles))

            st.markdown(f"_{sentiment.summary}_")

            st.markdown("#### 📰 Headlines")
            for art in sentiment.articles[:10]:
                sent_emoji = {
                    "VERY_POSITIVE": "🟢🟢", "POSITIVE": "🟢",
                    "NEUTRAL": "🟡", "NEGATIVE": "🔴", "VERY_NEGATIVE": "🔴🔴",
                }.get(art.sentiment.value, "⚪")
                st.markdown(f"{sent_emoji} [{art.title[:80]}]({art.url})", unsafe_allow_html=False)
                st.caption(f"{art.source} • {art.sentiment_score:+.2f}")

    with tab5:
        st.markdown("### 📈 Price Chart")
        fig = create_candlestick_chart(df, ticker)
        st.plotly_chart(fig, use_container_width=True)


def create_candlestick_chart(df, ticker):
    """Candlestick + technical indicators"""
    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.75, 0.25],
    )

    fig.add_trace(
        go.Candlestick(
            x=df.index, open=df["Open"], high=df["High"],
            low=df["Low"], close=df["Close"], name="Harga",
        ),
        row=1, col=1,
    )

    for period, color in [(20, "orange"), (50, "blue"), (200, "red")]:
        col_name = f"SMA_{period}"
        if col_name in df.columns:
            fig.add_trace(
                go.Scatter(x=df.index, y=df[col_name], name=f"SMA {period}",
                           line=dict(color=color, width=1)),
                row=1, col=1,
            )

    if "Volume" in df.columns:
        colors = ["red" if df["Close"].iloc[i] < df["Open"].iloc[i] else "green"
                  for i in range(len(df))]
        fig.add_trace(
            go.Bar(x=df.index, y=df["Volume"], name="Volume", marker_color=colors),
            row=2, col=1,
        )

    fig.update_layout(
        height=500,
        xaxis_rangeslider_visible=False,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        template="plotly_white",
        margin=dict(l=0, r=0, t=10, b=0),
    )
    return fig


# === HOME PAGE ===

def render_home():
    """Landing/home page"""
    st.markdown('<p class="main-header">📈 Saham Analyzer IDX</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="subheader">Analisa saham Indonesia dengan rekomendasi Buy/Hold/Sell berbasis multi-signal</p>',
        unsafe_allow_html=True,
    )

    # Disclaimer
    st.markdown("""
    <div class="danger-box">
        <strong>⚠️ Disclaimer:</strong> Aplikasi ini adalah <strong>alat bantu analisa</strong>,
        bukan saran finansial. Semua keputusan investasi sepenuhnya tanggung jawab Anda.
    </div>
    """, unsafe_allow_html=True)

    # Feature highlights
    st.markdown("### 🎯 Fitur Unggulan")
    cols = st.columns(2)
    features = [
        ("📊", "Analisa Teknikal", "RSI, MACD, MA, Bollinger, Stochastic"),
        ("💼", "Analisa Fundamental", "P/E, ROE, DER, Profit Margin"),
        ("🔍", "Behavioral Patterns", "Akumulasi/Distribusi, Support/Resistance"),
        ("📰", "Sentimen Berita ID", "Multi-source NLP Bahasa Indonesia"),
        ("🎯", "Rekomendasi Cerdas", "Buy/Hold/Sell + Entry Zone + Target + SL"),
        ("⭐", "Watchlist", "Simpan saham favorit untuk monitoring"),
    ]
    for i, (icon, title, desc) in enumerate(features):
        with cols[i % 2]:
            st.markdown(f"""
            <div class="card">
                <div style="font-size: 2rem;">{icon}</div>
                <div style="font-weight: 700; font-size: 1.1rem; margin-top: 0.5rem;">{title}</div>
                <div style="color: #6b7280; font-size: 0.9rem;">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

    # How to use
    with st.expander("📖 Cara Pakai", expanded=False):
        st.markdown("""
        1. **Cari saham** dengan ketik ticker (BBCA) atau pilih dari daftar populer
        2. **Lihat rekomendasi** utama (Buy/Hold/Sell) dengan confidence score
        3. **Baca reasoning** lengkap di tab breakdown
        4. **Tambahkan ke watchlist** dengan tombol ⭐
        5. **Bandingkan** dengan saham lain
        6. **Selalu DYOR** (Do Your Own Research) sebelum investasi!
        """)


# === MAIN APP ===

# Top navigation
page = render_top_nav()

st.markdown("---")

# Render based on page
if page == "⭐ Watchlist":
    render_watchlist()
elif page == "📊 Pasar":
    render_market_overview()
    st.markdown("---")
    render_watchlist()
else:  # "🔍 Analisa"
    # If there's a current ticker set (from watchlist click)
    if st.session_state.current_ticker:
        render_stock_detail(st.session_state.current_ticker)
    else:
        # Show search
        ticker_input = render_stock_search()

        if ticker_input:
            render_stock_detail(ticker_input)
        else:
            render_home()


# Footer
st.markdown("---")
with st.expander("🚀 Rekomendasi Fitur Tambahan"):
    st.markdown("""
    **Untuk akurasi lebih tinggi:**
    1. **Backtesting Engine** — Validasi akurasi rekomendasi historis
    2. **Alert System** — Notifikasi real-time ke Telegram
    3. **Multi-timeframe Analysis** — Daily + Weekly + Monthly sekaligus
    4. **Foreign Flow** — Net buy/sell asing dari IDX
    5. **Portfolio Optimizer** — Alokasi multiple stocks

    **Coming soon: Next.js version dengan PWA support untuk mobile!**
    """)

st.caption("📊 Data: Yahoo Finance | Sentimen: Google News + media ID | © 2026")
