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
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 text-center text-muted-foreground">
        Tidak ada berita yang berhasil diambil.
        <br />
        <span className="text-xs">Coba refresh atau cek ticker lain.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Distribution Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
        <div
          className="flex h-2.5 rounded-full overflow-hidden mb-3"
          style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.3)" }}
        >
          {positiveCount > 0 && (
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500"
              style={{ width: `${(positiveCount / total) * 100}%` }}
            />
          )}
          {neutralCount > 0 && (
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: `${(neutralCount / total) * 100}%` }}
            />
          )}
          {negativeCount > 0 && (
            <div
              className="bg-gradient-to-r from-red-400 to-red-500"
              style={{ width: `${(negativeCount / total) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>
            <span className="text-emerald-600 font-semibold font-num">{positiveCount}</span> positif
          </span>
          <span>
            <span className="text-amber-600 font-semibold font-num">{neutralCount}</span> netral
          </span>
          <span>
            <span className="text-red-600 font-semibold font-num">{negativeCount}</span> negatif
          </span>
        </div>
      </div>

      {/* News article cards */}
      <div className="space-y-2.5">
        {articles.map((art, i) => (
          <a
            key={i}
            href={art.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl block p-4 group"
            style={{ textDecoration: "none", color: "inherit" }}
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
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span
                    className="font-medium px-2 py-0.5 rounded-full bg-secondary text-[10px]"
                    style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.04), inset -1px -1px 2px rgba(255,255,255,0.3)" }}
                  >
                    {art.source}
                  </span>
                  {art.published && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(art.published)}
                    </span>
                  )}
                  <span className="tabular-nums font-num">
                    score: {art.sentimentScore >= 0 ? "+" : ""}
                    {art.sentimentScore.toFixed(2)}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
