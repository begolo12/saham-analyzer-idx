# Graph Report - saham-claude  (2026-06-24)

## Corpus Check
- 163 files · ~133,479 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1501 nodes · 3333 edges · 86 communities (68 shown, 18 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 221 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `354d48ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 130 edges
2. `StockDataFetcher` - 71 edges
3. `TechnicalAnalyzer` - 48 edges
4. `FundamentalAnalyzer` - 47 edges
5. `BehavioralAnalyzer` - 40 edges
6. `Recommender` - 38 edges
7. `formatPercent()` - 34 edges
8. `Card` - 33 edges
9. `formatIDR()` - 28 edges
10. `Action` - 23 edges

## Surprising Connections (you probably didn't know these)
- `str` --uses--> `StockDataFetcher`  [INFERRED]
  app.py → modules/data_fetcher.py
- `str` --uses--> `TechnicalAnalyzer`  [INFERRED]
  app.py → modules/technical.py
- `str` --uses--> `FundamentalAnalyzer`  [INFERRED]
  app.py → modules/fundamental.py
- `str` --uses--> `BehavioralAnalyzer`  [INFERRED]
  app.py → modules/behavioral.py
- `str` --uses--> `IndonesianSentimentAnalyzer`  [INFERRED]
  app.py → modules/sentiment.py

## Communities (86 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (47): DataFrame, BehavioralAnalysis, Enum, FundamentalAnalysis, BehavioralAnalysis, BehavioralSignal, Enum untuk sinyal pola perilaku, Hasil lengkap analisa behavioral (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (36): CompactModeToggle(), MobileActionBar(), MobileActionBarProps, MobileAppBar(), MobileAppBarProps, MobileListItem(), MobileListItemProps, MobileQuickAction() (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (31): POST(), QuickQuote, UseRealtimePriceOptions, UseRealtimePriceReturn, fetchRealtimeQuotes(), getRealtimeQuote(), RealtimeQuote, TV_COLUMNS (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (38): bytes, BrokerSummaryProxy, cache_status(), clear_all_cache(), compute_broker_summary_proxy(), compute_foreign_flow_proxy(), fetch_realtime_quotes(), fetch_yahoo_chart() (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (28): IndicatorResult, indonesian(), Any, DataFrame, float, int, str, Technical Analysis Module Menghitung indikator teknikal standar industri dan men (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (44): float, int, str, add_to_watchlist(), analyze_behavioral_cached(), analyze_fundamental_cached(), analyze_sentiment_cached(), analyze_technical_cached() (+36 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (45): A. Untuk Meningkatkan Akurasi, Apa yang aplikasi ini capai:, 🏗️ Arsitektur, B. Untuk Sumber Data Lebih Lengkap, Backend-Frontend Alignment, Behavioral, C. Untuk Daily Use, Cara 1: Via Vercel Dashboard (Paling Mudah) (+37 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (39): dependencies, clsx, date-fns, framer-motion, lightweight-charts, lucide-react, next, react (+31 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (29): BehavioralPatterns(), BehavioralPatternsProps, signalVariant, BriefingData, BriefingStock, FundamentalRow(), FundamentalScreener(), FundamentalsResult (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (22): HomePage(), MarketStock, MarketTab, CollapsibleSection(), CollapsibleSectionProps, CompactStockRow(), CompactStockRowProps, ErrorBanner() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (20): EmptyState(), EmptyStateProps, ILLUSTRATIONS, PageTransitionProps, StaggerContainer(), StaggerItem(), variants, StockSearch() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (22): BenchmarkChart(), BenchmarkChartProps, CollapsibleCard(), CollapsibleCardProps, IHSGBenchmark(), IHSGBenchmarkProps, IHSGData, MetricCard() (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (25): Connection, alert_checker(), cmd_alerts(), cmd_delalert(), cmd_help(), cmd_portfolio(), cmd_price(), cmd_setalert() (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (17): fetch_multiple_stocks(), Any, DataFrame, float, str, Data Fetcher Module Mengambil data saham real-time dari Yahoo Finance untuk saha, Ambil data historis harga saham.          Args:             period: 1d, 5d, 1mo,, Ambil data intraday untuk analisis behavioral (1-5 hari terakhir) (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (23): AlertsPageContent(), TabType, ALERT_TYPE_OPTIONS, PriceAlertModal(), PriceAlertModalProps, useMemoForSuggestions(), addAlert(), addAlertHistoryEntry() (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (14): FundamentalMetric, float, Jalankan semua analisa fundamental, Ambil nilai dengan aman, return None jika tidak ada, Buat FundamentalMetric dengan formatting, P/E Ratio — Price to Earnings, P/B Ratio — Price to Book Value, P/S Ratio — Price to Sales (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (19): analyze_sentiment(), _generate_sentiment_summary(), indonesian(), IndonesianSentimentAnalyzer, NewsArticle, NewsFetcher, float, int (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (26): analyzeTimeframeSignal(), Bias, bodySize(), ConfluenceResult, DEFAULT_SIGNAL_WEIGHTS, DetectedPattern, detectPatterns(), findPeaks() (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (15): AIChatbot, CommandPalette, metadata, viewport, BottomNav(), tabs, InstallPrompt(), KeyboardShortcuts() (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (17): BehavioralAnalyzer, BehavioralPattern, indonesian(), DataFrame, float, str, Behavioral Patterns Module Mendeteksi "kebiasaan" atau pola perilaku saham:  1., Deteksi akumulasi vs distribusi (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (15): DataFreshnessPill(), DataFreshnessPillProps, timeAgo(), ChartSkeleton(), RecommendationSkeleton(), Skeleton(), StockDetailFullSkeleton(), useTrackRecommendation() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (24): ScoreBar(), ScoreBarProps, signalBadgeVariant, SignalDots(), signalStrength(), TechnicalIndicators(), TechnicalIndicatorsProps, analyzeBollingerBands() (+16 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (24): Tests untuk modules/idx_realtime.py Run: python tests/test_idx_realtime.py  Menc, Test ticker normalization (.JK suffix + uppercase), Test fetch_realtime_quotes with mocked TradingView response, Test with empty input, Test fetch_yahoo_chart with mocked yahoo response, Test foreign flow proxy with synthetic data, Test broker summary proxy, Test RealtimeQuote dataclass (+16 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (19): calculateCalibration(), calculatePerformanceStats(), calculateSignalAccuracy(), calculateSuggestedWeights(), calculateSystemHealth(), detectBias(), OutcomeResult, PerformanceStats (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (19): PortfolioChart(), PortfolioChartProps, PALETTE, processSectors(), SectorDonut(), SectorDonutProps, SectorSlice, useCashLedger() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (11): GET(), getStockByCode(), POPULAR_STOCKS, fetchChart(), fetchHistorical(), fetchSummary(), validateTicker(), YahooChartResponse (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (22): calculate_max_drawdown(), calculate_position_size(), calculate_sharpe_ratio(), detect_market_regime(), format_currency(), format_percentage(), get_idx_holidays(), DataFrame (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (17): calculateCashSummary(), calculateHoldings(), aggregateSnapshots(), computeCurrentSnapshot(), getSnapshots(), recordTodaySnapshot(), saveSnapshots(), a (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (21): FundamentalMetrics(), FundamentalMetricsProps, signalBadgeVariant, analyzeCurrentRatio(), analyzeDER(), analyzeDividendYield(), analyzeFundamental(), analyzeGrowth() (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (14): CommandPalette(), PaletteAction, QUICK_ACTIONS, ROUTE_MAP, SECTORS, useWatchlist(), DisplayRow, SearchPageContent() (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+12 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (18): AIChatbot(), ChatBubble(), ChatMessage, ChatSuggestion, extractMultipleTickers(), extractTicker(), formatIDR(), matchesAny() (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (16): BacktestPage(), StatPill(), POST(), BacktestConfig, BacktestResult, compareWithIHSG(), generateSignals(), IHSGComparison (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (12): WatchlistItem, AlertCard(), DiscoveryCard(), DiscoveryCardProps, Signal, WatchlistCardProps, WatchlistStockData, FilterBar() (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (12): Alert(), AlertProps, Disclaimer(), variantIcons, variantStyles, StockComparison(), SingleSkeletonRow(), StockRowSkeleton() (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (18): BMAD Roadmap — Saham Analyzer IDX v2.0, code:block1 (Tanggal: ___________), 📅 Daily Checklist Template, Daily-Use Stock Signal Platform — Phase Tracker, 📋 Decision Log, F0 — Brainstorm + PRD ✅ DONE (2026-06-22), F1 — Real-time IDX Data Layer (Est: 3-4 hari), F2 — ML/DL Signal Engine (Est: 5-6 hari) (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (18): code:bash (gh repo create saham-analyzer --public --source=. --remote=o), code:bash (git remote add origin https://github.com/USERNAME/saham-anal), code:bash (npm i -g vercel), code:bash (# Install), code:bash (cd web), Custom Domain, 🚀 Deployment Guide, Environment Variables (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (17): 1. Brainstorm — Analisis Current State, 2. PRD — Product Requirements, 3. Upgrade Phases, 4. Execution Strategy, 5. Quality Gate, Fitur Existing (cukup lengkap), Phase 1: UX Core (Priority #1), Phase 2: UI Polish (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (17): 1. Brainstorm Q&A (Grill-me-doc), 2. Current State Audit, 3.1 Signal Engine — Hybrid: Rule + ML + DL + SHAP, 3.2 Data Layer — Real-time IDX, 3.3 Features — Daily-Use Priorities, 3.4 Delivery, 3.5 Quality Bar, 3. Target State (v2.0) (+9 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (11): CATEGORIES, CompareStock, computeOverallWinner(), computeRadarScores(), getWinnerCode(), MetricCategory, MetricRow, METRICS (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (14): NewsListProps, analyzeConfluence(), calculateWeightedScore(), detectSupportResistance(), fetchGoogleNews(), fetchNews(), HEADERS, NewsArticle (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (14): HorizonKey, HorizonSelector(), HorizonSelectorProps, actionClass, actionTint, AnimatedConfidenceBar(), computeHorizonTargets(), deriveHorizons() (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (14): analyzeText(), checkNegation(), INTENSIFIERS, intensifiers, negation, negative, positive, NEGATIONS (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (14): background_color, categories, description, dir, display, icons, lang, name (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (14): ARCHITECTURE NOTES, code:block1 (TypeScript errors:  0 (run: npx tsc --noEmit)), code:bash (# TypeScript check), COMPLETED ✅, Key Metrics to Track, NEXT SESSION QUICK START, SahamIDX — Improvement Tracker, Scan Commands (copy-paste) (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (12): AddTransactionModal(), AddTransactionModalProps, TickerAutocomplete(), TickerAutocompleteProps, PopularStock, normalizeTicker(), addTransaction(), clearAllTransactions() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (13): Quick smoke tests untuk aplikasi. Run: python tests/test_analysis.py, Test sentiment analyzer (lightweight - no internet needed), Test end-to-end recommendation, Test Yahoo Finance fetcher dengan ticker valid, Test technical analysis, Test fundamental analyzer, Test behavioral analyzer, test_behavioral_analyzer() (+5 more)

### Community 47 - "Community 47"
Cohesion: 0.26
Nodes (11): CashModal(), CashModalProps, CashEntry, CashEntryType, CashSummary, generateId(), addCashEntry(), clearAllCashEntries() (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (11): PortfolioStatsCard(), PortfolioStatsCardProps, TONE_STYLES, calculatePortfolioStats(), calculateSummary(), generateId(), Holding, PortfolioStats (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.21
Nodes (12): ALL_STORAGE_KEYS, BackupData, exportAll(), exportToFile(), getBackupStats(), getTotalItemCount(), importAll(), importFromFile() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (11): BehavioralSignal, FundamentalSignal, ACTION_COLOR, calculateConfidence(), calculatePriceTargets(), DEFAULT_WEIGHTS, determineHorizon(), generateRecommendation() (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.47
Nodes (9): addToWatchlistWithPrice(), bumpWatchView(), clearAllWatchlist(), getWatchlist(), getWatchlistItems(), migrate(), setWatchlist(), addToWatchlist() (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (5): cleanupCache(), data, networkFirst(), STATIC_ASSETS, url

### Community 54 - "Community 54"
Cohesion: 0.31
Nodes (8): PriceChart(), PriceChartProps, BehavioralAnalysisResult, FundamentalAnalysisResult, TechnicalAnalysisResult, StockPrice, StockSummary, AnalysisData

### Community 55 - "Community 55"
Cohesion: 0.39
Nodes (8): analyzeBehavioral(), analyzeMomentum(), analyzePriceAction(), analyzeTradingRange(), analyzeVolatility(), analyzeVolumeBehavior(), BEHAVIORAL_SCORE, findSupportResistance()

### Community 56 - "Community 56"
Cohesion: 0.28
Nodes (7): cache, FundamentalsResult, GET(), getCached(), PresetFilters, PRESETS, setCache()

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (6): LanguageSwitcher(), Lang, SUPPORTED_LANGS, translations, useLanguage(), useTranslations()

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (6): getSystemTheme(), resolve(), Theme, ThemeContext, ThemeContextValue, ThemeProvider()

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (4): indonesian(), Any, str, Generate summary naratif

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (7): buildCommand, devCommand, framework, headers, installCommand, regions, version

### Community 61 - "Community 61"
Cohesion: 0.48
Nodes (6): calcMACDSignal(), calcPerformance(), calcRSI(), calcTrend(), CompareStock, GET()

### Community 62 - "Community 62"
Cohesion: 0.38
Nodes (5): GET(), ForeignFlowData, ForeignFlowStock, getForeignFlowProxy(), POPULAR_TICKERS

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (5): ACTION_SHORT, TopPick, TopPicksSection(), TopPicksSectionProps, Action

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (5): Tabs, TabsContent, TabsContext, TabsList, TabsTrigger

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (4): intensifiers, negation, negative, positive

## Knowledge Gaps
- **388 isolated node(s):** `rootDirectory`, `positive`, `negative`, `intensifiers`, `negation` (+383 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 1` to `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 18`, `Community 20`, `Community 21`, `Community 24`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 39`, `Community 41`, `Community 45`, `Community 47`, `Community 48`, `Community 52`, `Community 57`, `Community 63`, `Community 64`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `StockDataFetcher` connect `Community 0` to `Community 68`, `Community 5`, `Community 4`, `Community 12`, `Community 13`, `Community 46`, `Community 15`, `Community 19`, `Community 59`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `FundamentalAnalyzer` connect `Community 0` to `Community 5`, `Community 12`, `Community 46`, `Community 15`, `Community 59`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 44 inferred relationships involving `StockDataFetcher` (e.g. with `str` and `DataFrame`) actually correct?**
  _`StockDataFetcher` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `TechnicalAnalyzer` (e.g. with `str` and `DataFrame`) actually correct?**
  _`TechnicalAnalyzer` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `FundamentalAnalyzer` (e.g. with `str` and `DataFrame`) actually correct?**
  _`FundamentalAnalyzer` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `BehavioralAnalyzer` (e.g. with `str` and `DataFrame`) actually correct?**
  _`BehavioralAnalyzer` has 22 INFERRED edges - model-reasoned connections that need verification._