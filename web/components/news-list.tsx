"use client";

import {
  SENTIMENT_INDONESIAN,
  SENTIMENT_EMOJI,
} from "@/lib/sentiment";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type { NewsArticle } from "@/lib/news";

interface NewsListProps {
  articles: NewsArticle[];
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

const sentimentVariant: Record<string, "bull" | "bear" | "neutral"> = {
  VERY_POSITIVE: "bull",
  POSITIVE: "bull",
  NEUTRAL: "neutral",
  NEGATIVE: "bear",
  VERY_NEGATIVE: "bear",
};

const sentimentEmoji: Record<string, string> = {
  VERY_POSITIVE: "🟢🟢",
  POSITIVE: "🟢",
  NEUTRAL: "🟡",
  NEGATIVE: "🔴",
  VERY_NEGATIVE: "🔴🔴",
};

export function NewsList({
  articles,
  positiveCount,
  negativeCount,
  neutralCount,
}: NewsListProps) {
  const total = positiveCount + negativeCount + neutralCount;

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        Tidak ada berita yang berhasil diambil.
        <br />
        <span className="text-xs">Coba refresh atau cek ticker lain.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Distribution Bar */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          {positiveCount > 0 && (
            <div
              className="bg-bull-500"
              style={{ width: `${(positiveCount / total) * 100}%` }}
            />
          )}
          {neutralCount > 0 && (
            <div
              className="bg-amber-400"
              style={{ width: `${(neutralCount / total) * 100}%` }}
            />
          )}
          {negativeCount > 0 && (
            <div
              className="bg-bear-500"
              style={{ width: `${(negativeCount / total) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>
            <span className="text-bull-600 font-semibold">{positiveCount}</span> positif
          </span>
          <span>
            <span className="text-amber-600 font-semibold">{neutralCount}</span> netral
          </span>
          <span>
            <span className="text-bear-600 font-semibold">{negativeCount}</span> negatif
          </span>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-2">
        {articles.map((art, i) => (
          <a
            key={i}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border bg-card p-3 sm:p-4 hover:bg-accent/30 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0">
                    {sentimentEmoji[art.sentiment]}
                  </span>
                  <h4 className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {art.title}
                  </h4>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{art.source}</span>
                  {art.published && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(art.published)}
                    </span>
                  )}
                  <span className="tabular-nums">
                    score: {art.sentimentScore >= 0 ? "+" : ""}
                    {art.sentimentScore.toFixed(2)}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
