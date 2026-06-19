/**
 * Sentiment Analysis - Indonesian
 * Lexicon-based sentiment analysis untuk teks bahasa Indonesia.
 */

import lexicon from "./sentiment-lexicon.json";

export type SentimentLabel =
  | "VERY_POSITIVE"
  | "POSITIVE"
  | "NEUTRAL"
  | "NEGATIVE"
  | "VERY_NEGATIVE";

export const SENTIMENT_INDONESIAN: Record<SentimentLabel, string> = {
  VERY_POSITIVE: "Sangat Positif",
  POSITIVE: "Positif",
  NEUTRAL: "Netral",
  NEGATIVE: "Negatif",
  VERY_NEGATIVE: "Sangat Negatif",
};

export const SENTIMENT_EMOJI: Record<SentimentLabel, string> = {
  VERY_POSITIVE: "😄",
  POSITIVE: "🙂",
  NEUTRAL: "😐",
  NEGATIVE: "🙁",
  VERY_NEGATIVE: "😠",
};

export const SENTIMENT_SCORE: Record<SentimentLabel, number> = {
  VERY_POSITIVE: 2,
  POSITIVE: 1,
  NEUTRAL: 0,
  NEGATIVE: -1,
  VERY_NEGATIVE: -2,
};

const POSITIVE = new Set(lexicon.positive.map((w) => w.toLowerCase().trim()));
const NEGATIVE = new Set(lexicon.negative.map((w) => w.toLowerCase().trim()));
const INTENSIFIERS = new Set(lexicon.intensifiers.map((w) => w.toLowerCase().trim()));
const NEGATIONS = new Set(lexicon.negation.map((w) => w.toLowerCase().trim()));

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-zA-ZÀ-ſ\-]+/g) || [];
}

export function analyzeText(text: string): { label: SentimentLabel; score: number } {
  if (!text) return { label: "NEUTRAL", score: 0 };

  const words = tokenize(text);
  if (words.length === 0) return { label: "NEUTRAL", score: 0 };

  let totalScore = 0;
  let sentimentWordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let matched = false;

    // Check 3-word and 2-word phrases first
    for (const phraseLen of [3, 2]) {
      if (i + phraseLen <= words.length) {
        const phrase = words.slice(i, i + phraseLen).join(" ");
        if (POSITIVE.has(phrase)) {
          const negated = checkNegation(words, i);
          totalScore += negated ? -1 : 1;
          sentimentWordCount++;
          i += phraseLen - 1;
          matched = true;
          break;
        } else if (NEGATIVE.has(phrase)) {
          const negated = checkNegation(words, i);
          totalScore += negated ? 1 : -1;
          sentimentWordCount++;
          i += phraseLen - 1;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    if (POSITIVE.has(word)) {
      const negated = checkNegation(words, i);
      totalScore += negated ? -1 : 1;
      sentimentWordCount++;
    } else if (NEGATIVE.has(word)) {
      const negated = checkNegation(words, i);
      totalScore += negated ? 1 : -1;
      sentimentWordCount++;
    }
  }

  if (sentimentWordCount === 0) return { label: "NEUTRAL", score: 0 };

  const avgScore = totalScore / sentimentWordCount;
  const bounded = Math.max(-2, Math.min(2, avgScore));

  let label: SentimentLabel;
  if (bounded >= 1) label = "VERY_POSITIVE";
  else if (bounded >= 0.3) label = "POSITIVE";
  else if (bounded <= -1) label = "VERY_NEGATIVE";
  else if (bounded <= -0.3) label = "NEGATIVE";
  else label = "NEUTRAL";

  return { label, score: bounded };
}

function checkNegation(words: string[], idx: number): boolean {
  // Check 1-2 words before for negation
  for (let j = Math.max(0, idx - 2); j < idx; j++) {
    if (NEGATIONS.has(words[j])) return true;
  }
  return false;
}
