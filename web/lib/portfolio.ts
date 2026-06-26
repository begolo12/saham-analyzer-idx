/**
 * Portfolio Types & Logic
 * Virtual portfolio tracker untuk saham IDX.
 *
 * Fitur:
 * - Buy/Sell transactions dengan date, price, qty, fee
 * - Current holdings (qty per ticker, average price)
 * - Realized P&L (dari transaksi jual)
 * - Unrealized P&L (mark-to-market dengan harga saat ini)
 * - Portfolio composition & history
 */

export type TransactionType = "BUY" | "SELL";

export interface Transaction {
  id: string;
  ticker: string; // Tanpa .JK
  type: TransactionType;
  date: string; // ISO date string YYYY-MM-DD
  price: number; // Harga per lembar
  quantity: number; // Jumlah lembar (lot = 100 lembar)
  fee: number; // Biaya transaksi (default 0.15%)
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface Holding {
  ticker: string;
  totalShares: number;
  averagePrice: number; // Harga rata-rata pembelian
  totalCost: number; // Total modal (price * qty + fee)
  currentPrice: number | null; // Harga saat ini (untuk mark-to-market)
  currentValue: number | null; // Nilai saat ini (currentPrice * qty)
  unrealizedPL: number | null; // currentValue - totalCost
  unrealizedPLPercent: number | null; // unrealizedPL / totalCost * 100
  realizedPL: number; // P&L dari penjualan (locked-in)
  buyTransactions: number;
  sellTransactions: number;
}

export interface PortfolioSummary {
  totalCost: number; // Total modal di portfolio aktif
  totalValue: number; // Nilai saat ini
  totalRealizedPL: number; // Total realized P&L
  totalUnrealizedPL: number; // Total unrealized P&L
  totalPL: number; // Total P&L (realized + unrealized)
  totalPLPercent: number; // % return
  holdingsCount: number;
  transactionsCount: number;
  winRate: number; // % transaksi yang untung
  bestTrade: { ticker: string; pl: number; plPercent: number } | null;
  worstTrade: { ticker: string; pl: number; plPercent: number } | null;
}

export interface PortfolioStats {
  sharpeRatio: number | null;
  maxDrawdown: number; // Worst peak-to-trough in %
  annualizedReturn: number; // Annualized return %
  avgHoldingPeriod: number; // Average days held
  totalReturnPct: number;
  volatility: number; // Annualized volatility %
  beta: number | null; // vs IHSG
  winRate: number;
  bestTrade: { ticker: string; pl: number; plPercent: number } | null;
  worstTrade: { ticker: string; pl: number; plPercent: number } | null;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  pct: number;
  ihsgWeight?: number; // IHSG sector weight %
  diff?: number; // overweight/underweight %
}

/**
 * Hitung holdings dari daftar transaksi.
 * Menggunakan FIFO (First In First Out) untuk tracking cost basis.
 */
export function calculateHoldings(
  transactions: Transaction[],
  currentPrices: Record<string, number> = {},
): Holding[] {
  // Group by ticker
  const byTicker: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!byTicker[tx.ticker]) byTicker[tx.ticker] = [];
    byTicker[tx.ticker].push(tx);
  }

  const holdings: Holding[] = [];

  for (const ticker in byTicker) {
    // FIFO queue of buys. Sort by date ascending; tiebreak by createdAt then id
    // (both unique) so that SELL never precedes its BUY when same-day trades
    // land in the array newest-first (addTransaction uses unshift).
    const txs = byTicker[ticker].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDiff !== 0) return createdDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    let totalShares = 0;
    let totalCost = 0;
    let realizedPL = 0;
    let buyCount = 0;
    let sellCount = 0;

    // FIFO queue of buys
    const buyQueue: { shares: number; price: number; fee: number }[] = [];

    for (const tx of txs) {
      if (tx.type === "BUY") {
        const cost = tx.price * tx.quantity + tx.fee;
        totalShares += tx.quantity;
        totalCost += cost;
        buyQueue.push({ shares: tx.quantity, price: tx.price, fee: tx.fee });
        buyCount++;
      } else if (tx.type === "SELL") {
        let remaining = tx.quantity;
        const feePerShare = tx.quantity > 0 ? tx.fee / tx.quantity : 0;
        let costOfSold = 0;
        let proceedsOfSold = 0;
        let sharesSold = 0;

        while (remaining > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const used = Math.min(buy.shares, remaining);
          // Cost per share includes proportional fee
          const costPerShare = (buy.price * buy.shares + buy.fee) / buy.shares;
          costOfSold += used * costPerShare;
          // Proceeds per share is sell price minus proportional fee
          proceedsOfSold += used * (tx.price - feePerShare);

          buy.shares -= used;
          remaining -= used;
          sharesSold += used;
          if (buy.shares === 0) buyQueue.shift();
        }

        // Cap at actual shares we owned — never let totalShares go negative
        totalShares -= sharesSold;
        // Reduce totalCost by actual cost basis of shares sold (not by ratio)
        totalCost -= costOfSold;
        realizedPL += proceedsOfSold - costOfSold;
        sellCount++;
      }
    }

    if (totalShares <= 0 && buyCount === 0) continue;

    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    const currentPrice = currentPrices[ticker] ?? null;
    const currentValue = currentPrice !== null ? currentPrice * totalShares : null;
    const unrealizedPL = currentValue !== null ? currentValue - totalCost : null;
    const unrealizedPLPercent =
      unrealizedPL !== null && totalCost > 0
        ? (unrealizedPL / totalCost) * 100
        : null;

    holdings.push({
      ticker,
      totalShares,
      averagePrice: Math.round(avgPrice * 100) / 100,
      totalCost: Math.round(totalCost),
      currentPrice,
      currentValue,
      unrealizedPL: unrealizedPL !== null ? Math.round(unrealizedPL) : null,
      unrealizedPLPercent:
        unrealizedPLPercent !== null
          ? Math.round(unrealizedPLPercent * 100) / 100
          : null,
      realizedPL: Math.round(realizedPL),
      buyTransactions: buyCount,
      sellTransactions: sellCount,
    });
  }

  return holdings.sort((a, b) => (b.currentValue ?? 0) - (a.currentValue ?? 0));
}

