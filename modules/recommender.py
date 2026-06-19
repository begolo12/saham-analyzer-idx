"""
Recommendation Engine
Menggabungkan semua sinyal (teknikal, fundamental, behavioral, sentimen)
menjadi rekomendasi Buy / Hold / Sell dengan timeframe & price targets.

Weighting rationale:
- Technical: 30% — Paling responsif untuk short/medium term
- Fundamental: 30% — Paling reliable untuk long-term value
- Behavioral: 25% — Penting untuk deteksi smart money & momentum
- Sentiment: 15% — Volatile, jadi bobot lebih kecil

Disclaimer: NO system achieves 90%+ accuracy on stock prediction.
This tool provides reasoned analysis, not guarantees.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any
import numpy as np

from modules.technical import TechnicalAnalysis, Signal as TechnicalSignal
from modules.fundamental import FundamentalAnalysis, FundamentalSignal
from modules.behavioral import BehavioralAnalysis, BehavioralSignal
from modules.sentiment import SentimentAnalysis, SentimentLabel


class Action(Enum):
    """Aksi rekomendasi"""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    HOLD = "HOLD"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"

    @property
    def indonesian(self) -> str:
        mapping = {
            "STRONG_BUY": "BELI KUAT",
            "BUY": "BELI",
            "HOLD": "TAHAN",
            "SELL": "JUAL",
            "STRONG_SELL": "JUAL KUAT",
        }
        return mapping[self.value]

    @property
    def color(self) -> str:
        mapping = {
            "STRONG_BUY": "#00C853",
            "BUY": "#4CAF50",
            "HOLD": "#FFC107",
            "SELL": "#F44336",
            "STRONG_SELL": "#B71C1C",
        }
        return mapping[self.value]

    @property
    def emoji(self) -> str:
        mapping = {
            "STRONG_BUY": "🟢🟢",
            "BUY": "🟢",
            "HOLD": "🟡",
            "SELL": "🔴",
            "STRONG_SELL": "🔴🔴",
        }
        return mapping[self.value]


class TimeHorizon(Enum):
    """Horizon waktu rekomendasi"""
    SHORT = "SHORT"  # 1-7 hari (swing trader)
    MEDIUM = "MEDIUM"  # 1-4 minggu (swing investor)
    LONG = "LONG"  # 1-6 bulan (value investor)

    @property
    def indonesian(self) -> str:
        mapping = {
            "SHORT": "Jangka Pendek (1-7 hari)",
            "MEDIUM": "Jangka Menengah (1-4 minggu)",
            "LONG": "Jangka Panjang (1-6 bulan)",
        }
        return mapping[self.value]


@dataclass
class Recommendation:
    """Rekomendasi final"""
    action: Action
    confidence: float  # 0-100%
    horizon: TimeHorizon
    current_price: Optional[float]
    entry_zone: Optional[tuple]  # (low, high)
    target_price: Optional[float]
    stop_loss: Optional[float]
    risk_reward_ratio: Optional[float]
    reasoning: str  # narasi lengkap
    weights: Dict[str, float]  # bobot masing-masing analyzer
    component_scores: Dict[str, float]  # skor dari masing-masing analyzer
    warnings: list = field(default_factory=list)  # disclaimer / peringatan

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action.value,
            "action_indonesian": self.action.indonesian,
            "emoji": self.action.emoji,
            "color": self.action.color,
            "confidence": round(self.confidence, 1),
            "horizon": self.horizon.value,
            "horizon_indonesian": self.horizon.indonesian,
            "current_price": self.current_price,
            "entry_zone": list(self.entry_zone) if self.entry_zone else None,
            "target_price": self.target_price,
            "stop_loss": self.stop_loss,
            "risk_reward_ratio": (
                round(self.risk_reward_ratio, 2)
                if self.risk_reward_ratio is not None else None
            ),
            "reasoning": self.reasoning,
            "weights": self.weights,
            "component_scores": self.component_scores,
            "warnings": self.warnings,
        }


class Recommender:
    """Engine rekomendasi utama"""

    # Bobot masing-masing analyzer (total = 1.0)
    DEFAULT_WEIGHTS = {
        "technical": 0.30,
        "fundamental": 0.30,
        "behavioral": 0.25,
        "sentiment": 0.15,
    }

    def __init__(
        self,
        technical: Optional[TechnicalAnalysis] = None,
        fundamental: Optional[FundamentalAnalysis] = None,
        behavioral: Optional[BehavioralAnalysis] = None,
        sentiment: Optional[SentimentAnalysis] = None,
        current_price: Optional[float] = None,
        weights: Optional[Dict[str, float]] = None,
    ):
        self.technical = technical
        self.fundamental = fundamental
        self.behavioral = behavioral
        self.sentiment = sentiment
        self.current_price = current_price
        self.weights = weights or self.DEFAULT_WEIGHTS

    def recommend(self) -> Recommendation:
        """Generate rekomendasi lengkap"""
        # 1. Hitung skor dari masing-masing analyzer
        scores = {}
        availabilities = {}

        if self.technical:
            scores["technical"] = self.technical.overall_score
            availabilities["technical"] = 1.0
        else:
            scores["technical"] = 0.0
            availabilities["technical"] = 0.0

        if self.fundamental:
            # Normalisasi data availability ke confidence weight
            scores["fundamental"] = self.fundamental.overall_score
            availabilities["fundamental"] = self.fundamental.data_availability
        else:
            scores["fundamental"] = 0.0
            availabilities["fundamental"] = 0.0

        if self.behavioral:
            scores["behavioral"] = self.behavioral.overall_score
            availabilities["behavioral"] = 1.0
        else:
            scores["behavioral"] = 0.0
            availabilities["behavioral"] = 0.0

        if self.sentiment and self.sentiment.articles:
            scores["sentiment"] = self.sentiment.overall_score
            availabilities["sentiment"] = self.sentiment.confidence
        else:
            scores["sentiment"] = 0.0
            availabilities["sentiment"] = 0.0

        # 2. Adjust bobot berdasarkan availability
        adjusted_weights = {}
        total_adjusted = 0
        for key, base_weight in self.weights.items():
            avail = availabilities[key]
            adjusted_weights[key] = base_weight * avail
            total_adjusted += adjusted_weights[key]

        # Normalisasi ulang ke total = 1
        if total_adjusted > 0:
            adjusted_weights = {k: v / total_adjusted for k, v in adjusted_weights.items()}

        # 3. Hitung weighted score
        weighted_score = sum(
            scores[key] * adjusted_weights[key] for key in self.weights.keys()
        )

        # 4. Tentukan action
        action = self._score_to_action(weighted_score)

        # 5. Tentukan horizon berdasarkan signal dominan
        horizon = self._determine_horizon(adjusted_weights, scores)

        # 6. Hitung confidence
        confidence = self._calculate_confidence(weighted_score, availabilities, action)

        # 7. Hitung entry zone, target, stop loss
        entry_zone, target_price, stop_loss, rr = self._calculate_price_targets(
            action, horizon, self.current_price
        )

        # 8. Generate reasoning
        reasoning = self._generate_reasoning(
            action, weighted_score, scores, adjusted_weights, horizon
        )

        # 9. Generate warnings
        warnings = self._generate_warnings(availabilities, confidence)

        return Recommendation(
            action=action,
            confidence=confidence,
            horizon=horizon,
            current_price=self.current_price,
            entry_zone=entry_zone,
            target_price=target_price,
            stop_loss=stop_loss,
            risk_reward_ratio=rr,
            reasoning=reasoning,
            weights=adjusted_weights,
            component_scores=scores,
            warnings=warnings,
        )

    def _score_to_action(self, score: float) -> Action:
        """Konversi skor -100..+100 ke Action"""
        if score >= 50:
            return Action.STRONG_BUY
        elif score >= 15:
            return Action.BUY
        elif score <= -50:
            return Action.STRONG_SELL
        elif score <= -15:
            return Action.SELL
        else:
            return Action.HOLD

    def _determine_horizon(
        self, weights: Dict[str, float], scores: Dict[str, float]
    ) -> TimeHorizon:
        """
        Tentukan horizon berdasarkan signal mana yang dominan:
        - Technical/Sentiment dominan → SHORT
        - Behavioral dominan → MEDIUM
        - Fundamental dominan → LONG
        """
        tech_weight = weights.get("technical", 0)
        fund_weight = weights.get("fundamental", 0)
        behav_weight = weights.get("behavioral", 0)
        sent_weight = weights.get("sentiment", 0)

        # Tentukan mana yang paling dominan
        max_weight = max(tech_weight, fund_weight, behav_weight, sent_weight)

        if fund_weight == max_weight and fund_weight > 0.3:
            return TimeHorizon.LONG
        elif behav_weight == max_weight and behav_weight > 0.25:
            return TimeHorizon.MEDIUM
        elif sent_weight == max_weight:
            return TimeHorizon.SHORT
        elif tech_weight == max_weight:
            return TimeHorizon.SHORT
        else:
            return TimeHorizon.MEDIUM

    def _calculate_confidence(
        self,
        score: float,
        availabilities: Dict[str, float],
        action: Action,
    ) -> float:
        """Hitung confidence 0-100%"""
        # Base confidence dari |score|
        base_conf = min(100.0, abs(score) * 1.2)

        # Average data availability
        avg_avail = np.mean(list(availabilities.values()))

        # Confidence = base * data_availability
        confidence = base_conf * avg_avail

        # HOLD tidak boleh confidence tinggi
        if action == Action.HOLD:
            confidence = min(confidence, 50.0)

        return float(max(0.0, min(100.0, confidence)))

    def _calculate_price_targets(
        self,
        action: Action,
        horizon: TimeHorizon,
        current_price: Optional[float],
    ) -> tuple:
        """
        Hitung entry zone, target, stop loss.

        Asumsi expected move per horizon:
        - SHORT: 3-7%
        - MEDIUM: 8-15%
        - LONG: 15-30%
        """
        if current_price is None or current_price == 0:
            return None, None, None, None

        if horizon == TimeHorizon.SHORT:
            move = 0.05  # 5%
            stop = 0.03  # 3%
        elif horizon == TimeHorizon.MEDIUM:
            move = 0.10  # 10%
            stop = 0.05  # 5%
        else:  # LONG
            move = 0.20  # 20%
            stop = 0.10  # 10%

        if action in (Action.BUY, Action.STRONG_BUY):
            # Buy: entry di sekitar harga sekarang atau sedikit di bawah
            entry_low = current_price * (1 - stop / 2)
            entry_high = current_price * (1 + 0.01)
            target = current_price * (1 + move)
            sl = current_price * (1 - stop)
            rr = (target - current_price) / max(current_price - sl, 0.01)

        elif action in (Action.SELL, Action.STRONG_SELL):
            # Sell: keluar di sekitar harga sekarang atau sedikit di atas
            entry_low = current_price * (1 - 0.01)
            entry_high = current_price * (1 + stop / 2)
            target = current_price * (1 - move)
            sl = current_price * (1 + stop)
            rr = (current_price - target) / max(sl - current_price, 0.01)

        else:  # HOLD
            entry_low = current_price * 0.97
            entry_high = current_price * 1.03
            target = None
            sl = current_price * 0.92
            rr = None

        return (entry_low, entry_high), target, sl, rr

    def _generate_reasoning(
        self,
        action: Action,
        weighted_score: float,
        scores: Dict[str, float],
        weights: Dict[str, float],
        horizon: TimeHorizon,
    ) -> str:
        """Generate narasi reasoning"""
        lines = []

        # Header
        mood_map = {
            Action.STRONG_BUY: "sangat positif, sinyal beli kuat",
            Action.BUY: "positif, ada peluang beli",
            Action.HOLD: "netral, belum ada sinyal jelas",
            Action.SELL: "negatif, ada risiko jual",
            Action.STRONG_SELL: "sangat negatif, sinyal jual kuat",
        }
        lines.append(
            f"**Rekomendasi: {action.indonesian}** — {mood_map[action]} "
            f"(skor total {weighted_score:+.1f}/100, confidence dihitung dari ketersediaan data)"
        )
        lines.append(f"\n**Horizon:** {horizon.indonesian}")
        lines.append("")

        # Breakdown skor
        lines.append("**Breakdown Sinyal:**\n")
        labels = {
            "technical": "📊 Teknikal",
            "fundamental": "💼 Fundamental",
            "behavioral": "🔍 Behavioral Pattern",
            "sentiment": "📰 Sentimen Berita",
        }

        for key in ["technical", "fundamental", "behavioral", "sentiment"]:
            weight = weights.get(key, 0)
            score = scores.get(key, 0)
            weight_pct = weight * 100
            bar = "█" * int(abs(score) / 5) if abs(score) > 0 else "▁"
            sign = "+" if score >= 0 else ""
            lines.append(
                f"- {labels[key]} (bobot {weight_pct:.0f}%): "
                f"**{sign}{score:.1f}/100** `{bar}`"
            )

        lines.append("")

        # Detail per analyzer (highlight poin penting)
        lines.append("**Insight Utama:**\n")

        if self.technical:
            lines.append(f"- **Teknikal:** {self.technical.summary}")
            for ind in self.technical.indicators[:3]:
                if abs(ind.score) >= 1:
                    lines.append(f"  - {ind.explanation}")

        if self.fundamental and self.fundamental.data_availability > 0.2:
            lines.append(f"- **Fundamental:** {self.fundamental.summary}")

        if self.behavioral:
            lines.append(f"- **Behavioral:** {self.behavioral.summary}")

        if self.sentiment and self.sentiment.articles:
            lines.append(f"- **Sentimen:** {self.sentiment.summary}")

        return "\n".join(lines)

    def _generate_warnings(
        self, availabilities: Dict[str, float], confidence: float
    ) -> list:
        """Generate warnings / disclaimer"""
        warnings = []

        # Always include disclaimer
        warnings.append(
            "⚠️ Rekomendasi ini adalah hasil analisa kuantitatif, "
            "BUKAN saran finansial. Selalu lakukan riset sendiri (DYOR)."
        )

        if confidence < 40:
            warnings.append(
                "⚠️ Confidence rendah — sinyal-sinyal saling bertentangan, "
                "kurangi ukuran posisi atau tunggu konfirmasi."
            )

        if availabilities.get("fundamental", 0) < 0.3:
            warnings.append(
                "ℹ️ Data fundamental terbatas untuk saham IDX ini. "
                "Untuk analisis valuasi akurat, cek laporan keuangan langsung dari "
                "website perusahaan atau idx.co.id."
            )

        if availabilities.get("sentiment", 0) < 0.3:
            warnings.append(
                "ℹ️ Sedikit berita terbaru yang berhasil di-fetch. "
                "Sentimen mungkin tidak representatif."
            )

        if abs(self.technical.overall_score if self.technical else 0) < 10 and \
           abs(self.behavioral.overall_score if self.behavioral else 0) < 10 and \
           abs(self.sentiment.overall_score if self.sentiment else 0) < 10:
            warnings.append(
                "ℹ️ Mayoritas sinyal netral. Ini mengindikasikan pasar sedang "
                "konsolidasi — mungkin lebih baik menunggu breakout/breakdown."
            )

        return warnings


if __name__ == "__main__":
    from data_fetcher import StockDataFetcher
    from technical import TechnicalAnalyzer
    from fundamental import FundamentalAnalyzer
    from behavioral import BehavioralAnalyzer

    fetcher = StockDataFetcher("BBCA.JK")
    df = fetcher.get_historical_data(period="6mo")
    info = fetcher.get_info()

    tech = TechnicalAnalyzer(df).analyze()
    fund = FundamentalAnalyzer(info).analyze()
    behav = BehavioralAnalyzer(df).analyze()

    rec = Recommender(
        technical=tech, fundamental=fund, behavioral=behav,
        sentiment=None, current_price=fetcher.get_current_price()
    ).recommend()

    print(f"Action: {rec.action.value} | Confidence: {rec.confidence:.0f}%")
    print(f"Horizon: {rec.horizon.value}")
    print(f"Current: {rec.current_price:,.0f}" if rec.current_price else "Price: N/A")
    print(f"Entry zone: {rec.entry_zone}")
    print(f"Target: {rec.target_price}")
    print(f"Stop loss: {rec.stop_loss}")
    print(f"\nReasoning:\n{rec.reasoning}")
