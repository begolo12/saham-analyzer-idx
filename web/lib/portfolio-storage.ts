"use client";

import { useEffect, useState } from "react";
import {
  type Transaction,
  generateId,
  normalizeTicker,
} from "@/lib/portfolio";

const STORAGE_KEY = "saham_portfolio";

export function getTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    window.dispatchEvent(new CustomEvent("portfolio-updated"));
  } catch (err) {
    console.error("Failed to save portfolio:", err);
  }
}

export function addTransaction(
  tx: Omit<Transaction, "id" | "createdAt">,
): Transaction {
  const transactions = getTransactions();
  const newTx: Transaction = {
    ...tx,
    ticker: normalizeTicker(tx.ticker),
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  transactions.unshift(newTx);
  saveTransactions(transactions);
  return newTx;
}

export function removeTransaction(id: string): void {
  const transactions = getTransactions().filter((t) => t.id !== id);
  saveTransactions(transactions);
}

export function clearAllTransactions(): void {
  saveTransactions([]);
}

export function usePortfolio() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTransactions(getTransactions());

    const handler = () => setTransactions(getTransactions());
    window.addEventListener("portfolio-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("portfolio-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { transactions, mounted };
}
