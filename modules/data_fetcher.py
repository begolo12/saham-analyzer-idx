"""
Data Fetcher Module
Mengambil data saham real-time dari Yahoo Finance untuk saham IDX (Indonesia).

Sumber: Yahoo Finance (gratis, real-time)
Format ticker IDX: BBCA.JK, TLKM.JK, ASII.JK, dll.
"""

import yfinance as yf
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import warnings

from modules.utils import retry

logger = logging.getLogger(__name__)


# Daftar saham-saham IDX yang paling liquid (LQ45 + populer)
POPULAR_IDX_STOCKS = {
    # Perbankan
    "BBCA.JK": "Bank Central Asia",
    "BBRI.JK": "Bank Rakyat Indonesia",
    "BMRI.JK": "Bank Mandiri",
    "BBNI.JK": "Bank Negara Indonesia",
    "BSIM.JK": "Bank Sinar Mas",
    # Telekomunikasi
    "TLKM.JK": "Telekomunikasi Indonesia",
    "ISAT.JK": "Indosat",
    "EXCL.JK": "XL Axiata",
    # Konsumer
    "UNVR.JK": "Unilever Indonesia",
    "ICBP.JK": "Indofood CBP",
    "INDF.JK": "Indofood Sukses Makmur",
    "MYOR.JK": "Mayora Indah",
    "KLBF.JK": "Kalbe Farma",
    "SIDO.JK": "Industri Jamu Sido Muncul",
    # Otomotif & Manufaktur
    "ASII.JK": "Astra International",
    "AUTO.JK": "Astra Otoparts",
    "UNTR.JK": "United Tractors",
    "INCO.JK": "Vale Indonesia",
    # Pertambangan & Energi
    "ANTM.JK": "Aneka Tambang",
    "PTBA.JK": "Bukit Asam",
    "PGAS.JK": "Perusahaan Gas Negara",
    "ADRO.JK": "Adaro Energy",
    "ITMG.JK": "Indo Tambangraya Megah",
    "MEDC.JK": "Medco Energi",
    # Properti & Konstruksi
    "BSDE.JK": "Bumi Serpong Damai",
    "PWON.JK": "Pakuwon Jati",
    "CTRA.JK": "Ciputra Development",
    "SMGR.JK": "Semen Indonesia",
    "INTP.JK": "Indocement Tunggal Prakarsa",
    # Ritel
    "MAPI.JK": "Mitra Adiperkasa",
    "ACES.JK": "Ace Hardware Indonesia",
    "LPPF.JK": "Matahari Department Store",
    "AMRT.JK": "Sumber Alfaria Trijaya",
    # Teknologi & Lainnya
    "GOTO.JK": "GoTo Gojek Tokopedia",
    "EMTK.JK": "Elang Mahkota Teknologi",
    "BRIS.JK": "Bank Syariah Indonesia",
    "BRPT.JK": "Barito Pacific",
    "TPIA.JK": "Chandra Asri Pacific",
    "ESSA.JK": "Surya Esa Perkasa",
    "SRTG.JK": "Saratoga Investama Sedaya",
    "HRUM.JK": "Harum Energy",
    "MDKA.JK": "Merdeka Copper Gold",
    "AMMN.JK": "Amman Mineral",
}


