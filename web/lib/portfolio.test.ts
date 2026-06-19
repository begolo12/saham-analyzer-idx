/**
 * Unit tests untuk portfolio calculation.
 *
 * Critical karena bug P&L fee pernah hampir luput — tanpa tests,
 * bug serupa bisa muncul lagi.
 *
 * Coverage:
 * - FIFO cost basis (basic buy/sell)
 * - Fee accounting (fee masuk ke cost basis & proceeds)
 * - Realized vs Unrealized P&L
 * - Multiple buys before sell (FIFO correctness)
 * - Partial sell (sell less than total shares)
 * - Average price calculation
 * - Empty inputs
 * - Snapshot aggregation
 * - Cash ledger summary
 */

import { describe, it, expect } from "vitest";
import {
  calculateHoldings,
  calculateSummary,
  normalizeTicker,
  type Transaction,
} from "@/lib/portfolio";
import {
  calculateCashSummary,
  type CashEntry,
} from "@/lib/cash-ledger";
import {
  computeCurrentSnapshot,
  aggregateSnapshots,
  type PortfolioSnapshot,
} from "@/lib/portfolio-snapshots";

// Helper to make a transaction concisely
function tx(
  id: string,
  ticker: string,
  type: "BUY" | "SELL",
  price: number,
  quantity: number,
  date: string,
  fee = 0,
): Transaction {
  return {
    id,
    ticker,
    type,
    price,
    quantity,
    fee,
    date,
    createdAt: `${date}T${String(parseInt(id) || 0).padStart(2, "0")}:00:00Z`,
  };
}

describe("normalizeTicker", () => {
  it("strips .JK suffix", () => {
    expect(normalizeTicker("BBCA.JK")).toBe("BBCA");
    expect(normalizeTicker("bbca.jk")).toBe("BBCA"); // also uppercases
  });

  it("uppercases ticker", () => {
    expect(normalizeTicker("bbca")).toBe("BBCA");
  });

  it("returns as-is if already clean", () => {
    expect(normalizeTicker("BBCA")).toBe("BBCA");
  });
});

describe("calculateHoldings — basic cases", () => {
  it("returns empty for no transactions", () => {
    expect(calculateHoldings([])).toEqual([]);
  });

  it("single buy creates one holding with correct avg price", () => {
    const holdings = calculateHoldings([
      tx("1", "BBCA", "BUY", 5000, 1000, "2025-01-01"),
    ]);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      ticker: "BBCA",
      totalShares: 1000,
      averagePrice: 5000,
      totalCost: 5000000,
      realizedPL: 0,
      buyTransactions: 1,
      sellTransactions: 0,
    });
  });

  it("uses last 8 chars of date for createdAt ordering when dates equal", () => {
    // When two txs have same date, createdAt breaks the tie.
    const a = tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01");
    const b = tx("2", "BBCA", "SELL", 6000, 50, "2025-01-01");
    a.createdAt = "2025-01-01T01:00:00Z";
    b.createdAt = "2025-01-01T02:00:00Z";
    const holdings = calculateHoldings([b, a]); // intentionally unsorted
    expect(holdings[0].totalShares).toBe(50);
    expect(holdings[0].realizedPL).toBe(50000); // (6000*50 - 0) - (5000*50) = 50000
  });
});

describe("calculateHoldings — FIFO", () => {
  it("FIFO: sell draws from earliest buys first", () => {
    const txs = [
      tx("1", "BBCA", "BUY", 4000, 100, "2025-01-01"),
      tx("2", "BBCA", "BUY", 6000, 100, "2025-02-01"),
      tx("3", "BBCA", "SELL", 7000, 150, "2025-03-01"),
    ];
    const holdings = calculateHoldings(txs);
    expect(holdings[0].totalShares).toBe(50);
    // FIFO: 100@4000 + 50@6000 = cost 700_000
    // Proceeds: 150 * 7000 = 1_050_000
    // Realized: 350_000
    expect(holdings[0].realizedPL).toBe(350000);
    // Remaining 50 shares @ avg 6000 from second lot
    expect(holdings[0].averagePrice).toBe(6000);
    expect(holdings[0].totalCost).toBe(300000);
  });

  it("sell more than owned: caps at total shares (no negative)", () => {
    const txs = [
      tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01"),
      tx("2", "BBCA", "SELL", 6000, 200, "2025-02-01"), // tries to sell 200, only 100 available
    ];
    const holdings = calculateHoldings(txs);
    // totalShares can't go negative; FIFO consumes only what's there
    expect(holdings[0].totalShares).toBe(0);
    // Realized: 100 sold @ 6000 - 100 cost @ 5000 = 100_000
    expect(holdings[0].realizedPL).toBe(100000);
  });
});

