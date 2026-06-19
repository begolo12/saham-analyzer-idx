"""
Technical Analysis Module
Menghitung indikator teknikal standar industri dan menghasilkan sinyal.

Indikator yang dihitung:
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Moving Averages (SMA-20, SMA-50, SMA-200, EMA-12, EMA-26)
- Bollinger Bands
- Stochastic Oscillator
- Volume Profile Analysis
- Trend Detection (Golden Cross / Death Cross)
- Support & Resistance Levels
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum


class Signal(Enum):
    """Enum untuk kekuatan sinyal teknikal"""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    NEUTRAL = "NEUTRAL"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"

    @property
    def score(self) -> float:
        """Nilai numerik sinyal: -2 (strong sell) sampai +2 (strong buy)"""
        mapping = {
            "STRONG_BUY": 2.0,
            "BUY": 1.0,
            "NEUTRAL": 0.0,
            "SELL": -1.0,
            "STRONG_SELL": -2.0,
        }
        return mapping[self.value]

    @property
    def indonesian(self) -> str:
        """Label dalam bahasa Indonesia"""
        mapping = {
            "STRONG_BUY": "Sangat Bullish",
            "BUY": "Bullish",
            "NEUTRAL": "Netral",
            "SELL": "Bearish",
            "STRONG_SELL": "Sangat Bearish",
        }
        return mapping[self.value]


@dataclass
class IndicatorResult:
    """Hasil satu indikator teknikal"""
    name: str
    value: Any
    signal: Signal
    score: float
    explanation: str


@dataclass
class TechnicalAnalysis:
    """Hasil lengkap analisa teknikal"""
    indicators: List[IndicatorResult] = field(default_factory=list)
    overall_score: float = 0.0  # -100 sampai +100
    overall_signal: Signal = Signal.NEUTRAL
    trend: str = "Sideways"
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": round(self.overall_score, 2),
            "overall_signal": self.overall_signal.value,
            "trend": self.trend,
            "summary": self.summary,
            "indicators": [
                {
                    "name": i.name,
                    "value": i.value,
                    "signal": i.signal.value,
                    "score": i.score,
                    "explanation": i.explanation,
                }
                for i in self.indicators
            ],
        }


class TechnicalAnalyzer:
    """Kelas utama untuk analisa teknikal"""

    def __init__(self, df: pd.DataFrame):
        """
        Args:
            df: DataFrame historis (harus punya kolom: Open, High, Low, Close, Volume)
        """
        if df.empty or "Close" not in df.columns:
            raise ValueError("DataFrame kosong atau tidak punya kolom Close")
        self.df = df.copy()
        self._calculate_all()

    def _calculate_all(self):
        """Hitung semua indikator sekaligus"""
        self._calculate_rsi()
        self._calculate_macd()
        self._calculate_moving_averages()
        self._calculate_bollinger_bands()
        self._calculate_stochastic()
        self._calculate_volume_indicators()

    # === RSI ===
    def _calculate_rsi(self, period: int = 14):
        """RSI - Relative Strength Index"""
        delta = self.df["Close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss.replace(0, np.nan)
        self.df["RSI"] = 100 - (100 / (1 + rs))

    # === MACD ===
    def _calculate_macd(self):
        """MACD - Moving Average Convergence Divergence"""
        ema12 = self.df["Close"].ewm(span=12, adjust=False).mean()
        ema26 = self.df["Close"].ewm(span=26, adjust=False).mean()
        self.df["MACD"] = ema12 - ema26
        self.df["MACD_Signal"] = self.df["MACD"].ewm(span=9, adjust=False).mean()
        self.df["MACD_Hist"] = self.df["MACD"] - self.df["MACD_Signal"]

    # === MOVING AVERAGES ===
    def _calculate_moving_averages(self):
        """SMA & EMA untuk berbagai periode"""
        for period in [20, 50, 100, 200]:
            if len(self.df) >= period:
                self.df[f"SMA_{period}"] = self.df["Close"].rolling(window=period).mean()
            if len(self.df) >= period:
                self.df[f"EMA_{period}"] = self.df["Close"].ewm(span=period, adjust=False).mean()

    # === BOLLINGER BANDS ===
    def _calculate_bollinger_bands(self, period: int = 20, std_dev: int = 2):
        """Bollinger Bands - volatilitas dan overbought/oversold"""
        self.df["BB_Middle"] = self.df["Close"].rolling(window=period).mean()
        std = self.df["Close"].rolling(window=period).std()
        self.df["BB_Upper"] = self.df["BB_Middle"] + (std_dev * std)
        self.df["BB_Lower"] = self.df["BB_Middle"] - (std_dev * std)
        # Bandwidth & %B
        self.df["BB_Width"] = (self.df["BB_Upper"] - self.df["BB_Lower"]) / self.df["BB_Middle"]
        self.df["BB_PercentB"] = (self.df["Close"] - self.df["BB_Lower"]) / (
            self.df["BB_Upper"] - self.df["BB_Lower"]
        )

    # === STOCHASTIC OSCILLATOR ===
    def _calculate_stochastic(self, k_period: int = 14, d_period: int = 3):
        """Stochastic Oscillator %K dan %D"""
        low_min = self.df["Low"].rolling(window=k_period).min()
        high_max = self.df["High"].rolling(window=k_period).max()
        self.df["Stoch_K"] = 100 * (self.df["Close"] - low_min) / (high_max - low_min)
        self.df["Stoch_D"] = self.df["Stoch_K"].rolling(window=d_period).mean()

    # === VOLUME INDICATORS ===
    def _calculate_volume_indicators(self):
        """Volume MA + Money Flow / volume trend"""
        if "Volume" in self.df.columns:
            self.df["Volume_MA_20"] = self.df["Volume"].rolling(window=20).mean()
            self.df["Volume_Ratio"] = self.df["Volume"] / self.df["Volume_MA_20"]
            # OBV - On Balance Volume
            self.df["OBV"] = (np.sign(self.df["Close"].diff()) * self.df["Volume"]).fillna(0).cumsum()

    # === ANALISIS UTAMA ===

    def analyze(self) -> TechnicalAnalysis:
        """Jalankan semua analisa teknikal dan kembalikan ringkasan"""
        indicators: List[IndicatorResult] = []

        indicators.append(self._analyze_rsi())
        indicators.append(self._analyze_macd())
        indicators.append(self._analyze_moving_averages())
        indicators.append(self._analyze_bollinger_bands())
        indicators.append(self._analyze_stochastic())
        indicators.append(self._analyze_volume())

        # Hitung overall score (weighted average)
        scores = [i.score for i in indicators]
        overall_score = float(np.mean(scores)) * 25  # Normalisasi ke -100..+100

        # Trend detection
        trend = self._detect_trend()

        # Tentukan overall signal
        if overall_score >= 60:
            overall_signal = Signal.STRONG_BUY
        elif overall_score >= 20:
            overall_signal = Signal.BUY
        elif overall_score <= -60:
            overall_signal = Signal.STRONG_SELL
        elif overall_score <= -20:
            overall_signal = Signal.SELL
        else:
            overall_signal = Signal.NEUTRAL

        summary = self._generate_summary(overall_score, trend, indicators)

        return TechnicalAnalysis(
            indicators=indicators,
            overall_score=overall_score,
            overall_signal=overall_signal,
            trend=trend,
            summary=summary,
        )

    def _analyze_rsi(self) -> IndicatorResult:
        """Analisa RSI - overbought >70, oversold <30"""
        if "RSI" not in self.df.columns or self.df["RSI"].isna().all():
            return IndicatorResult("RSI", np.nan, Signal.NEUTRAL, 0, "Data RSI tidak tersedia")

        rsi = float(self.df["RSI"].iloc[-1])
        if rsi >= 80:
            signal, exp = Signal.STRONG_SELL, f"RSI {rsi:.1f} — extreme overbought, koreksi kuat mungkin terjadi"
            score = -2.0
        elif rsi >= 70:
            signal, exp = Signal.SELL, f"RSI {rsi:.1f} — overbought, waspadai koreksi"
            score = -1.0
        elif rsi <= 20:
            signal, exp = Signal.STRONG_BUY, f"RSI {rsi:.1f} — extreme oversold, peluang rebound"
            score = 2.0
        elif rsi <= 30:
            signal, exp = Signal.BUY, f"RSI {rsi:.1f} — oversold, potensi rebound"
            score = 1.0
        else:
            signal = Signal.NEUTRAL
            exp = f"RSI {rsi:.1f} — netral, tidak ada sinyal extremes"
            score = 0.0

        return IndicatorResult("RSI (14)", round(rsi, 2), signal, score, exp)

    def _analyze_macd(self) -> IndicatorResult:
        """Analisa MACD - crossover & histogram"""
        if "MACD" not in self.df.columns or self.df["MACD"].isna().all():
            return IndicatorResult("MACD", np.nan, Signal.NEUTRAL, 0, "Data MACD tidak tersedia")

        macd = float(self.df["MACD"].iloc[-1])
        signal_line = float(self.df["MACD_Signal"].iloc[-1])
        hist = float(self.df["MACD_Hist"].iloc[-1])
        prev_hist = float(self.df["MACD_Hist"].iloc[-2]) if len(self.df) > 1 else 0

        if macd > signal_line and hist > 0 and hist > prev_hist:
            signal = Signal.STRONG_BUY
            score = 2.0
            exp = f"MACD {macd:.2f} > Signal {signal_line:.2f}, histogram positif & menebal — momentum bullish kuat"
        elif macd > signal_line and hist > 0:
            signal = Signal.BUY
            score = 1.0
            exp = f"MACD {macd:.2f} di atas Signal — tren naik"
        elif macd < signal_line and hist < 0 and hist < prev_hist:
            signal = Signal.STRONG_SELL
            score = -2.0
            exp = f"MACD {macd:.2f} < Signal {signal_line:.2f}, histogram negatif & menebal — momentum bearish kuat"
        elif macd < signal_line and hist < 0:
            signal = Signal.SELL
            score = -1.0
            exp = f"MACD {macd:.2f} di bawah Signal — tren turun"
        else:
            signal = Signal.NEUTRAL
            score = 0.0
            exp = f"MACD & Signal berdekatan, belum ada momentum jelas"

        return IndicatorResult("MACD", round(macd, 4), signal, score, exp)

    def _analyze_moving_averages(self) -> IndicatorResult:
        """Analisa MA - golden/death cross dan posisi harga"""
        close = float(self.df["Close"].iloc[-1])
        signals = []
        total_score = 0.0

        # Cek SMA 20 vs harga
        if "SMA_20" in self.df.columns and not np.isnan(self.df["SMA_20"].iloc[-1]):
            sma20 = float(self.df["SMA_20"].iloc[-1])
            if close > sma20 * 1.02:
                signals.append("harga > SMA20")
                total_score += 0.5
            elif close < sma20 * 0.98:
                signals.append("harga < SMA20")
                total_score -= 0.5

        # Cek SMA 50
        if "SMA_50" in self.df.columns and not np.isnan(self.df["SMA_50"].iloc[-1]):
            sma50 = float(self.df["SMA_50"].iloc[-1])
            if close > sma50:
                signals.append("> SMA50")
                total_score += 0.5
            else:
                signals.append("< SMA50")
                total_score -= 0.5

        # Cek SMA 200 (long-term trend)
        if "SMA_200" in self.df.columns and not np.isnan(self.df["SMA_200"].iloc[-1]):
            sma200 = float(self.df["SMA_200"].iloc[-1])
            if close > sma200:
                signals.append("> SMA200 (long-term up)")
                total_score += 1.0
            else:
                signals.append("< SMA200 (long-term down)")
                total_score -= 1.0

        # Golden Cross / Death Cross
        cross_signal = ""
        if "SMA_50" in self.df.columns and "SMA_200" in self.df.columns:
            sma50_now = self.df["SMA_50"].iloc[-1]
            sma200_now = self.df["SMA_200"].iloc[-1]
            sma50_prev = self.df["SMA_50"].iloc[-5] if len(self.df) > 5 else sma50_now
            sma200_prev = self.df["SMA_200"].iloc[-5] if len(self.df) > 5 else sma200_now

            if sma50_now > sma200_now and sma50_prev <= sma200_prev:
                cross_signal = " Golden Cross terdeteksi! 🟢"
                total_score += 1.5
            elif sma50_now < sma200_now and sma50_prev >= sma200_prev:
                cross_signal = " Death Cross terdeteksi! 🔴"
                total_score -= 1.5

        # Normalisasi score
        score = max(-2.0, min(2.0, total_score))
        if score >= 1.5:
            signal = Signal.STRONG_BUY
        elif score >= 0.5:
            signal = Signal.BUY
        elif score <= -1.5:
            signal = Signal.STRONG_SELL
        elif score <= -0.5:
            signal = Signal.SELL
        else:
            signal = Signal.NEUTRAL

        exp = f"Harga {close:,.0f}, MA: {', '.join(signals)}{cross_signal}"
        return IndicatorResult("Moving Averages", close, signal, score, exp)

    def _analyze_bollinger_bands(self) -> IndicatorResult:
        """Analisa Bollinger Bands"""
        if "BB_PercentB" not in self.df.columns or self.df["BB_PercentB"].isna().all():
            return IndicatorResult("Bollinger Bands", np.nan, Signal.NEUTRAL, 0, "Data BB tidak tersedia")

        pct_b = float(self.df["BB_PercentB"].iloc[-1])
        width = float(self.df["BB_Width"].iloc[-1]) * 100

        if pct_b > 1.0:
            signal, score = Signal.STRONG_SELL, -2.0
            exp = f"%B {pct_b:.2f} — harga tembus band atas, sangat overbought"
        elif pct_b > 0.8:
            signal, score = Signal.SELL, -1.0
            exp = f"%B {pct_b:.2f} — dekat band atas, overbought"
        elif pct_b < 0.0:
            signal, score = Signal.STRONG_BUY, 2.0
            exp = f"%B {pct_b:.2f} — harga tembus band bawah, sangat oversold"
        elif pct_b < 0.2:
            signal, score = Signal.BUY, 1.0
            exp = f"%B {pct_b:.2f} — dekat band bawah, oversold"
        else:
            signal, score = Signal.NEUTRAL, 0.0
            exp = f"%B {pct_b:.2f} — di tengah band, volatilitas normal"

        return IndicatorResult("Bollinger Bands", round(pct_b, 2), signal, score, exp)

    def _analyze_stochastic(self) -> IndicatorResult:
        """Analisa Stochastic Oscillator"""
        if "Stoch_K" not in self.df.columns or self.df["Stoch_K"].isna().all():
            return IndicatorResult("Stochastic", np.nan, Signal.NEUTRAL, 0, "Data Stochastic tidak tersedia")

        k = float(self.df["Stoch_K"].iloc[-1])
        d = float(self.df["Stoch_D"].iloc[-1])

        if k > 80 and d > 80:
            signal, score = Signal.SELL, -1.0
            exp = f"%K={k:.1f}, %D={d:.1f} — overbought"
        elif k < 20 and d < 20:
            signal, score = Signal.BUY, 1.0
            exp = f"%K={k:.1f}, %D={d:.1f} — oversold"
        elif k > d and k < 80:
            signal, score = Signal.BUY, 0.5
            exp = f"%K ({k:.1f}) crossing up %D ({d:.1f}) — momentum naik"
        elif k < d and k > 20:
            signal, score = Signal.SELL, -0.5
            exp = f"%K ({k:.1f}) crossing down %D ({d:.1f}) — momentum turun"
        else:
            signal, score = Signal.NEUTRAL, 0.0
            exp = f"%K={k:.1f}, %D={d:.1f} — netral"

        return IndicatorResult("Stochastic", round(k, 2), signal, score, exp)

    def _analyze_volume(self) -> IndicatorResult:
        """Analisa Volume - konfirmasi trend"""
        if "Volume_Ratio" not in self.df.columns or self.df["Volume_Ratio"].isna().all():
            return IndicatorResult("Volume", np.nan, Signal.NEUTRAL, 0, "Data Volume tidak tersedia")

        vol_ratio = float(self.df["Volume_Ratio"].iloc[-1])
        price_change = float(self.df["Close"].iloc[-1] - self.df["Close"].iloc[-2])

        if vol_ratio > 2.0 and price_change > 0:
            signal, score = Signal.STRONG_BUY, 1.5
            exp = f"Volume {vol_ratio:.1f}x rata-rata + harga naik — akumulasi kuat"
        elif vol_ratio > 1.5 and price_change > 0:
            signal, score = Signal.BUY, 1.0
            exp = f"Volume {vol_ratio:.1f}x rata-rata + harga naik"
        elif vol_ratio > 2.0 and price_change < 0:
            signal, score = Signal.STRONG_SELL, -1.5
            exp = f"Volume {vol_ratio:.1f}x rata-rata + harga turun — distribusi/distress sell"
        elif vol_ratio > 1.5 and price_change < 0:
            signal, score = Signal.SELL, -1.0
            exp = f"Volume {vol_ratio:.1f}x rata-rata + harga turun"
        elif vol_ratio < 0.5:
            signal, score = Signal.NEUTRAL, 0.0
            exp = f"Volume rendah ({vol_ratio:.1f}x) — pasar lesu, kurang conviction"
        else:
            signal, score = Signal.NEUTRAL, 0.0
            exp = f"Volume normal ({vol_ratio:.1f}x)"

        return IndicatorResult("Volume", round(vol_ratio, 2), signal, score, exp)

    def _detect_trend(self) -> str:
        """Deteksi trend utama"""
        close = float(self.df["Close"].iloc[-1])
        parts = []

        if "SMA_20" in self.df.columns and not np.isnan(self.df["SMA_20"].iloc[-1]):
            sma20 = float(self.df["SMA_20"].iloc[-1])
            parts.append(f"close>SMA20" if close > sma20 else "close<SMA20")

        if "SMA_50" in self.df.columns and not np.isnan(self.df["SMA_50"].iloc[-1]):
            sma50 = float(self.df["SMA_50"].iloc[-1])
            parts.append(">SMA50" if close > sma50 else "<SMA50")

        if "SMA_200" in self.df.columns and not np.isnan(self.df["SMA_200"].iloc[-1]):
            sma200 = float(self.df["SMA_200"].iloc[-1])
            parts.append(">SMA200 (Bullish)" if close > sma200 else "<SMA200 (Bearish)")

        if len(parts) >= 2:
            bullish_count = sum(1 for p in parts if ">" in p and "Bullish" not in p) + sum(
                1 for p in parts if "Bullish" in p
            )
            if bullish_count >= len(parts) * 0.7:
                return "Uptrend"
            elif bullish_count <= len(parts) * 0.3:
                return "Downtrend"
        return "Sideways"

    def _generate_summary(self, score: float, trend: str, indicators: List[IndicatorResult]) -> str:
        """Generate summary naratif"""
        if score >= 60:
            mood = "sangat bullish"
        elif score >= 20:
            mood = "bullish"
        elif score <= -60:
            mood = "sangat bearish"
        elif score <= -20:
            mood = "bearish"
        else:
            mood = "netral"

        bullish_count = sum(1 for i in indicators if i.score > 0)
        bearish_count = sum(1 for i in indicators if i.score < 0)
        neutral_count = len(indicators) - bullish_count - bearish_count

        return (
            f"Tren saat ini: **{trend}**. Sinyal teknikal menunjukkan bias **{mood}** "
            f"(skor {score:.1f}/100). "
            f"Dari {len(indicators)} indikator: {bullish_count} bullish, "
            f"{bearish_count} bearish, {neutral_count} netral."
        )


if __name__ == "__main__":
    from data_fetcher import StockDataFetcher

    fetcher = StockDataFetcher("BBCA.JK")
    df = fetcher.get_historical_data(period="6mo")
    analyzer = TechnicalAnalyzer(df)
    result = analyzer.analyze()

    print(f"Overall: {result.overall_signal.value} (score: {result.overall_score:.1f})")
    print(f"Trend: {result.trend}")
    print(f"Summary: {result.summary}\n")
    for ind in result.indicators:
        print(f"  {ind.name}: {ind.signal.value} - {ind.explanation}")