/**
 * Hitung summary portfolio.
 */
export function calculateSummary(
  holdings: Holding[],
  transactions: Transaction[],
): PortfolioSummary {
  const activeHoldings = holdings.filter((h) => h.totalShares > 0);
  const totalCost = activeHoldings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalValue = activeHoldings.reduce(
    (sum, h) => sum + (h.currentValue ?? h.totalCost),
    0,
  );
  const totalRealizedPL = holdings.reduce((sum, h) => sum + h.realizedPL, 0);
  const totalUnrealizedPL = activeHoldings.reduce(
    (sum, h) => sum + (h.unrealizedPL ?? 0),
    0,
  );
  const totalPL = totalRealizedPL + totalUnrealizedPL;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  // Win rate: berapa transaksi SELL yang untung
  const sellTransactions = transactions.filter((t) => t.type === "SELL");
  let winCount = 0;
  for (const tx of sellTransactions) {
    // Cari buy pertama sebelum sell
    const priorBuys = transactions.filter(
      (t) => t.ticker === tx.ticker && t.type === "BUY" && t.date <= tx.date,
    );
    if (priorBuys.length > 0) {
      const avgBuyPrice =
        priorBuys.reduce((sum, b) => sum + b.price, 0) / priorBuys.length;
      if (tx.price > avgBuyPrice) winCount++;
    }
  }
  const winRate = sellTransactions.length > 0 ? (winCount / sellTransactions.length) * 100 : 0;

  // Best & worst trade (berdasarkan realized P&L per saham)
  const closedTrades: Record<string, { pl: number; qty: number }> = {};
  for (const tx of transactions) {
    if (tx.type === "SELL") {
      if (!closedTrades[tx.ticker]) closedTrades[tx.ticker] = { pl: 0, qty: 0 };
      closedTrades[tx.ticker].pl += (tx.price - tx.price) * 0; // simplified
      closedTrades[tx.ticker].qty += tx.quantity;
    }
  }

  let bestTrade: PortfolioSummary["bestTrade"] = null;
  let worstTrade: PortfolioSummary["worstTrade"] = null;

  for (const h of holdings) {
    if (h.realizedPL !== 0 && h.sellTransactions > 0) {
      const plPercent = h.totalCost > 0 ? (h.realizedPL / h.totalCost) * 100 : 0;
      const trade = { ticker: h.ticker, pl: h.realizedPL, plPercent };
      if (!bestTrade || trade.pl > bestTrade.pl) bestTrade = trade;
      if (!worstTrade || trade.pl < worstTrade.pl) worstTrade = trade;
    }
  }

  return {
    totalCost: Math.round(totalCost),
    totalValue: Math.round(totalValue),
    totalRealizedPL: Math.round(totalRealizedPL),
    totalUnrealizedPL: Math.round(totalUnrealizedPL),
    totalPL: Math.round(totalPL),
    totalPLPercent: Math.round(totalPLPercent * 100) / 100,
    holdingsCount: activeHoldings.length,
    transactionsCount: transactions.length,
    winRate: Math.round(winRate),
    bestTrade,
    worstTrade,
  };
}

