"""
Utility Module - Helper functions
"""

import pandas as pd
import numpy as np
from typing import Optional, Dict, List
from datetime import datetime


def format_currency(value: float, currency: str = "IDR") -> str:
    """Format angka ke currency string"""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"

    if currency == "IDR":
        if value >= 1e12:
            return f"Rp {value/1e12:.2f}T"
        elif value >= 1e9:
            return f"Rp {value/1e9:.2f}B"
        elif value >= 1e6:
            return f"Rp {value/1e6:.2f}jt"
        else:
            return f"Rp {value:,.0f}".replace(",", ".")
    else:
        return f"{currency} {value:,.2f}"


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format angka ke percentage"""
    if value is None or np.isnan(value):
        return "N/A"
    return f"{value*100:.{decimals}f}%"


def calculate_position_size(
    capital: float,
    risk_per_trade: float,  # 0.01 = 1%
    entry_price: float,
    stop_loss: float,
) -> Dict[str, float]:
    """
    Hitung ukuran posisi berdasarkan risk management.

    Args:
        capital: modal total
        risk_per_trade: persentase modal yang siap dirisikokan (misal 0.02 = 2%)
        entry_price: harga entry
        stop_loss: harga stop loss

    Returns:
        Dict dengan: shares, position_value, risk_amount
    """
    risk_amount = capital * risk_per_trade
    price_risk = abs(entry_price - stop_loss)

    if price_risk == 0:
        return {"shares": 0, "position_value": 0, "risk_amount": 0}

    # 1 lot IDX = 100 lembar
    shares = int(risk_amount / price_risk)
    lots = (shares // 100) * 100
    position_value = lots * entry_price

    return {
        "shares": shares,
        "lots_lots": lots // 100,
        "position_value": position_value,
        "risk_amount": risk_amount,
        "actual_risk": lots * price_risk,
    }


def detect_market_regime(df: pd.DataFrame) -> str:
    """Deteksi apakah pasar sedang trending atau ranging"""
    if len(df) < 50:
        return "Unknown"

    close = df["Close"]
    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean() if len(df) >= 200 else sma50

    if len(df) < 200:
        # Pakai volatilitas saja
        volatility = close.pct_change().std() * np.sqrt(252)
        if volatility > 0.4:
            return "Volatile"
        elif volatility > 0.2:
            return "Normal"
        else:
            return "Calm"

    # Cek arah SMA
    current_close = float(close.iloc[-1])
    current_sma50 = float(sma50.iloc[-1])
    current_sma200 = float(sma200.iloc[-1])

    sma50_slope = (current_sma50 - float(sma50.iloc[-10])) / float(sma50.iloc[-10])
    sma200_slope = (current_sma200 - float(sma200.iloc[-30])) / float(sma200.iloc[-30])

    if sma50_slope > 0.02 and current_close > current_sma50:
        return "Bull Market"
    elif sma50_slope < -0.02 and current_close < current_sma50:
        return "Bear Market"
    elif abs(sma50_slope) < 0.01:
        return "Sideways / Consolidation"
    else:
        return "Transitioning"


def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.05) -> float:
    """Hitung Sharpe Ratio (annualized)"""
    if returns.std() == 0 or len(returns) < 2:
        return 0.0
    excess_returns = returns.mean() * 252 - risk_free_rate
    return float(excess_returns / (returns.std() * np.sqrt(252)))


def calculate_max_drawdown(prices: pd.Series) -> float:
    """Hitung Maximum Drawdown"""
    peak = prices.cummax()
    drawdown = (prices - peak) / peak
    return float(drawdown.min())


def get_idx_holidays(year: int) -> List[str]:
    """Hari libur bursa IDX (contoh, tidak lengkap)"""
    # Simplified - in real app, fetch from IDX
    common_holidays = [
        f"{year}-01-01",  # New Year
        f"{year}-02-08",  # Isra Mikraj
        f"{year}-03-11",  # Nyepi
        f"{year}-04-10",  # Eid (varies)
        f"{year}-05-01",  # Labor Day
        f"{year}-05-18",  # Ascension
        f"{year}-06-01",  # Pancasila
        f"{year}-07-17",  # Eid al-Adha (varies)
        f"{year}-08-17",  # Independence Day
        f"{year}-12-25",  # Christmas
    ]
    return common_holidays
