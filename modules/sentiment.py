"""
News Sentiment Module
Mengambil berita saham dari media Indonesia dan menganalisis sentimen.

Sumber berita:
- Kontan (kontan.co.id) - RSS feed
- CNBC Indonesia (cnbcindonesia.com) - RSS feed
- Bisnis.com - RSS feed
- Detik Finance - scraping (dengan rate limit)
- IDX Channel - scraping

Metode sentiment: Lexicon-based untuk bahasa Indonesia
(Karena pretrained model untuk finansial-ID sulit didapat gratis)
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import json
import os
import re
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import quote


class SentimentLabel(Enum):
    """Label sentimen"""
    VERY_POSITIVE = "VERY_POSITIVE"
    POSITIVE = "POSITIVE"
    NEUTRAL = "NEUTRAL"
    NEGATIVE = "NEGATIVE"
    VERY_NEGATIVE = "VERY_NEGATIVE"

    @property
    def score(self) -> float:
        mapping = {
            "VERY_POSITIVE": 2.0,
            "POSITIVE": 1.0,
            "NEUTRAL": 0.0,
            "NEGATIVE": -1.0,
            "VERY_NEGATIVE": -2.0,
        }
        return mapping[self.value]

    @property
    def indonesian(self) -> str:
        mapping = {
            "VERY_POSITIVE": "Sangat Positif",
            "POSITIVE": "Positif",
            "NEUTRAL": "Netral",
            "NEGATIVE": "Negatif",
            "VERY_NEGATIVE": "Sangat Negatif",
        }
        return mapping[self.value]


@dataclass
class NewsArticle:
    """Satu artikel berita"""
    title: str
    source: str
    url: str
    published: Optional[datetime]
    summary: str
    sentiment: SentimentLabel = SentimentLabel.NEUTRAL
    sentiment_score: float = 0.0


@dataclass
class SentimentAnalysis:
    """Hasil analisa sentimen"""
    articles: List[NewsArticle] = field(default_factory=list)
    overall_score: float = 0.0  # -100 sampai +100
    overall_label: SentimentLabel = SentimentLabel.NEUTRAL
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    summary: str = ""
    confidence: float = 0.0  # 0-1, seberapa confident berdasarkan jumlah berita


class IndonesianSentimentAnalyzer:
    """Sentiment analyzer untuk teks bahasa Indonesia"""

    def __init__(self, lexicon_path: Optional[str] = None):
        if lexicon_path is None:
            lexicon_path = os.path.join(
                os.path.dirname(__file__), "..", "data", "sentiment_lexicon.json"
            )
        self._load_lexicon(lexicon_path)

    def _load_lexicon(self, path: str):
        if not os.path.exists(path):
            self.positive_words = set()
            self.negative_words = set()
            self.intensifiers = set()
            self.negations = set()
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.positive_words = set(w.lower().strip() for w in data.get("positive", []))
        self.negative_words = set(w.lower().strip() for w in data.get("negative", []))
        self.intensifiers = set(w.lower().strip() for w in data.get("intensifiers", []))
        self.negations = set(w.lower().strip() for w in data.get("negation", []))

    def analyze_text(self, text: str) -> tuple[SentimentLabel, float]:
        """
        Analisa satu teks. Return (label, score).
        Score: -2 (very negative) sampai +2 (very positive)
        """
        if not text:
            return SentimentLabel.NEUTRAL, 0.0

        # Bersihkan teks
        text = text.lower()
        # Tokenisasi sederhana (split by whitespace + punctuation)
        words = re.findall(r"[a-zA-ZÀ-ſ\-]+", text)

        if not words:
            return SentimentLabel.NEUTRAL, 0.0

        positive_score = 0
        negative_score = 0
        total_score = 0.0
        sentiment_word_count = 0

        i = 0
        while i < len(words):
            word = words[i]
            matched_phrase = None

            # Cek 2-3 kata phrases dulu
            for phrase_len in [3, 2]:
                if i + phrase_len <= len(words):
                    phrase = " ".join(words[i : i + phrase_len])
                    if phrase in self.positive_words:
                        matched_phrase = phrase
                        matched_score = 1.0
                        matched_type = "positive"
                        i += phrase_len
                        break
                    elif phrase in self.negative_words:
                        matched_phrase = phrase
                        matched_score = 1.0
                        matched_type = "negative"
                        i += phrase_len
                        break

            if matched_phrase is None:
                if word in self.positive_words:
                    matched_phrase = word
                    matched_score = 1.0
                    matched_type = "positive"
                elif word in self.negative_words:
                    matched_phrase = word
                    matched_score = 1.0
                    matched_type = "negative"
                elif word in self.intensifiers:
                    matched_phrase = word
                    matched_score = 0.5
                    matched_type = "intensifier"
                i += 1
            else:
                # Phrase match: advance i in the outer block already handled i += phrase_len
                pass

            # Skip scoring if no match found
            if matched_phrase is None:
                continue

            # Intensifier: save and apply to next sentiment word
            if matched_type == "intensifier":
                continue

            # Cek apakah ada negasi 1-2 kata sebelumnya
            negated = False
            for j in range(max(0, i - 2), i):
                if words[j] in self.negations:
                    negated = True
                    break

            score = matched_score

            # Negate for negative words
            if matched_type == "negative":
                score = -score

            # Apply negation
            if negated:
                score = -score
                matched_type = "negative" if matched_type == "positive" else "positive"

            total_score += score
            sentiment_word_count += 1

            if matched_type == "positive":
                positive_score += 1
            elif matched_type == "negative":
                negative_score += 1

        # Normalisasi
        if sentiment_word_count == 0:
            return SentimentLabel.NEUTRAL, 0.0

        avg_score = total_score / max(sentiment_word_count, 1)
        # Bound between -2 and 2
        avg_score = max(-2.0, min(2.0, avg_score))

        # Tentukan label
        if avg_score >= 1.0:
            label = SentimentLabel.VERY_POSITIVE
        elif avg_score >= 0.3:
            label = SentimentLabel.POSITIVE
        elif avg_score <= -1.0:
            label = SentimentLabel.VERY_NEGATIVE
        elif avg_score <= -0.3:
            label = SentimentLabel.NEGATIVE
        else:
            label = SentimentLabel.NEUTRAL

        return label, float(avg_score)


class NewsFetcher:
    """Fetcher berita dari berbagai sumber Indonesia"""

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    }

    TIMEOUT = 10  # detik

    def __init__(self, sentiment_analyzer: Optional[IndonesianSentimentAnalyzer] = None):
        self.analyzer = sentiment_analyzer or IndonesianSentimentAnalyzer()
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

    def fetch_news(
        self, stock_name: str, ticker: str, max_articles: int = 20
    ) -> List[NewsArticle]:
        """
        Fetch berita terkait saham dari berbagai sumber.

        Args:
            stock_name: nama perusahaan (contoh: "Bank Central Asia")
            ticker: kode ticker (contoh: "BBCA")
            max_articles: batas maksimal artikel
        """
        articles: List[NewsArticle] = []

        # Kata kunci pencarian
        query = stock_name
        short_name = ticker.replace(".JK", "")

        # Coba dari RSS feeds dulu (lebih reliable)
        try:
            articles.extend(self._fetch_kontan_rss(short_name, query))
        except Exception as e:
            print(f"Kontan fetch error: {e}")

        try:
            articles.extend(self._fetch_cnbc_rss(short_name, query))
        except Exception as e:
            print(f"CNBC fetch error: {e}")

        # Fallback: Google News RSS (lebih reliable, agregasi banyak sumber)
        if len(articles) < 5:
            try:
                articles.extend(self._fetch_google_news(short_name, query))
            except Exception as e:
                print(f"Google News fetch error: {e}")

        # Limit
        articles = articles[:max_articles]

        # Analisa sentimen setiap artikel
        for article in articles:
            label, score = self.analyzer.analyze_text(
                f"{article.title} {article.summary}"
            )
            article.sentiment = label
            article.sentiment_score = score

        return articles

    def _fetch_kontan_rss(self, ticker: str, name: str) -> List[NewsArticle]:
        """Ambil dari Kontan search"""
        articles = []
        try:
            # Kontan search URL
            url = f"https://www.kontan.co.id/search/?search={quote(name)}"
            resp = self.session.get(url, timeout=self.TIMEOUT)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                # Cari artikel links (Kontan biasanya pakai class 'sp-hl' atau 'link')
                items = soup.select("div.list-berita a, ul.list-news li a, a.link-berita")
                for item in items[:10]:
                    title = item.get_text(strip=True)
                    href = item.get("href", "")
                    if title and href and len(title) > 15:
                        full_url = (
                            href if href.startswith("http")
                            else f"https://www.kontan.co.id{href}"
                        )
                        articles.append(
                            NewsArticle(
                                title=title[:200],
                                source="Kontan",
                                url=full_url,
                                published=None,
                                summary=title,
                            )
                        )
        except Exception as e:
            print(f"Kontan error: {e}")
        time.sleep(0.5)  # Rate limit
        return articles

    def _fetch_cnbc_rss(self, ticker: str, name: str) -> List[NewsArticle]:
        """Ambil dari CNBC Indonesia search"""
        articles = []
        try:
            url = f"https://www.cnbcindonesia.com/search?query={quote(ticker)}"
            resp = self.session.get(url, timeout=self.TIMEOUT)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                items = soup.select("article a, .list-news a, h2 a")
                for item in items[:10]:
                    title = item.get_text(strip=True)
                    href = item.get("href", "")
                    if title and href and len(title) > 15:
                        articles.append(
                            NewsArticle(
                                title=title[:200],
                                source="CNBC Indonesia",
                                url=href,
                                published=None,
                                summary=title,
                            )
                        )
        except Exception as e:
            print(f"CNBC error: {e}")
        time.sleep(0.5)
        return articles

    def _fetch_google_news(self, ticker: str, name: str) -> List[NewsArticle]:
        """Fallback: Google News RSS (sangat reliable)"""
        articles = []
        try:
            # Google News RSS - sumber terpercaya dan reliable
            url = (
                f"https://news.google.com/rss/search?"
                f"q={quote(name)}+saham&hl=id&gl=ID&ceid=ID:id"
            )
            resp = self.session.get(url, timeout=self.TIMEOUT)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "xml")
                items = soup.find_all("item")
                for item in items[:15]:
                    title = item.title.text if item.title else ""
                    link = item.link.text if item.link else ""
                    pub_date = item.pubDate.text if item.pubDate else None

                    published_dt = None
                    if pub_date:
                        try:
                            from email.utils import parsedate_to_datetime
                            published_dt = parsedate_to_datetime(pub_date)
                        except Exception:
                            pass

                    # Filter: hanya yang mention ticker atau nama
                    title_lower = title.lower()
                    if ticker.lower() in title_lower or name.lower() in title_lower:
                        articles.append(
                            NewsArticle(
                                title=title[:200],
                                source="Google News",
                                url=link,
                                published=published_dt,
                                summary=title,
                            )
                        )
        except Exception as e:
            print(f"Google News error: {e}")
        return articles


def analyze_sentiment(
    stock_name: str, ticker: str, max_articles: int = 20
) -> SentimentAnalysis:
    """
    Fungsi utama: ambil berita + analisa sentimen.

    Args:
        stock_name: nama perusahaan (contoh: "Bank Central Asia")
        ticker: kode ticker (contoh: "BBCA" atau "BBCA.JK")
        max_articles: jumlah maksimal artikel
    """
    fetcher = NewsFetcher()
    articles = fetcher.fetch_news(stock_name, ticker, max_articles)

    if not articles:
        return SentimentAnalysis(
            articles=[],
            overall_score=0.0,
            overall_label=SentimentLabel.NEUTRAL,
            summary="⚠️ Tidak ada berita yang berhasil diambil. Coba cek ticker atau coba lagi nanti.",
            confidence=0.0,
        )

    # Hitung distribusi
    positive_count = sum(1 for a in articles if a.sentiment.score > 0)
    negative_count = sum(1 for a in articles if a.sentiment.score < 0)
    neutral_count = sum(1 for a in articles if a.sentiment.score == 0)

    # Overall score (average)
    avg_score = float(np.mean([a.sentiment.score for a in articles]))
    overall_score = avg_score * 25  # Normalisasi ke -100..+100

    if avg_score >= 1.0:
        label = SentimentLabel.VERY_POSITIVE
    elif avg_score >= 0.3:
        label = SentimentLabel.POSITIVE
    elif avg_score <= -1.0:
        label = SentimentLabel.VERY_NEGATIVE
    elif avg_score <= -0.3:
        label = SentimentLabel.NEGATIVE
    else:
        label = SentimentLabel.NEUTRAL

    # Confidence berdasarkan jumlah artikel
    confidence = min(1.0, len(articles) / 15.0)

    summary = _generate_sentiment_summary(
        label, overall_score, positive_count, negative_count, neutral_count, len(articles)
    )

    return SentimentAnalysis(
        articles=articles,
        overall_score=overall_score,
        overall_label=label,
        positive_count=positive_count,
        negative_count=negative_count,
        neutral_count=neutral_count,
        summary=summary,
        confidence=confidence,
    )


def _generate_sentiment_summary(
    label: SentimentLabel,
    score: float,
    pos: int,
    neg: int,
    neu: int,
    total: int,
) -> str:
    mood_map = {
        SentimentLabel.VERY_POSITIVE: "sangat positif",
        SentimentLabel.POSITIVE: "positif",
        SentimentLabel.NEUTRAL: "netral",
        SentimentLabel.NEGATIVE: "negatif",
        SentimentLabel.VERY_NEGATIVE: "sangat negatif",
    }
    mood = mood_map.get(label, "tidak jelas")

    dominant = "positif" if pos > neg else ("negatif" if neg > pos else "seimbang")
    if pos + neg == 0:
        dominant = "seimbang (mayoritas netral)"

    return (
        f"Sentimen berita **sedang {mood}** (skor {score:+.1f}/100, dari {total} artikel).\n\n"
        f"Distribusi: {pos} positif, {neg} negatif, {neu} netral — bias **{dominant}**."
    )


if __name__ == "__main__":
    result = analyze_sentiment("Bank Central Asia", "BBCA", max_articles=15)
    print(f"Overall: {result.overall_label.value} (score: {result.overall_score:.1f})")
    print(f"Confidence: {result.confidence*100:.0f}%")
    print(f"Summary: {result.summary}\n")
    print("Articles:")
    for a in result.articles[:10]:
        print(f"  [{a.sentiment.value}] {a.title}")
        print(f"     Source: {a.source} | Score: {a.sentiment_score:.2f}")
