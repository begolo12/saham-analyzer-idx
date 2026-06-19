"""
Fundamental Analysis Module
Menganalisis kesehatan finansial perusahaan berdasarkan laporan keuangan.

Rasio yang dianalisis:
- Valuation: P/E, P/B, P/S, PEG
- Profitability: ROE, ROA, Profit Margin
- Leverage: DER (Debt-to-Equity), Current Ratio
- Growth: Revenue Growth, Earnings Growth
- Dividend: Dividend Yield, Payout Ratio

Note: Yahoo Finance untuk saham IDX kadang data fundamental-nya terbatas
karena perbedaan reporting standard. Module ini robust terhadap missing data.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class FundamentalSignal(Enum):
    """Enum untuk sinyal fundamental"""
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    FAIR = "FAIR"
    POOR = "POOR"
    BAD = "BAD"
    UNKNOWN = "UNKNOWN"

    @property
    def score(self) -> float:
        """Skor numerik: -2 (bad) sampai +2 (excellent)"""
        mapping = {
            "EXCELLENT": 2.0,
            "GOOD": 1.0,
            "FAIR": 0.0,
            "POOR": -1.0,
            "BAD": -2.0,
            "UNKNOWN": 0.0,
        }
        return mapping[self.value]

    @property
    def indonesian(self) -> str:
        mapping = {
            "EXCELLENT": "Sangat Baik",
            "GOOD": "Baik",
            "FAIR": "Cukup",
            "POOR": "Buruk",
            "BAD": "Sangat Buruk",
            "UNKNOWN": "Tidak Diketahui",
        }
        return mapping[self.value]


@dataclass
class FundamentalMetric:
    """Satu metrik fundamental"""
    name: str
    value: Optional[float]
    formatted: str
    signal: FundamentalSignal
    score: float
    explanation: str
    benchmark: str  # benchmark industri / umum


@dataclass
class FundamentalAnalysis:
    """Hasil lengkap analisa fundamental"""
    metrics: List[FundamentalMetric] = field(default_factory=list)
    overall_score: float = 0.0  # -100 sampai +100
    overall_signal: FundamentalSignal = FundamentalSignal.UNKNOWN
    summary: str = ""
    data_availability: float = 0.0  # 0-1, berapa % data yang tersedia

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_score": round(self.overall_score, 2),
            "overall_signal": self.overall_signal.value,
            "summary": self.summary,
            "data_availability": round(self.data_availability, 2),
            "metrics": [
                {
                    "name": m.name,
                    "value": m.value,
                    "formatted": m.formatted,
                    "signal": m.signal.value,
                    "score": m.score,
                    "explanation": m.explanation,
                    "benchmark": m.benchmark,
                }
                for m in self.metrics
            ],
        }


class FundamentalAnalyzer:
    """Kelas utama untuk analisa fundamental"""

    def __init__(self, info: Dict[str, Any]):
        """
        Args:
            info: Dictionary dari StockDataFetcher.get_info()
        """
        self.info = info or {}

    def analyze(self) -> FundamentalAnalysis:
        """Jalankan semua analisa fundamental"""
        metrics: List[FundamentalMetric] = []

        # === VALUATION ===
        metrics.append(self._analyze_pe_ratio())
        metrics.append(self._analyze_pb_ratio())
        metrics.append(self._analyze_ps_ratio())

        # === PROFITABILITY ===
        metrics.append(self._analyze_roe())
        metrics.append(self._analyze_roa())
        metrics.append(self._analyze_profit_margin())

        # === LEVERAGE ===
        metrics.append(self._analyze_debt_to_equity())
        metrics.append(self._analyze_current_ratio())

        # === GROWTH ===
        metrics.append(self._analyze_earnings_growth())
        metrics.append(self._analyze_revenue_growth())

        # === DIVIDEND ===
        metrics.append(self._analyze_dividend_yield())

        # Hitung data availability
        available = [m for m in metrics if m.signal != FundamentalSignal.UNKNOWN]
        data_avail = len(available) / len(metrics) if metrics else 0

        # Hitung overall score (exclude UNKNOWN)
        if available:
            avg_score = np.mean([m.score for m in available])
            overall_score = float(avg_score) * 25  # Normalisasi ke -100..+100
        else:
            overall_score = 0.0

        if overall_score >= 60:
            signal = FundamentalSignal.EXCELLENT
        elif overall_score >= 20:
            signal = FundamentalSignal.GOOD
        elif overall_score <= -60:
            signal = FundamentalSignal.BAD
        elif overall_score <= -20:
            signal = FundamentalSignal.POOR
        else:
            signal = FundamentalSignal.FAIR

        summary = self._generate_summary(signal, overall_score, available, data_avail)

        return FundamentalAnalysis(
            metrics=metrics,
            overall_score=overall_score,
            overall_signal=signal,
            summary=summary,
            data_availability=data_avail,
        )

    # === HELPER ===

    def _safe_get(self, key: str) -> Optional[float]:
        """Ambil nilai dengan aman, return None jika tidak ada"""
        val = self.info.get(key)
        if val is None or val == "" or (isinstance(val, str) and val.lower() in ("none", "nan")):
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _make_metric(
        self,
        name: str,
        value: Optional[float],
        signal: FundamentalSignal,
        score: float,
        explanation: str,
        benchmark: str,
        formatter: str = "{:.2f}",
    ) -> FundamentalMetric:
        """Buat FundamentalMetric dengan formatting"""
        if value is None or np.isnan(value):
            return FundamentalMetric(
                name=name,
                value=None,
                formatted="N/A",
                signal=FundamentalSignal.UNKNOWN,
                score=0.0,
                explanation="Data tidak tersedia di Yahoo Finance untuk saham IDX ini",
                benchmark=benchmark,
            )
        try:
            formatted = formatter.format(value)
        except (ValueError, TypeError):
            formatted = str(value)
        return FundamentalMetric(
            name=name,
            value=value,
            formatted=formatted,
            signal=signal,
            score=score,
            explanation=explanation,
            benchmark=benchmark,
        )

    # === VALUATION ANALYSIS ===

    def _analyze_pe_ratio(self) -> FundamentalMetric:
        """P/E Ratio — Price to Earnings"""
        pe = self._safe_get("trailingPE") or self._safe_get("forwardPE")
        if pe is None or pe <= 0:
            return self._make_metric(
                "P/E Ratio (TTM)", pe, FundamentalSignal.UNKNOWN, 0,
                "P/E tidak tersedia atau perusahaan rugi", "Standar industri: 10-25", "{:.2f}"
            )

        if pe < 10:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, (
                f"P/E {pe:.2f} — sangat murah, berpotensi undervalued "
                "(atau ada masalah fundamental)"
            )
        elif pe < 15:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"P/E {pe:.2f} — relatif murah"
        elif pe < 25:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"P/E {pe:.2f} — wajar (standar industri)"
        elif pe < 40:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"P/E {pe:.2f} — mahal, ekspektasi pertumbuhan tinggi"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"P/E {pe:.2f} — sangat mahal atau speculative bubble"

        return self._make_metric("P/E Ratio (TTM)", pe, signal, score, exp,
                                  "Standar: <15 murah, 15-25 wajar, >25 mahal", "{:.2f}")

    def _analyze_pb_ratio(self) -> FundamentalMetric:
        """P/B Ratio — Price to Book Value"""
        pb = self._safe_get("priceToBook")
        if pb is None or pb <= 0:
            return self._make_metric(
                "P/B Ratio", pb, FundamentalSignal.UNKNOWN, 0,
                "P/B tidak tersedia", "Standar: <1 murah, 1-3 wajar, >3 mahal", "{:.2f}"
            )

        if pb < 1:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, (
                f"P/B {pb:.2f} — diperdagangkan di bawah nilai buku, "
                "sangat murah (atau ada risiko)"
            )
        elif pb < 3:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"P/B {pb:.2f} — wajar"
        elif pb < 5:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"P/B {pb:.2f} — agak mahal"
        elif pb < 10:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"P/B {pb:.2f} — mahal"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"P/B {pb:.2f} — sangat mahal"

        return self._make_metric("P/B Ratio", pb, signal, score, exp,
                                  "Standar: <1 undervalued, 1-3 wajar, >3 mahal", "{:.2f}")

    def _analyze_ps_ratio(self) -> FundamentalMetric:
        """P/S Ratio — Price to Sales"""
        ps = self._safe_get("priceToSalesTrailing12Months")
        if ps is None or ps <= 0:
            return self._make_metric(
                "P/S Ratio", ps, FundamentalSignal.UNKNOWN, 0,
                "P/S tidak tersedia", "Standar: <2 murah, 2-5 wajar", "{:.2f}"
            )

        if ps < 1:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"P/S {ps:.2f} — sangat murah"
        elif ps < 3:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"P/S {ps:.2f} — wajar"
        elif ps < 6:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"P/S {ps:.2f} — agak mahal"
        else:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"P/S {ps:.2f} — mahal"

        return self._make_metric("P/S Ratio", ps, signal, score, exp,
                                  "Standar: <2 murah, 2-5 wajar, >5 mahal", "{:.2f}")

    # === PROFITABILITY ANALYSIS ===

    def _analyze_roe(self) -> FundamentalMetric:
        """ROE — Return on Equity"""
        roe = self._safe_get("returnOnEquity")
        if roe is None:
            return self._make_metric(
                "ROE", None, FundamentalSignal.UNKNOWN, 0,
                "ROE tidak tersedia", "Standar: >15% bagus, >20% excellent", "{:.2%}"
            )

        roe_pct = roe * 100  # Yahoo returns decimal (0.15 = 15%)
        if roe_pct > 20:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"ROE {roe_pct:.1f}% — excellent, perusahaan sangat efisien"
        elif roe_pct > 15:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"ROE {roe_pct:.1f}% — baik, di atas standar"
        elif roe_pct > 10:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"ROE {roe_pct:.1f}% — cukup"
        elif roe_pct > 0:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"ROE {roe_pct:.1f}% — rendah, kurang efisien"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"ROE {roe_pct:.1f}% — negatif, rugi"

        return self._make_metric("ROE", roe, signal, score, exp,
                                  ">15% bagus, >20% excellent", "{:.2%}")

    def _analyze_roa(self) -> FundamentalMetric:
        """ROA — Return on Assets"""
        roa = self._safe_get("returnOnAssets")
        if roa is None:
            return self._make_metric(
                "ROA", None, FundamentalSignal.UNKNOWN, 0,
                "ROA tidak tersedia", "Standar: >5% bagus, >10% excellent", "{:.2%}"
            )

        roa_pct = roa * 100
        if roa_pct > 10:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"ROA {roa_pct:.1f}% — excellent"
        elif roa_pct > 5:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"ROA {roa_pct:.1f}% — baik"
        elif roa_pct > 2:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"ROA {roa_pct:.1f}% — cukup"
        elif roa_pct > 0:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"ROA {roa_pct:.1f}% — rendah"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"ROA {roa_pct:.1f}% — negatif"

        return self._make_metric("ROA", roa, signal, score, exp,
                                  ">5% bagus, >10% excellent", "{:.2%}")

    def _analyze_profit_margin(self) -> FundamentalMetric:
        """Profit Margin"""
        margin = self._safe_get("profitMargins")
        if margin is None:
            return self._make_metric(
                "Profit Margin", None, FundamentalSignal.UNKNOWN, 0,
                "Profit Margin tidak tersedia", "Standar: >10% bagus, >20% excellent", "{:.2%}"
            )

        margin_pct = margin * 100
        if margin_pct > 20:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"Margin {margin_pct:.1f}% — excellent, pricing power kuat"
        elif margin_pct > 10:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"Margin {margin_pct:.1f}% — sehat"
        elif margin_pct > 5:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"Margin {margin_pct:.1f}% — cukup"
        elif margin_pct > 0:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"Margin {margin_pct:.1f}% — tipis, rentan goncangan"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"Margin {margin_pct:.1f}% — negatif"

        return self._make_metric("Profit Margin", margin, signal, score, exp,
                                  ">10% bagus, >20% excellent", "{:.2%}")

    # === LEVERAGE ANALYSIS ===

    def _analyze_debt_to_equity(self) -> FundamentalMetric:
        """DER — Debt to Equity Ratio"""
        der = self._safe_get("debtToEquity")
        if der is None:
            return self._make_metric(
                "Debt/Equity", None, FundamentalSignal.UNKNOWN, 0,
                "DER tidak tersedia", "Standar: <0.5 konservatif, <1 sehat, >2 berisiko", "{:.2f}"
            )

        # Yahoo Finance returns D/E as percentage (100 = 1.0)
        der_ratio = der / 100 if der > 5 else der

        if der_ratio < 0.3:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"DER {der_ratio:.2f} — sangat konservatif, hutang rendah"
        elif der_ratio < 0.7:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"DER {der_ratio:.2f} — sehat"
        elif der_ratio < 1.5:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"DER {der_ratio:.2f} — moderat"
        elif der_ratio < 2.5:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"DER {der_ratio:.2f} — tinggi, perlu diwaspadai"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"DER {der_ratio:.2f} — sangat tinggi, risiko keuangan"

        return self._make_metric("Debt/Equity Ratio", der_ratio, signal, score, exp,
                                  "<0.5 konservatif, <1 sehat, >2 berisiko", "{:.2f}")

    def _analyze_current_ratio(self) -> FundamentalMetric:
        """Current Ratio — kemampuan bayar hutang jangka pendek"""
        cr = self._safe_get("currentRatio") or self._safe_get("quickRatio")
        if cr is None:
            return self._make_metric(
                "Current Ratio", None, FundamentalSignal.UNKNOWN, 0,
                "Current Ratio tidak tersedia", "Standar: >1.5 sehat, >2 sangat sehat", "{:.2f}"
            )

        if cr > 2:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"Current Ratio {cr:.2f} — sangat likuid"
        elif cr > 1.5:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"Current Ratio {cr:.2f} — sehat"
        elif cr > 1:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"Current Ratio {cr:.2f} — cukup"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"Current Ratio {cr:.2f} — risiko likuiditas!"

        return self._make_metric("Current Ratio", cr, signal, score, exp,
                                  ">1.5 sehat, >2 sangat sehat", "{:.2f}")

    # === GROWTH ANALYSIS ===

    def _analyze_earnings_growth(self) -> FundamentalMetric:
        """Earnings Growth"""
        growth = self._safe_get("earningsGrowth") or self._safe_get("earningsQuarterlyGrowth")
        if growth is None:
            return self._make_metric(
                "Earnings Growth", None, FundamentalSignal.UNKNOWN, 0,
                "Pertumbuhan earnings tidak tersedia", "Standar: >10% bagus", "{:.2%}"
            )

        growth_pct = growth * 100
        if growth_pct > 30:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"Earnings growth {growth_pct:.1f}% — sangat cepat"
        elif growth_pct > 15:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"Earnings growth {growth_pct:.1f}% — kuat"
        elif growth_pct > 5:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"Earnings growth {growth_pct:.1f}% — moderat"
        elif growth_pct > 0:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"Earnings growth {growth_pct:.1f}% — lambat"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"Earnings growth {growth_pct:.1f}% — kontraksi"

        return self._make_metric("Earnings Growth", growth, signal, score, exp,
                                  ">10% bagus, >20% sangat bagus", "{:.2%}")

    def _analyze_revenue_growth(self) -> FundamentalMetric:
        """Revenue Growth"""
        growth = self._safe_get("revenueGrowth") or self._safe_get("revenueQuarterlyGrowth")
        if growth is None:
            return self._make_metric(
                "Revenue Growth", None, FundamentalSignal.UNKNOWN, 0,
                "Pertumbuhan revenue tidak tersedia", "Standar: >10% expansion", "{:.2%}"
            )

        growth_pct = growth * 100
        if growth_pct > 25:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"Revenue growth {growth_pct:.1f}% — ekspansi cepat"
        elif growth_pct > 10:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"Revenue growth {growth_pct:.1f}% — sehat"
        elif growth_pct > 0:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"Revenue growth {growth_pct:.1f}% — moderat"
        else:
            signal, score, exp = FundamentalSignal.BAD, -2.0, f"Revenue growth {growth_pct:.1f}% — kontraksi"

        return self._make_metric("Revenue Growth", growth, signal, score, exp,
                                  ">10% ekspansi, >20% cepat", "{:.2%}")

    # === DIVIDEND ANALYSIS ===

    def _analyze_dividend_yield(self) -> FundamentalMetric:
        """Dividend Yield"""
        div_yield = self._safe_get("dividendYield") or self._safe_get("trailingAnnualDividendYield")
        if div_yield is None or div_yield == 0:
            return self._make_metric(
                "Dividend Yield", div_yield, FundamentalSignal.FAIR, 0,
                "Tidak membayar dividen (atau data tidak tersedia)",
                "Standar: >3% bagus, >5% tinggi", "{:.2%}"
            )

        # Yahoo Finance returns dividendYield as percentage (3.5 = 3.5%)
        if div_yield > 1:
            yield_pct = div_yield  # already in %
        else:
            yield_pct = div_yield * 100

        if yield_pct > 6:
            signal, score, exp = FundamentalSignal.EXCELLENT, 2.0, f"Yield {yield_pct:.2f}% — sangat tinggi"
        elif yield_pct > 4:
            signal, score, exp = FundamentalSignal.GOOD, 1.0, f"Yield {yield_pct:.2f}% — menarik"
        elif yield_pct > 2:
            signal, score, exp = FundamentalSignal.FAIR, 0.0, f"Yield {yield_pct:.2f}% — standar"
        else:
            signal, score, exp = FundamentalSignal.POOR, -1.0, f"Yield {yield_pct:.2f}% — rendah"

        return self._make_metric("Dividend Yield", yield_pct / 100, signal, score, exp,
                                  ">3% menarik, >5% tinggi", "{:.2%}")

    # === SUMMARY ===

    def _generate_summary(
        self,
        signal: FundamentalSignal,
        score: float,
        available: List[FundamentalMetric],
        data_avail: float,
    ) -> str:
        """Generate summary naratif"""
        if data_avail < 0.3:
            return (
                f"⚠️ Data fundamental sangat terbatas untuk saham IDX ini "
                f"(hanya {data_avail*100:.0f}% tersedia di Yahoo Finance). "
                f"Disarankan cek langsung ke website IDX atau laporan keuangan perusahaan."
            )

        if signal == FundamentalSignal.EXCELLENT:
            mood = "sangat kuat secara fundamental"
        elif signal == FundamentalSignal.GOOD:
            mood = "sehat secara fundamental"
        elif signal == FundamentalSignal.FAIR:
            mood = "cukup fundamental, tidak istimewa"
        elif signal == FundamentalSignal.POOR:
            mood = "lemah secara fundamental"
        elif signal == FundamentalSignal.BAD:
            mood = "sangat buruk secara fundamental"
        else:
            mood = "tidak cukup data untuk dinilai"

        # Highlight metrics
        highlights = []
        for m in available[:3]:
            if m.score >= 1:
                highlights.append(f"✓ {m.name} ({m.formatted}) — positif")
            elif m.score <= -1:
                highlights.append(f"⚠ {m.name} ({m.formatted}) — perhatian")

        highlights_str = "\n".join(highlights) if highlights else "Tidak ada sorotan khusus"

        return (
            f"Perusahaan **{mood}** (skor {score:.1f}/100, {data_avail*100:.0f}% data tersedia).\n\n"
            f"Highlights:\n{highlights_str}"
        )


if __name__ == "__main__":
    from data_fetcher import StockDataFetcher

    fetcher = StockDataFetcher("BBCA.JK")
    info = fetcher.get_info()
    analyzer = FundamentalAnalyzer(info)
    result = analyzer.analyze()

    print(f"Overall: {result.overall_signal.value} (score: {result.overall_score:.1f})")
    print(f"Data availability: {result.data_availability*100:.0f}%")
    print(f"Summary: {result.summary}\n")
    for m in result.metrics:
        print(f"  {m.name}: {m.formatted} - {m.signal.value}")