/**
 * Generate ID untuk transaction baru
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validasi ticker apakah ada di IDX (dengan prefix .JK)
 */
export function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim().replace(".JK", "");
}

/**
 * Hitung statistik portfolio lanjutan.
 * @param snapshots - Historical snapshots (daily values)
 * @param transactions - All transactions
 * @param holdings - Current holdings
 * @param netInvested - Total topup - total withdraw
 * @param ihsgCloses - Optional IHSG closing prices aligned with snapshots for beta
 */
export function calculatePortfolioStats(
  snapshots: Array<{ date: string; totalValue: number; netInvested: number }>,
  transactions: Transaction[],
  holdings: Holding[],
  netInvested: number,
  ihsgCloses?: number[],
): PortfolioStats {
  const summary = calculateSummary(holdings, transactions);

  // --- Daily returns from snapshots ---
  const dailyReturns: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].totalValue;
    const curr = snapshots[i].totalValue;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  // --- Sharpe Ratio (annualized, risk-free = 6% p.a. ~0.024% daily) ---
  const RISK_FREE_ANNUAL = 0.06;
  const riskFreeDaily = RISK_FREE_ANNUAL / 252;
  let sharpeRatio: number | null = null;
  if (dailyReturns.length >= 5) {
    const excessReturns = dailyReturns.map((r) => r - riskFreeDaily);
    const avgExcess =
      excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
    const variance =
      excessReturns.reduce((s, r) => s + (r - avgExcess) ** 2, 0) /
      (excessReturns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Math.round(((avgExcess / stdDev) * Math.sqrt(252)) * 100) / 100;
    }
  }

  // --- Volatility (annualized) ---
  let volatility = 0;
  if (dailyReturns.length >= 2) {
    const avg = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((s, r) => s + (r - avg) ** 2, 0) /
      (dailyReturns.length - 1);
    volatility = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
  }

  // --- Max Drawdown ---
  let maxDrawdown = 0;
  if (snapshots.length >= 2) {
    let peak = snapshots[0].totalValue;
    for (const snap of snapshots) {
      if (snap.totalValue > peak) peak = snap.totalValue;
      const dd = peak > 0 ? ((peak - snap.totalValue) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }
  maxDrawdown = Math.round(maxDrawdown * 100) / 100;

  // --- Annualized Return ---
  let annualizedReturn = 0;
  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const startVal = first.totalValue;
    const endVal = last.totalValue;
    const daysDiff =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (startVal > 0 && daysDiff > 0) {
      const totalReturn = (endVal - startVal) / startVal;
      annualizedReturn =
        Math.round(((Math.pow(1 + totalReturn, 365 / daysDiff) - 1) * 100) * 100) / 100;
    }
  }

  // --- Total Return % ---
  const totalReturnPct =
    netInvested > 0
      ? Math.round(
          (((snapshots.length > 0
            ? snapshots[snapshots.length - 1].totalValue
            : netInvested) -
            netInvested) /
            netInvested) *
            10000,
        ) / 100
      : 0;

  // --- Average Holding Period ---
  let avgHoldingPeriod = 0;
  const holdingPeriods: number[] = [];
  // Group buys and sells per ticker to estimate avg hold period
  const txByTicker: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!txByTicker[tx.ticker]) txByTicker[tx.ticker] = [];
    txByTicker[tx.ticker].push(tx);
  }
  for (const ticker in txByTicker) {
    const txs = txByTicker[ticker].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const buyDates: string[] = [];
    for (const tx of txs) {
      if (tx.type === "BUY") {
        buyDates.push(tx.date);
      } else if (tx.type === "SELL" && buyDates.length > 0) {
        const buyDate = buyDates.shift()!;
        const days =
          (new Date(tx.date).getTime() - new Date(buyDate).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days > 0) holdingPeriods.push(days);
      }
    }
    // For still-open positions, use first buy to today
    if (buyDates.length > 0) {
      const holding = holdings.find((h) => h.ticker === ticker && h.totalShares > 0);
      if (holding) {
        const days =
          (Date.now() - new Date(buyDates[0]).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days > 0) holdingPeriods.push(days);
      }
    }
  }
  if (holdingPeriods.length > 0) {
    avgHoldingPeriod = Math.round(
      holdingPeriods.reduce((s, d) => s + d, 0) / holdingPeriods.length,
    );
  }

  // --- Beta (vs IHSG) ---
  let beta: number | null = null;
  if (ihsgCloses && ihsgCloses.length >= dailyReturns.length && dailyReturns.length >= 10) {
    const ihsgReturns: number[] = [];
    for (let i = 1; i < ihsgCloses.length; i++) {
      const prev = ihsgCloses[i - 1];
      const curr = ihsgCloses[i];
      if (prev > 0) {
        ihsgReturns.push((curr - prev) / prev);
      }
    }
    const n = Math.min(dailyReturns.length, ihsgReturns.length);
    if (n >= 10) {
      const portSlice = dailyReturns.slice(-n);
      const ihsgSlice = ihsgReturns.slice(-n);
      const avgPort = portSlice.reduce((s, r) => s + r, 0) / n;
      const avgIhsg = ihsgSlice.reduce((s, r) => s + r, 0) / n;
      let covariance = 0;
      let ihsgVariance = 0;
      for (let i = 0; i < n; i++) {
        const dp = portSlice[i] - avgPort;
        const di = ihsgSlice[i] - avgIhsg;
        covariance += dp * di;
        ihsgVariance += di * di;
      }
      if (ihsgVariance > 0) {
        beta = Math.round((covariance / ihsgVariance) * 100) / 100;
      }
    }
  }

  return {
    sharpeRatio,
    maxDrawdown,
    annualizedReturn,
    avgHoldingPeriod,
    totalReturnPct,
    volatility,
    beta,
    winRate: summary.winRate,
    bestTrade: summary.bestTrade,
    worstTrade: summary.worstTrade,
  };
}

/**
 * Hitung alokasi sektor dengan info overweight/underweight vs IHSG.
 */
export function calculateSectorAllocation(
  holdings: Holding[],
  sectorMap: Record<string, string>,
  ihsgSectorWeights?: Record<string, number>,
): SectorAllocation[] {
  const activeHoldings = holdings.filter((h) => h.totalShares > 0 && (h.currentValue ?? 0) > 0);
  const totalValue = activeHoldings.reduce((s, h) => s + (h.currentValue ?? 0), 0);
  if (totalValue === 0) return [];

  const bySector: Record<string, number> = {};
  for (const h of activeHoldings) {
    const sector = sectorMap[h.ticker] ?? "Lainnya";
    bySector[sector] = (bySector[sector] ?? 0) + (h.currentValue ?? 0);
  }

  return Object.entries(bySector)
    .map(([sector, value]) => {
      const pct = Math.round((value / totalValue) * 10000) / 100;
      const ihsgWeight = ihsgSectorWeights?.[sector];
      const diff = ihsgWeight !== undefined ? Math.round((pct - ihsgWeight) * 100) / 100 : undefined;
      return { sector, value: Math.round(value), pct, ihsgWeight, diff };
    })
    .sort((a, b) => b.value - a.value);
}