describe("calculateHoldings — fee accounting", () => {
  it("fee on BUY increases totalCost (so avg price is higher)", () => {
    const holdings = calculateHoldings([
      tx("1", "BBCA", "BUY", 5000, 1000, "2025-01-01", 5000), // fee = 5000
    ]);
    expect(holdings[0].totalCost).toBe(5005000); // 5_000_000 + 5_000
    expect(holdings[0].averagePrice).toBe(5005);
  });

  it("fee on SELL reduces realizedPL (proceeds minus fee)", () => {
    const txs = [
      tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01", 0),
      tx("2", "BBCA", "SELL", 7000, 100, "2025-02-01", 7000), // 1% fee
    ];
    const holdings = calculateHoldings(txs);
    // Proceeds: 100 * 7000 - 7000 = 693_000
    // Cost: 500 * 1000 = 500_000
    // Realized: 193_000
    expect(holdings[0].realizedPL).toBe(193000);
  });

  it("fee is correctly amortized across partial sells", () => {
    // Bug scenario: earlier sell might have over-counted cost basis
    const txs = [
      tx("1", "BBCA", "BUY", 5000, 1000, "2025-01-01", 5000),
      tx("2", "BBCA", "SELL", 6000, 500, "2025-02-01", 3000),
    ];
    const holdings = calculateHoldings(txs);
    // Cost of 500 sold (proportional): 5000*1000 + 5000 = 5_005_000 → per share 5005
    // 500 * 5005 = 2_502_500
    // Proceeds: 500 * 6000 - 3000 = 2_997_000
    // Realized: 494_500
    expect(holdings[0].realizedPL).toBe(494500);
    expect(holdings[0].totalShares).toBe(500);
  });
});