class StockDataFetcher:
    """Fetcher untuk data saham dari Yahoo Finance"""

    def __init__(self, ticker: str):
        """
        Args:
            ticker: Format Yahoo Finance, contoh: 'BBCA.JK', 'TLKM.JK'
        """
        self.ticker = self._validate_ticker(ticker)
        self.stock = yf.Ticker(self.ticker)
        self._info_cache: Optional[Dict] = None

    @staticmethod
    def _validate_ticker(ticker: str) -> str:
        """Pastikan ticker menggunakan suffix .JK untuk saham Indonesia"""
        ticker = ticker.upper().strip()
        # Only allow alphanumeric, dots (for .JK suffix), and max 10 chars
        import re
        ticker = re.sub(r'[^A-Z0-9.]', '', ticker)
        if not ticker:
            raise ValueError("Ticker tidak valid setelah sanitasi")
        if not ticker.endswith(".JK"):
            ticker = f"{ticker}.JK"
        if len(ticker) > 15:
            raise ValueError(f"Ticker terlalu panjang: {ticker}")
        return ticker

    # === DATA HARGA ===

    @retry(max_attempts=3, delay=1.0)
    def get_historical_data(
        self, period: str = "1y", interval: str = "1d"
    ) -> pd.DataFrame:
        """
        Ambil data historis harga saham.

        Args:
            period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
            interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

        Returns:
            DataFrame dengan kolom: Open, High, Low, Close, Adj Close, Volume
        """
        try:
            df = self.stock.history(period=period, interval=interval)
            if df.empty:
                raise ValueError(f"Tidak ada data untuk ticker {self.ticker}")
            df = df.dropna()
            return df
        except Exception as e:
            raise ConnectionError(f"Gagal mengambil data {self.ticker}: {str(e)}")

    def get_intraday_data(self, interval: str = "15m") -> pd.DataFrame:
        """Ambil data intraday untuk analisis behavioral (1-5 hari terakhir)"""
        try:
            df = self.stock.history(period="5d", interval=interval)
            return df.dropna() if not df.empty else pd.DataFrame()
        except Exception as e:
            logger.warning(f"get_intraday_data error: {e}")
            return pd.DataFrame()

    # === DATA FUNDAMENTAL ===

    def get_info(self) -> Dict[str, Any]:
        """
        Ambil info saham (rasio fundamental, deskripsi, dll).
        Yahoo Finance untuk saham IDX kadang info fundamental-nya terbatas
        karena reporting IDX berbeda format dari US.
        """
        if self._info_cache is not None:
            return self._info_cache
        try:
            info = self.stock.info or {}
            self._info_cache = info
            return info
        except Exception as e:
            logger.warning(f"get_info error for {self.ticker}: {e}")
            return {}

    def get_financials(self) -> Dict[str, pd.DataFrame]:
        """Income statement, balance sheet, cash flow"""
        try:
            return {
                "income_stmt": self.stock.income_stmt,
                "balance_sheet": self.stock.balance_sheet,
                "cash_flow": self.stock.cashflow,
            }
        except Exception as e:
            logger.warning(f"get_financials error for {self.ticker}: {e}")
            return {}

    # === HELPER METHODS ===

    def get_current_price(self) -> Optional[float]:
        """Harga terakhir"""
        info = self.get_info()
        return info.get("currentPrice") or info.get("regularMarketPrice")

    def get_currency(self) -> str:
        """Mata uang (untuk IDX biasanya IDR)"""
        info = self.get_info()
        return info.get("currency", "IDR")

    def get_company_name(self) -> str:
        """Nama lengkap perusahaan"""
        info = self.get_info()
        return info.get("longName") or info.get("shortName") or self.ticker.replace(".JK", "")

    def get_sector(self) -> str:
        """Sektor industri"""
        info = self.get_info()
        return info.get("sector", "N/A")

    def get_market_cap(self) -> Optional[float]:
        """Market cap dalam satuan mata uang lokal"""
        info = self.get_info()
        return info.get("marketCap")

    def get_summary(self) -> Dict[str, Any]:
        """Ringkasan lengkap saham untuk ditampilkan"""
        info = self.get_info()
        return {
            "ticker": self.ticker,
            "name": self.get_company_name(),
            "sector": self.get_sector(),
            "currency": self.get_currency(),
            "current_price": self.get_current_price(),
            "market_cap": self.get_market_cap(),
            "previous_close": info.get("previousClose"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "50d_avg": info.get("fiftyDayAverage"),
            "200d_avg": info.get("twoHundredDayAverage"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
        }

    def is_valid(self) -> bool:
        """Cek apakah ticker valid / sahamnya aktif di Yahoo Finance"""
        try:
            hist = self.stock.history(period="5d")
            return not hist.empty
        except Exception as e:
            logger.warning(f"is_valid error for {self.ticker}: {e}")
            return False


def fetch_multiple_stocks(tickers: List[str], period: str = "3mo") -> Dict[str, pd.DataFrame]:
    """Fetch data banyak saham sekaligus untuk perbandingan"""
    result = {}
    for t in tickers:
        try:
            fetcher = StockDataFetcher(t)
            result[t] = fetcher.get_historical_data(period=period)
        except Exception:
            continue
    return result


# === LIST DEFAULT UNTUK DROPDOWN UI ===
DEFAULT_STOCK_LIST = list(POPULAR_IDX_STOCKS.keys())


if __name__ == "__main__":
    # Quick test
    fetcher = StockDataFetcher("BBCA.JK")
    print(f"Ticker: {fetcher.ticker}")
    print(f"Name: {fetcher.get_company_name()}")
    print(f"Current Price: {fetcher.get_current_price():,.0f}" if fetcher.get_current_price() else "Price: N/A")
    print(f"Sector: {fetcher.get_sector()}")
    print("\nLast 5 days:")
    print(fetcher.get_historical_data(period="5d").tail())
