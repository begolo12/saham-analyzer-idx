"""
Quick smoke tests untuk aplikasi.
Run: python tests/test_analysis.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def test_data_fetcher():
    """Test Yahoo Finance fetcher dengan ticker valid"""
    from modules.data_fetcher import StockDataFetcher

    print("🧪 Test 1: Data Fetcher")
    fetcher = StockDataFetcher("BBCA.JK")
    assert fetcher.ticker == "BBCA.JK", "Ticker should have .JK suffix"
    print(f"   ✓ Ticker valid: {fetcher.ticker}")

    df = fetcher.get_historical_data(period="3mo")
    assert not df.empty, "Data should not be empty"
    assert "Close" in df.columns, "Should have Close column"
    assert len(df) > 30, "Should have at least 30 days"
    print(f"   ✓ Got {len(df)} days of data, last price: {df['Close'].iloc[-1]:,.0f}")

    summary = fetcher.get_summary()
    assert summary["name"], "Should have company name"
    print(f"   ✓ Company: {summary['name']}")

    # Test invalid ticker
    invalid = StockDataFetcher("XXXXX.JK")
    try:
        df = invalid.get_historical_data(period="5d")
        if df.empty:
            print("   ✓ Invalid ticker returns empty data")
        else:
            print("   ⚠ Invalid ticker returned data (might be valid)")
    except Exception:
        print("   ✓ Invalid ticker raises exception")


def test_technical_analyzer():
    """Test technical analysis"""
    from modules.data_fetcher import StockDataFetcher
    from modules.technical import TechnicalAnalyzer

    print("\n🧪 Test 2: Technical Analyzer")
    fetcher = StockDataFetcher("BBRI.JK")
    df = fetcher.get_historical_data(period="6mo")

    analyzer = TechnicalAnalyzer(df)
    result = analyzer.analyze()

    assert -100 <= result.overall_score <= 100, "Score should be -100..+100"
    print(f"   ✓ Overall score: {result.overall_score:.1f}")
    print(f"   ✓ Signal: {result.overall_signal.value}")
    print(f"   ✓ Trend: {result.trend}")

    assert len(result.indicators) > 0, "Should have indicators"
    print(f"   ✓ {len(result.indicators)} indicators calculated")

    for ind in result.indicators:
        assert -2 <= ind.score <= 2, f"{ind.name} score out of range: {ind.score}"
    print("   ✓ All indicator scores within valid range")


def test_fundamental_analyzer():
    """Test fundamental analyzer"""
    from modules.data_fetcher import StockDataFetcher
    from modules.fundamental import FundamentalAnalyzer

    print("\n🧪 Test 3: Fundamental Analyzer")
    fetcher = StockDataFetcher("TLKM.JK")
    info = fetcher.get_info()

    analyzer = FundamentalAnalyzer(info)
    result = analyzer.analyze()

    print(f"   ✓ Overall signal: {result.overall_signal.value}")
    print(f"   ✓ Score: {result.overall_score:.1f}")
    print(f"   ✓ Data availability: {result.data_availability*100:.0f}%")
    assert 0 <= result.data_availability <= 1
    assert len(result.metrics) > 0


def test_behavioral_analyzer():
    """Test behavioral analyzer"""
    from modules.data_fetcher import StockDataFetcher
    from modules.behavioral import BehavioralAnalyzer

    print("\n🧪 Test 4: Behavioral Analyzer")
    fetcher = StockDataFetcher("ASII.JK")
    df = fetcher.get_historical_data(period="6mo")

    analyzer = BehavioralAnalyzer(df)
    result = analyzer.analyze()

    print(f"   ✓ Overall: {result.overall_signal.value}")
    print(f"   ✓ Patterns detected: {len(result.patterns)}")
    print(f"   ✓ Support levels: {len(result.support_levels)}")
    print(f"   ✓ Resistance levels: {len(result.resistance_levels)}")

    for p in result.patterns:
        print(f"     - [{p.pattern}] {p.signal.value}")


def test_sentiment_analyzer():
    """Test sentiment analyzer (lightweight - no internet needed)"""
    from modules.sentiment import IndonesianSentimentAnalyzer

    print("\n🧪 Test 5: Sentiment Lexicon")
    analyzer = IndonesianSentimentAnalyzer()

    # Positive text
    pos_text = "Saham BBCA naik tajam dan membukukan laba tertinggi"
    label, score = analyzer.analyze_text(pos_text)
    print(f"   ✓ Positive: '{pos_text[:40]}...' → {label.value} ({score:.2f})")
    assert score > 0, "Should be positive"

    # Negative text
    neg_text = "Perusahaan mengalami kerugian besar dan gagal bayar dividen"
    label, score = analyzer.analyze_text(neg_text)
    print(f"   ✓ Negative: '{neg_text[:40]}...' → {label.value} ({score:.2f})")
    assert score < 0, "Should be negative"

    # Neutral text
    neu_text = "Hari ini Rapat Umum Pemegang Saham"
    label, score = analyzer.analyze_text(neu_text)
    print(f"   ✓ Neutral: '{neu_text[:40]}...' → {label.value} ({score:.2f})")


def test_recommender():
    """Test end-to-end recommendation"""
    from modules.data_fetcher import StockDataFetcher
    from modules.technical import TechnicalAnalyzer
    from modules.fundamental import FundamentalAnalyzer
    from modules.behavioral import BehavioralAnalyzer
    from modules.recommender import Recommender

    print("\n🧪 Test 6: End-to-end Recommendation")
    fetcher = StockDataFetcher("BBCA.JK")
    df = fetcher.get_historical_data(period="6mo")
    info = fetcher.get_info()

    tech = TechnicalAnalyzer(df).analyze()
    fund = FundamentalAnalyzer(info).analyze()
    behav = BehavioralAnalyzer(df).analyze()

    rec = Recommender(
        technical=tech, fundamental=fund, behavioral=behav,
        sentiment=None, current_price=fetcher.get_current_price(),
    ).recommend()

    print(f"   ✓ Action: {rec.action.value}")
    print(f"   ✓ Confidence: {rec.confidence:.1f}%")
    print(f"   ✓ Horizon: {rec.horizon.value}")
    if rec.target_price:
        print(f"   ✓ Target: Rp {rec.target_price:,.0f}")
    if rec.stop_loss:
        print(f"   ✓ Stop Loss: Rp {rec.stop_loss:,.0f}")

    assert rec.action.value in ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]
    assert 0 <= rec.confidence <= 100


def test_utils():
    """Test utility functions"""
    from modules.utils import (
        format_currency, calculate_position_size, detect_market_regime,
        calculate_max_drawdown,
    )

    print("\n🧪 Test 7: Utilities")
    print(f"   ✓ Format IDR: {format_currency(1234567890)}")

    pos = calculate_position_size(
        capital=100_000_000,
        risk_per_trade=0.02,
        entry_price=10000,
        stop_loss=9500,
    )
    print(f"   ✓ Position size: {pos['lots_lots']} lots (risk: Rp{pos['risk_amount']:,.0f})")

    prices = pd.Series([100, 105, 110, 108, 102, 95, 90, 100, 110])
    mdd = calculate_max_drawdown(prices)
    print(f"   ✓ Max drawdown: {mdd*100:.1f}%")


if __name__ == "__main__":
    print("=" * 60)
    print("  Saham Analyzer - Test Suite")
    print("=" * 60)

    try:
        test_data_fetcher()
        test_technical_analyzer()
        test_fundamental_analyzer()
        test_behavioral_analyzer()
        test_sentiment_analyzer()
        test_recommender()
        test_utils()

        print("\n" + "=" * 60)
        print("  ✅ All tests passed!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
