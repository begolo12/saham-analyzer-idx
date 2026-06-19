/**
 * News fetcher - Multi-source Indonesian news
 */

import { analyzeText, type SentimentLabel } from "./sentiment";

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  published: Date | null;
  summary: string;
  sentiment: SentimentLabel;
  sentimentScore: number;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
};

const TIMEOUT = 8000;

/**
 * Fetch from Google News RSS (most reliable)
 */
async function fetchGoogleNews(
  ticker: string,
  name: string,
): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent(`${name} saham`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=id&gl=ID&ceid=ID:id`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      // Next.js fetch caching
      next: { revalidate: 1800 }, // 30 minutes
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const xml = await response.text();
    const articles: NewsArticle[] = [];

    // Simple XML parsing for <item> tags
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

      if (!titleMatch) continue;

      const title = stripHtml(titleMatch[1]).trim();
      const link = linkMatch ? linkMatch[1].trim() : "";
      const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";

      let published: Date | null = null;
      if (pubDateStr) {
        try {
          published = new Date(pubDateStr);
        } catch {
          published = null;
        }
      }

      // Filter: must mention ticker or company name
      const titleLower = title.toLowerCase();
      if (
        ticker.toLowerCase() in titleLower ||
        name.toLowerCase().split(" ").some((w) => w.length > 3 && titleLower.includes(w.toLowerCase()))
      ) {
        articles.push({
          title: title.substring(0, 200),
          source: "Google News",
          url: link,
          published,
          summary: title,
          sentiment: "NEUTRAL",
          sentimentScore: 0,
        });
      }

      if (articles.length >= 15) break;
    }

    return articles;
  } catch (error) {
    console.error("Google News fetch error:", error);
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Main fetch function
 */
export async function fetchNews(ticker: string, name: string, maxArticles = 15): Promise<NewsArticle[]> {
  const articles = await fetchGoogleNews(ticker, name);

  // Analyze sentiment for each article
  for (const article of articles) {
    const { label, score } = analyzeText(`${article.title} ${article.summary}`);
    article.sentiment = label;
    article.sentimentScore = score;
  }

  return articles.slice(0, maxArticles);
}

export interface SentimentSummary {
  articles: NewsArticle[];
  overallScore: number;
  overallLabel: SentimentLabel;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  confidence: number;
  summary: string;
}

export function summarizeSentiment(articles: NewsArticle[]): SentimentSummary {
  if (articles.length === 0) {
    return {
      articles: [],
      overallScore: 0,
      overallLabel: "NEUTRAL",
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      confidence: 0,
      summary: "Tidak ada berita yang berhasil diambil",
    };
  }

  const positiveCount = articles.filter((a) => a.sentimentScore > 0).length;
  const negativeCount = articles.filter((a) => a.sentimentScore < 0).length;
  const neutralCount = articles.length - positiveCount - negativeCount;

  const avgScore =
    articles.reduce((sum, a) => sum + a.sentimentScore, 0) / articles.length;
  const overallScore = Math.round(avgScore * 25 * 100) / 100;

  let overallLabel: SentimentLabel;
  if (avgScore >= 1) overallLabel = "VERY_POSITIVE";
  else if (avgScore >= 0.3) overallLabel = "POSITIVE";
  else if (avgScore <= -1) overallLabel = "VERY_NEGATIVE";
  else if (avgScore <= -0.3) overallLabel = "NEGATIVE";
  else overallLabel = "NEUTRAL";

  const confidence = Math.min(1, articles.length / 15);

  const moodMap: Record<SentimentLabel, string> = {
    VERY_POSITIVE: "sangat positif",
    POSITIVE: "positif",
    NEUTRAL: "netral",
    NEGATIVE: "negatif",
    VERY_NEGATIVE: "sangat negatif",
  };

  const dominant =
    positiveCount > negativeCount
      ? "positif"
      : negativeCount > positiveCount
        ? "negatif"
        : "seimbang";

  const summary = `Sentimen berita **sedang ${moodMap[overallLabel]}** (skor ${overallScore >= 0 ? "+" : ""}${overallScore.toFixed(1)}/100, dari ${articles.length} artikel). Distribusi: ${positiveCount} positif, ${negativeCount} negatif, ${neutralCount} netral — bias **${dominant}**.`;

  return {
    articles,
    overallScore,
    overallLabel,
    positiveCount,
    negativeCount,
    neutralCount,
    confidence,
    summary,
  };
}
