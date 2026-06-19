"""
Behavioral Patterns Module
Mendeteksi "kebiasaan" atau pola perilaku saham:

1. Volume Behavior - akumulasi/distribusi smart money
2. Price Momentum - kecepatan & konsistensi pergerakan
3. Support/Resistance - level psikologis
4. Volatility Pattern - apakah saham stabil atau choppy
5. Trading Range - apakah harga cenderung sideway atau trending
6. Intraday Behavior - pola perilaku harian
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class BehavioralSignal(Enum):
    """Enum untuk sinyal pola perilaku"""
    STRONG_BULLISH = "STRONG_BULLISH"
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"
    BEARISH = "BEARISH"
    STRONG_BEARISH = "STRONG_BEARISH"

    @property
    def score(self) -> float:
        mapping = {
            "STRONG_BULLISH": 2.0,
            "BULLISH": 1.0,
            "NEUTRAL": 0.0,
            "BEARISH": -1.0,
            "STRONG_BEARISH": -2.0,
        }
        return mapping[self.value]

    @property
    def indonesian(self) -> str:
        mapping = {
            "STRONG_BULLISH": "Sangat Bullish",
            "BULLISH": "Bullish",
            "NEUTRAL": "Netral",
            "BEARISH": "Bearish",
            "STRONG_BEARISH": "Sangat Bearish",
        }
        return mapping[self.value]


@dataclass
class BehavioralPattern:
    """Satu pola perilaku yang terdeteksi"""
    name: str
    pattern: str  # Nama pola
    signal: BehavioralSignal
    score: float
    description: str
    implication: str  # Implikasi untuk investor


@dataclass
class BehavioralAnalysis:
    """Hasil lengkap analisa behavioral"""
    patterns: List[BehavioralPattern] = field(default_factory=list)
    overall_score: float = 0.0
    overall_signal: BehavioralSignal = BehavioralSignal.NEUTRAL
    support_levels: List[float] = field(default_factory=list)
    resistance_levels: List[float] = field(default_factory=list)
    summary: str = ""


class BehavioralAnalyzer:
    """Kelas utama untuk analisa pola perilaku saham"""

    def __init__(self, df: pd.DataFrame):
        if df.empty or "Close" not in df.columns:
            raise ValueError("DataFrame tidak valid")
        self.df = df.copy()

    def analyze(self) -> BehavioralAnalysis:
        """Jalankan semua analisa behavioral"""
        patterns: List[BehavioralPattern] = []

        patterns.append(self._analyze_volume_behavior())
        patterns.append(self._analyze_momentum())
        patterns.append(self._analyze_volatility_pattern())
        patterns.append(self._analyze_trading_range())
        patterns.append(self._analyze_price_action())

        # Support & resistance
        support_levels, resistance_levels = self._find_support_resistance()

        scores = [p.score for p in patterns]
        overall_score = float(np.mean(scores)) * 25 if scores else 0.0

        if overall_score >= 60:
            signal = BehavioralSignal.STRONG_BULLISH
        elif overall_score >= 20:
            signal = BehavioralSignal.BULLISH
        elif overall_score <= -60:
            signal = BehavioralSignal.STRONG_BEARISH
        elif overall_score <= -20:
            signal = BehavioralSignal.BEARISH
        else:
            signal = BehavioralSignal.NEUTRAL

        summary = self._generate_summary(signal, patterns, support_levels, resistance_levels)

        return BehavioralAnalysis(
            patterns=patterns,
            overall_score=overall_score,
            overall_signal=signal,
            support_levels=support_levels,
            resistance_levels=resistance_levels,
            summary=summary,
        )

    # === PATTERN 1: VOLUME BEHAVIOR (akumulasi/distribusi) ===

    def _analyze_volume_behavior(self) -> BehavioralPattern:
        """Deteksi akumulasi vs distribusi"""
        if "Volume" not in self.df.columns or self.df["Volume"].isna().all():
            return BehavioralPattern(
                "Volume Behavior", "Unknown", BehavioralSignal.NEUTRAL, 0,
                "Data volume tidak tersedia", "Tidak bisa dideteksi"
            )

        recent = self.df.tail(20)
        if len(recent) < 5:
            return BehavioralPattern(
                "Volume Behavior", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Data terlalu sedikit", "Butuh minimal 5 hari"
            )

        # OBV trend
        obv_recent = recent["Volume"].iloc[-5:].sum()
        obv_prev = recent["Volume"].iloc[-10:-5].sum() if len(recent) >= 10 else obv_recent

        # Price trend
        price_recent = float(self.df["Close"].iloc[-1])
        price_5d_ago = float(self.df["Close"].iloc[-5])

        # Up/down day ratio
        price_changes = recent["Close"].diff().dropna()
        up_days = (price_changes > 0).sum()
        down_days = (price_changes < 0).sum()

        # Avg volume up days vs down days
        if "Volume" in recent.columns and len(price_changes) > 0:
            vol_up = recent[recent["Close"].diff() > 0]["Volume"].mean() if up_days > 0 else 0
            vol_down = recent[recent["Close"].diff() < 0]["Volume"].mean() if down_days > 0 else 0
        else:
            vol_up = vol_down = 0

        # Detect accumulation/distribution
        if vol_up > vol_down * 1.3 and price_recent > price_5d_ago:
            pattern = "Akumulasi"
            signal = BehavioralSignal.BULLISH
            score = 1.5
            desc = (
                f"Volume hari naik ({vol_up:,.0f}) > hari turun ({vol_down:,.0f}). "
                f"Harga naik dalam 5 hari terakhir."
            )
            impl = "Smart money sedang akumulasi — potensi kenaikan berlanjut"
        elif vol_down > vol_up * 1.3 and price_recent < price_5d_ago:
            pattern = "Distribusi"
            signal = BehavioralSignal.BEARISH
            score = -1.5
            desc = (
                f"Volume hari turun ({vol_down:,.0f}) > hari naik ({vol_up:,.0f}). "
                f"Harga turun dalam 5 hari terakhir."
            )
            impl = "Smart money sedang distribusi/distress sell — waspadai penurunan lanjut"
        elif vol_up > vol_down and price_recent > price_5d_ago:
            pattern = "Konfirmasi Naik"
            signal = BehavioralSignal.BULLISH
            score = 1.0
            desc = "Volume mendukung kenaikan harga"
            impl = "Tren naik terkonfirmasi volume"
        elif vol_down > vol_up and price_recent < price_5d_ago:
            pattern = "Konfirmasi Turun"
            signal = BehavioralSignal.BEARISH
            score = -1.0
            desc = "Volume mendukung penurunan harga"
            impl = "Tren turun terkonfirmasi volume"
        else:
            pattern = "Mixed / Sideway"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = "Volume tidak konfirmasikan arah harga"
            impl = "Tunggu konfirmasi sebelum entry"

        return BehavioralPattern(
            "Volume Behavior", pattern, signal, score, desc, impl
        )

    # === PATTERN 2: MOMENTUM ===

    def _analyze_momentum(self) -> BehavioralPattern:
        """Kecepatan & konsistensi pergerakan harga"""
        if len(self.df) < 20:
            return BehavioralPattern(
                "Momentum", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Butuh minimal 20 hari", "N/A"
            )

        returns = self.df["Close"].pct_change().dropna().tail(20)

        if len(returns) < 5:
            return BehavioralPattern(
                "Momentum", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Data return tidak cukup", "N/A"
            )

        # Total return 20d
        total_return = (self.df["Close"].iloc[-1] / self.df["Close"].iloc[-20] - 1) * 100

        # Consistency (positive days / total days)
        positive_days = (returns > 0).sum()
        consistency = positive_days / len(returns)

        # Average daily return
        avg_return = returns.mean() * 100

        # Detect patterns
        if total_return > 15 and consistency > 0.6:
            pattern = "Strong Uptrend"
            signal = BehavioralSignal.STRONG_BULLISH
            score = 2.0
            desc = (
                f"Total return 20d: +{total_return:.1f}%, "
                f"konsistensi naik {consistency*100:.0f}% dari total hari"
            )
            impl = "Momentum bullish kuat — tapi waspadai overbought"
        elif total_return > 5 and consistency > 0.5:
            pattern = "Steady Uptrend"
            signal = BehavioralSignal.BULLISH
            score = 1.0
            desc = f"Total return 20d: +{total_return:.1f}%, tren naik konsisten"
            impl = "Momentum positif, masih bisa di-trend-follow"
        elif total_return < -15 and consistency < 0.4:
            pattern = "Strong Downtrend"
            signal = BehavioralSignal.STRONG_BEARISH
            score = -2.0
            desc = (
                f"Total return 20d: {total_return:.1f}%, "
                f"konsistensi turun {100-consistency*100:.0f}%"
            )
            impl = "Momentum bearish kuat — hindari catch-the-falling-knife"
        elif total_return < -5 and consistency < 0.5:
            pattern = "Steady Downtrend"
            signal = BehavioralSignal.BEARISH
            score = -1.0
            desc = f"Total return 20d: {total_return:.1f}%, tren turun"
            impl = "Tekanan jual masih dominan"
        elif abs(total_return) < 3:
            pattern = "Sideway / Chop"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Total return 20d: {total_return:+.1f}%, harga konsolidasi"
            impl = "Tunggu breakout untuk konfirmasi arah"
        else:
            pattern = "Mixed"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Total return 20d: {total_return:+.1f}%, momentum belum jelas"
            impl = "Tunggu konfirmasi"

        return BehavioralPattern(
            "Momentum", pattern, signal, score, desc, impl
        )

    # === PATTERN 3: VOLATILITY ===

    def _analyze_volatility_pattern(self) -> BehavioralPattern:
        """Pola volatilitas — apakah stabil atau liar"""
        if len(self.df) < 20:
            return BehavioralPattern(
                "Volatility", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Data kurang", "N/A"
            )

        returns = self.df["Close"].pct_change().dropna().tail(20)
        volatility = returns.std() * np.sqrt(252) * 100  # Annualized

        if volatility > 50:
            pattern = "Sangat Volatile"
            signal = BehavioralSignal.NEUTRAL  # High vol = high risk both ways
            score = 0.0
            desc = f"Volatilitas {volatility:.1f}% per tahun — sangat tinggi"
            impl = "Cocok untuk trader agresif, AVOID untuk konservatif"
        elif volatility > 35:
            pattern = "Volatile"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Volatilitas {volatility:.1f}% per tahun — tinggi"
            impl = "Fluktuasi besar, sizing harus kecil"
        elif volatility > 20:
            pattern = "Moderate"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Volatilitas {volatility:.1f}% per tahun — moderat"
            impl = "Risiko proporsional, umum untuk saham IDX"
        else:
            pattern = "Stabil"
            signal = BehavioralSignal.BULLISH  # Low vol = attractive
            score = 0.5
            desc = f"Volatilitas {volatility:.1f}% per tahun — rendah/stabil"
            impl = "Cocok untuk investor konservatif"

        return BehavioralPattern(
            "Volatility", pattern, signal, score, desc, impl
        )

    # === PATTERN 4: TRADING RANGE ===

    def _analyze_trading_range(self) -> BehavioralPattern:
        """Pola range — apakah sideway atau trending"""
        if len(self.df) < 30:
            return BehavioralPattern(
                "Trading Range", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Data kurang", "N/A"
            )

        recent = self.df.tail(30)
        high = float(recent["High"].max())
        low = float(recent["Low"].min())
        close = float(recent["Close"].iloc[-1])

        range_size = (high - low) / close * 100
        position_in_range = (close - low) / (high - low) * 100 if (high - low) > 0 else 50

        if range_size < 8:
            pattern = "Tight Range"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = (
                f"Range 30d sempit ({range_size:.1f}%), "
                f"harga di {position_in_range:.0f}% range"
            )
            impl = "Potensi breakout besar — pantau tembusan"
        elif range_size > 25:
            pattern = "Wide Range"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Range 30d lebar ({range_size:.1f}%)"
            impl = "Saham aktif, peluang intraday/swing lebih banyak"
        else:
            pattern = "Normal Range"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = f"Range 30d ({range_size:.1f}%), harga di {position_in_range:.0f}% range"
            impl = "Perdagangan normal"

        if position_in_range > 80:
            pattern += " (dekat resistance)"
            impl += " — dekat resistance, waspadai penolakan"
        elif position_in_range < 20:
            pattern += " (dekat support)"
            impl += " — dekat support, pantau pantulan"

        return BehavioralPattern(
            "Trading Range", pattern, signal, score, desc, impl
        )

    # === PATTERN 5: PRICE ACTION ===

    def _analyze_price_action(self) -> BehavioralPattern:
        """Pola price action — higher highs/lows atau lower"""
        if len(self.df) < 10:
            return BehavioralPattern(
                "Price Action", "Insufficient Data", BehavioralSignal.NEUTRAL, 0,
                "Data kurang", "N/A"
            )

        recent_10 = self.df.tail(10)
        recent_5 = self.df.tail(5)
        recent_3 = self.df.tail(3)

        highs_recent = float(recent_3["High"].max())
        highs_prev = float(recent_10["High"].iloc[:-3].max())

        lows_recent = float(recent_3["Low"].min())
        lows_prev = float(recent_10["Low"].iloc[:-3].min())

        higher_high = highs_recent > highs_prev
        higher_low = lows_recent > lows_prev
        lower_high = highs_recent < highs_prev
        lower_low = lows_recent < lows_prev

        if higher_high and higher_low:
            pattern = "Higher Highs & Higher Lows"
            signal = BehavioralSignal.BULLISH
            score = 1.5
            desc = "Memperhatikan higher highs & higher lows — uptrend sehat"
            impl = "Pattern bullish — trend-follow masih aman"
        elif lower_high and lower_low:
            pattern = "Lower Highs & Lower Lows"
            signal = BehavioralSignal.BEARISH
            score = -1.5
            desc = "Lower highs & lower lows — downtrend terkonfirmasi"
            impl = "Hindari posisi buy, tunggu reversal"
        elif higher_high and lower_low:
            pattern = "Expansion / Volatile"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = "Higher high tapi lower low — pasar tidak menentu"
            impl = "Tunggu konfirmasi arah"
        else:
            pattern = "Consolidation"
            signal = BehavioralSignal.NEUTRAL
            score = 0.0
            desc = "Tidak ada pola jelas, harga konsolidasi"
            impl = "Tunggu breakout"

        return BehavioralPattern(
            "Price Action", pattern, signal, score, desc, impl
        )

    # === SUPPORT / RESISTANCE ===

    def _find_support_resistance(self) -> Tuple[List[float], List[float]]:
        """Cari level support & resistance dari recent pivot points"""
        if len(self.df) < 20:
            return [], []

        recent = self.df.tail(60)

        # Method: cari local minima/maxima dalam window
        supports = []
        resistances = []

        # Cluster harga yang sering disentuh (within 2% range)
        closes = recent["Close"].values
        lows = recent["Low"].values
        highs = recent["High"].values

        # Cari support: level dimana harga sering jadi low dan bouncing
        current_price = float(self.df["Close"].iloc[-1])

        # Minima lokal
        for i in range(2, len(lows) - 2):
            if (lows[i] < lows[i - 1] and lows[i] < lows[i + 1] and
                lows[i] < lows[i - 2] and lows[i] < lows[i + 2]):
                supports.append(float(lows[i]))

        # Maxima lokal
        for i in range(2, len(highs) - 2):
            if (highs[i] > highs[i - 1] and highs[i] > highs[i + 1] and
                highs[i] > highs[i - 2] and highs[i] > highs[i + 2]):
                resistances.append(float(highs[i]))

        # Filter: hanya yang dekat dengan harga saat ini (within 15%)
        supports = [s for s in supports if abs(s - current_price) / current_price < 0.15]
        resistances = [r for r in resistances if abs(r - current_price) / current_price < 0.15]

        # Ambil 2 terdekat di bawah (support) dan 2 terdekat di atas (resistance)
        supports_below = sorted([s for s in supports if s < current_price])[-2:]
        resistances_above = sorted([r for r in resistances if r > current_price])[:2]

        return supports_below, resistances_above

    def _generate_summary(
        self,
        signal: BehavioralSignal,
        patterns: List[BehavioralPattern],
        supports: List[float],
        resistances: List[float],
    ) -> str:
        """Generate summary"""
        mood_map = {
            BehavioralSignal.STRONG_BULLISH: "sangat bullish",
            BehavioralSignal.BULLISH: "bullish",
            BehavioralSignal.NEUTRAL: "netral",
            BehavioralSignal.BEARISH: "bearish",
            BehavioralSignal.STRONG_BEARISH: "sangat bearish",
        }
        mood = mood_map.get(signal, "tidak jelas")

        support_str = ", ".join([f"Rp{s:,.0f}" for s in supports]) if supports else "tidak terdeteksi"
        resist_str = ", ".join([f"Rp{r:,.0f}" for r in resistances]) if resistances else "tidak terdeteksi"

        # Highlight 2 pola paling signifikan
        significant = sorted(patterns, key=lambda p: abs(p.score), reverse=True)[:2]

        return (
            f"Pola perilaku saham menunjukkan bias **{mood}**. "
            f"Support di: {support_str}. Resistance di: {resist_str}.\n\n"
            f"Pola dominan:\n- " +
            "\n- ".join([f"**{p.pattern}**: {p.description}" for p in significant])
        )


if __name__ == "__main__":
    from data_fetcher import StockDataFetcher

    fetcher = StockDataFetcher("BBCA.JK")
    df = fetcher.get_historical_data(period="6mo")
    analyzer = BehavioralAnalyzer(df)
    result = analyzer.analyze()

    print(f"Overall: {result.overall_signal.value} (score: {result.overall_score:.1f})")
    print(f"Summary: {result.summary}\n")
    for p in result.patterns:
        print(f"  [{p.pattern}] {p.signal.value} - {p.description}")
