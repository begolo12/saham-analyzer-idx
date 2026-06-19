"use client";

import { useEffect, useRef } from "react";
import type { Recommendation } from "@/lib/recommender";

/**
 * Hook yang otomatis record recommendation ke self-analysis storage
 * setiap kali user melihat halaman analisa saham.
 *
 * Hanya record SEKALI per ticker per session untuk avoid spam.
 */
export function useTrackRecommendation(
  ticker: string,
  recommendation: Recommendation | null,
) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!recommendation || !ticker || !recommendation.currentPrice) return;

    // Only track once per ticker per page load
    if (trackedRef.current === ticker) return;

    // Dynamic import to avoid SSR issues
    import("@/lib/self-analysis-storage").then(({ addRecord }) => {
      // Check if this ticker has been recorded in last 24h
      import("@/lib/self-analysis-storage").then(({ getRecords }) => {
        const records = getRecords();
        const existing = records.find(
          (r) =>
            r.ticker === ticker &&
            Date.now() - new Date(r.recordedAt).getTime() < 24 * 60 * 60 * 1000,
        );

        if (existing) {
          trackedRef.current = ticker;
          return;
        }

        addRecord({
          ticker,
          action: recommendation.action,
          confidence: recommendation.confidence,
          componentScores: {
            technical: recommendation.componentScores.technical,
            fundamental: recommendation.componentScores.fundamental,
            behavioral: recommendation.componentScores.behavioral,
            sentiment: recommendation.componentScores.sentiment,
          },
          weights: {
            technical: recommendation.weights.technical,
            fundamental: recommendation.weights.fundamental,
            behavioral: recommendation.weights.behavioral,
            sentiment: recommendation.weights.sentiment,
          },
          entryPrice: recommendation.currentPrice,
          userFeedback: null,
        });

        trackedRef.current = ticker;
      });
    });
  }, [ticker, recommendation]);
}