describe("calculateHoldings — current price mark-to-market", () => {
  it("unrealized PL positive when current price > avg", () => {
    const holdings = calculateHoldings(
      [tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01")],
      { BBCA: 6000 },
    );
    expect(holdings[0].currentPrice).toBe(6000);
    expect(holdings[0].currentValue).toBe(600000);
    expect(holdings[0].unrealizedPL).toBe(100000); // 600_000 - 500_000
    expect(holdings[0].unrealizedPLPercent).toBe(20);
  });

  it("unrealized PL negative when current price < avg", () => {
    const holdings = calculateHoldings(
      [tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01")],
      { BBCA: 4000 },
    );
    expect(holdings[0].unrealizedPL).toBe(-100000);
    expect(holdings[0].unrealizedPLPercent).toBe(-20);
  });

  it("null current price when no quote", () => {
    const holdings = calculateHoldings([
      tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01"),
    ]);
    expect(holdings[0].currentPrice).toBeNull();
    expect(holdings[0].currentValue).toBeNull();
    expect(holdings[0].unrealizedPL).toBeNull();
    expect(holdings[0].unrealizedPLPercent).toBeNull();
  });
});

describe("calculateSummary", () => {
  it("aggregates total cost, value, and P&L across holdings", () => {
    const txs = [
      tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01"),
      tx("2", "BMRI", "BUY", 4000, 100, "2025-01-01"),
    ];
    const holdings = calculateHoldings(txs, { BBCA: 6000, BMRI: 3500 });
    const summary = calculateSummary(holdings, txs);
    expect(summary.totalCost).toBe(900000); // 500k + 400k
    expect(summary.totalValue).toBe(950000); // 600k + 350k
    expect(summary.totalUnrealizedPL).toBe(50000);
    expect(summary.totalPL).toBe(50000);
    expect(summary.holdingsCount).toBe(2);
    expect(summary.transactionsCount).toBe(2);
  });

  it("win rate counts only sell transactions with profit", () => {
    const txs = [
      tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01"),
      tx("2", "BBCA", "SELL", 6000, 50, "2025-02-01"), // win
      tx("3", "BBCA", "BUY", 7000, 100, "2025-03-01"),
      tx("4", "BBCA", "SELL", 6000, 50, "2025-04-01"), // loss
    ];
    const holdings = calculateHoldings(txs);
    const summary = calculateSummary(holdings, txs);
    // 1 win out of 2 sells = 50%
    expect(summary.winRate).toBe(50);
  });

  it("empty portfolio returns zero values", () => {
    const summary = calculateSummary([], []);
    expect(summary.totalCost).toBe(0);
    expect(summary.totalValue).toBe(0);
    expect(summary.totalPL).toBe(0);
    expect(summary.totalPLPercent).toBe(0);
    expect(summary.holdingsCount).toBe(0);
    expect(summary.winRate).toBe(0);
  });
});

describe("calculateCashSummary", () => {
  function entry(
    id: string,
    type: "TOPUP" | "WITHDRAW",
    amount: number,
    date: string,
  ): CashEntry {
    return { id, type, amount, date, createdAt: `${date}T00:00:00Z` };
  }

  it("net cash = topups - withdraws", () => {
    const summary = calculateCashSummary([
      entry("1", "TOPUP", 10000000, "2025-01-01"),
      entry("2", "TOPUP", 5000000, "2025-02-01"),
      entry("3", "WITHDRAW", 2000000, "2025-03-01"),
    ]);
    expect(summary.totalTopup).toBe(15000000);
    expect(summary.totalWithdraw).toBe(2000000);
    expect(summary.cashBalance).toBe(13000000);
  });

  it("empty cash ledger → zero balance", () => {
    expect(calculateCashSummary([])).toEqual({
      totalTopup: 0,
      totalWithdraw: 0,
      cashBalance: 0,
      transactionCount: 0,
    });
  });

  it("handles withdraw exceeding topup (negative balance)", () => {
    const summary = calculateCashSummary([
      entry("1", "TOPUP", 1000000, "2025-01-01"),
      entry("2", "WITHDRAW", 5000000, "2025-02-01"),
    ]);
    expect(summary.cashBalance).toBe(-4000000);
  });
});

describe("computeCurrentSnapshot", () => {
  it("computes total value = cash + stock value", () => {
    const transactions = [tx("1", "BBCA", "BUY", 5000, 100, "2025-01-01")];
    const cashEntries = [
      { id: "c1", type: "TOPUP" as const, amount: 1000000, date: "2025-01-01", createdAt: "2025-01-01T00:00:00Z" },
    ];
    const snapshot = computeCurrentSnapshot(transactions, cashEntries, { BBCA: 5500 });
    expect(snapshot.stockValue).toBe(550000);
    expect(snapshot.cashBalance).toBe(1000000);
    expect(snapshot.totalValue).toBe(1550000);
    expect(snapshot.netInvested).toBe(1000000);
    expect(snapshot.totalPL).toBe(50000); // 550k - 500k cost
    expect(snapshot.plPct).toBe(5); // 50k / 1M
  });

  it("zero stocks → snapshot is just cash", () => {
    const snapshot = computeCurrentSnapshot(
      [],
      [{ id: "c1", type: "TOPUP" as const, amount: 500000, date: "2025-01-01", createdAt: "2025-01-01T00:00:00Z" }],
      {},
    );
    expect(snapshot.totalValue).toBe(500000);
    expect(snapshot.stockValue).toBe(0);
    expect(snapshot.totalPL).toBe(0);
    expect(snapshot.plPct).toBe(0);
  });
});

describe("aggregateSnapshots", () => {
  function snap(date: string, value: number, plPct = 0): PortfolioSnapshot {
    return {
      date,
      totalValue: value,
      cashBalance: 0,
      stockValue: value,
      totalCost: value,
      totalPL: 0,
      plPct,
      netInvested: value,
      createdAt: `${date}T00:00:00Z`,
    };
  }

  it("returns as-is if count <= maxPoints", () => {
    const snaps = [snap("2025-01-01", 1000), snap("2025-01-02", 1100)];
    expect(aggregateSnapshots(snaps, 5)).toHaveLength(2);
  });

  it("aggregates older data when count > maxPoints", () => {
    const snaps = Array.from({ length: 100 }, (_, i) =>
      snap(`2025-01-${String(i + 1).padStart(2, "0")}`, 1000 + i),
    );
    const result = aggregateSnapshots(snaps, 10);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.length).toBeGreaterThan(0);
    // First bucket should have avg of values 1000-1009 (1004.5)
    expect(result[0].totalValue).toBeCloseTo(1004.5, 0);
  });
});
