"use client";

import { useEffect, useState } from "react";
import { type CashEntry, generateId } from "@/lib/cash-ledger";

const CASH_KEY = "saham_cash_ledger";

export function getCashEntries(): CashEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CASH_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveCashEntries(entries: CashEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CASH_KEY, JSON.stringify(entries));
    // Pakai event name yang sama dengan portfolio agar listeners ter-trigger
    // dan supaya komponen yang butuh keduanya cukup subscribe ke satu event.
    window.dispatchEvent(new CustomEvent("portfolio-updated"));
  } catch (err) {
    console.error("Failed to save cash ledger:", err);
  }
}

export function addCashEntry(
  entry: Omit<CashEntry, "id" | "createdAt">,
): CashEntry {
  const entries = getCashEntries();
  const newEntry: CashEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  // Newest first — sama pola dengan addTransaction
  entries.unshift(newEntry);
  saveCashEntries(entries);
  return newEntry;
}

export function removeCashEntry(id: string): void {
  const entries = getCashEntries().filter((e) => e.id !== id);
  saveCashEntries(entries);
}

export function clearAllCashEntries(): void {
  saveCashEntries([]);
}

export function useCashLedger() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEntries(getCashEntries());

    const handler = () => setEntries(getCashEntries());
    window.addEventListener("portfolio-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("portfolio-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { entries, mounted };
}
