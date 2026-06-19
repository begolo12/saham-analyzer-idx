"use client";

import { useEffect, useState } from "react";
import type { RecommendationRecord, TrackedAction } from "@/lib/self-analysis";

const STORAGE_KEY = "saham_self_analysis";

export function getRecords(): RecommendationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveRecords(records: RecommendationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep only last 100 records
    const trimmed = records.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("self-analysis-updated"));
  } catch (err) {
    console.error("Failed to save self-analysis records:", err);
  }
}

export function addRecord(
  record: Omit<RecommendationRecord, "id" | "recordedAt" | "checkAt">,
): RecommendationRecord {
  const records = getRecords();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();
  // Check outcome 1 day later
  const checkAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const newRecord: RecommendationRecord = {
    ...record,
    id,
    recordedAt: now.toISOString(),
    checkAt: checkAt.toISOString(),
  };

  records.push(newRecord);
  saveRecords(records);
  return newRecord;
}

export function updateRecord(
  id: string,
  updates: Partial<RecommendationRecord>,
): void {
  const records = getRecords().map((r) =>
    r.id === id ? { ...r, ...updates } : r,
  );
  saveRecords(records);
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  saveRecords(records);
}

export function clearAllRecords(): void {
  saveRecords([]);
}

export function useSelfAnalysis() {
  const [records, setRecords] = useState<RecommendationRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecords(getRecords());

    const handler = () => setRecords(getRecords());
    window.addEventListener("self-analysis-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("self-analysis-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { records, mounted };
}
