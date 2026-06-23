# BMAD Roadmap — Saham Analyzer IDX v2.0
## Daily-Use Stock Signal Platform — Phase Tracker

**Start:** 2026-06-22
**Target:** Production-ready for daily-use
**Method:** BMAD 7-phase (Brainstorm → Plan → Architect → Develop → Review → Test → Deliver)
**Owner:** Irvan (Daniswara Group)

---

## 📊 Phase Status Overview

| Phase | Status | Description |
|-------|--------|-------------|
| F0 | ✅ DONE | Brainstorm + PRD (grill-me-doc complete) |
| F1 | ⬜ TODO | Real-time IDX scraper + data layer |
| F2 | ⬜ TODO | ML/DL signal engine (XGBoost + LSTM/Transformer + SHAP) |
| F3 | ⬜ TODO | Multi-horizon signal UI + broker summary dashboard |
| F4 | ⬜ TODO | Bandarmologi dashboard + auto chart pattern |
| F5 | ⬜ TODO | Telegram bot (signal alerts + portfolio quick check) |
| F6 | ⬜ TODO | Test coverage expansion + audit + polish |
| F7 | ⬜ TODO | Production deploy + monitoring |
| **V2.1** | **✅ DONE** | **UX/UI overhaul — multi-horizon, top picks, freshness pill, preset watchlists** |

**Status legend:** ⬜ TODO | 🟨 IN PROGRESS | ✅ DONE | ❌ BLOCKED

---

## F0 — Brainstorm + PRD ✅ DONE (2026-06-22)

**Deliverables:**
- [x] PRD.md dengan 4 grill-me-doc answers inlined
- [x] Current state audit (Streamlit + Next.js, gap teridentifikasi)
- [x] Target state (ML+DL+SHAP, IDX scraper, Telegram)
- [x] Quality bar definition ("siap dijual")

**Decisions captured:**
- Q1: Polish + tutup gap fitur IDX
- Q2: yfinance + scraping IDX official
- Q3: ML + DL + SHAP (XGBoost + LSTM/Transformer)
- Q4: Web PWA + Telegram bot

**Output:** D:\saham-claude\PRD.md

---

## F1 — Real-time IDX Data Layer (Est: 3-4 hari)

**Goal:** Real-time price + broker summary dari IDX official, fallback yfinance.

**Tasks:**
- [ ] F1.1 — Research IDX website structure (rt/idx.co.id, idx.co.id)
- [ ] F1.2 — Build `idx_scraper.py` module (top 100 IDX stocks)
  - Real-time price (delayed 10-15 min acceptable)
  - Volume + value + frequency
  - Foreign flow (net buy/sell)
- [ ] F1.3 — Build `broker_scraper.py` module
  - Top 5 buyer broker
  - Top 5 seller broker
  - Net accumulation per broker
- [ ] F1.4 — Rate limiter + retry + cache (Redis-like JSON file)
- [ ] F1.5 — Integrate ke existing `data_fetcher.py` (yfinance primary, IDX fallback)
- [ ] F1.6 — Frontend `lib/idx.ts` wrapper + `useRealtimePrice` hook
- [ ] F1.7 — Page indicator "data freshness" (timestamp di UI)
- [ ] F1.8 — Tests: scraper mock, rate limit, fallback path

**Done Criteria:**
- Scraper jalan tanpa error untuk 10 IDX stocks sample
- Cache TTL working, fallback ke yfinance kalau scraper fail
- UI tampil "Last update: X min ago" indicator
- Test pass 100%

**Risks:** IDX Cloudflare block → mitigasi: rotating user-agent + retry + delay

---

## F2 — ML/DL Signal Engine (Est: 5-6 hari)

**Goal:** Rule-based + XGBoost + LSTM/Transformer + SHAP. Multi-horizon output.

**Tasks:**
- [ ] F2.1 — Build training dataset
  - 5 tahun IDX history (yfinance 2019-2024)
  - Features: 30+ technical + fundamental + behavioral + sentiment
  - Labels: forward return 1d/5d/20d (binary: up/down + magnitude)
- [ ] F2.2 — XGBoost trainer (`ml/xgboost_trainer.py`)
  - Walk-forward validation
  - Hyperparameter search (Optuna)
  - Save model + metadata (version, features, accuracy)
- [ ] F2.3 — LSTM trainer (`ml/lstm_trainer.py`)
  - 60-day sequence input
  - Multi-horizon output (3 heads: 1d/5d/20d)
  - PyTorch, save as ONNX
- [ ] F2.4 — Transformer trainer (`ml/transformer_trainer.py`)
  - Multi-horizon attention
  - Same architecture as LSTM but attention-based
- [ ] F2.5 — Meta-learner (`ml/meta_learner.py`)
  - Combine 3 model outputs
  - Learn optimal weights dari backtest performance
- [ ] F2.6 — SHAP explainer (`ml/shap_explainer.py`)
  - SHAP values untuk XGBoost
  - Integrated gradients untuk LSTM/Transformer
  - Output: top-5 features + narasi Indonesia
- [ ] F2.7 — Inference pipeline (`ml/predict.py`)
  - Load model, predict, return SHAP
  - Cache prediction 5 min
- [ ] F2.8 — Integration dengan existing recommender
  - `modules/recommender.py` upgraded: rule_score + ml_score + dl_score → final
  - Backward compat: kalau ML model belum ready → rule-based only
- [ ] F2.9 — Tests
  - Model accuracy on holdout (target >65% directional 5d)
  - SHAP output sanity check
  - Inference latency <500ms

**Done Criteria:**
- XGBoost trained, val accuracy >65% directional
- LSTM trained, val accuracy >62% directional
- Transformer trained, val accuracy >63% directional
- SHAP explainer returns valid feature importance
- Inference <500ms per ticker
- Recommender returns combined signal + SHAP reasoning

**Risks:** Overfit → walk-forward validation. Slow inference → ONNX + cache.

---

## F3 — Multi-Horizon Signal UI + Broker Summary (Est: 3 hari)

**Goal:** UI show 1d/5d/20d signal terpisah + SHAP visualization + broker summary.

**Tasks:**
- [ ] F3.1 — Update `RecommendationHero` component
  - 3 horizon cards (1d/5d/20d) dengan signal + confidence + target
  - Expandable: detail + SHAP waterfall
- [ ] F3.2 — New `SHAPChart` component
  - Waterfall bar chart (recharts or lightweight-charts)
  - Top-5 features label Indonesia
- [ ] F3.3 — New `BrokerSummary` component
  - Top 5 buyer broker (table)
  - Top 5 seller broker (table)
  - Net accumulation badge
- [ ] F3.4 — New `ForeignFlow` component (upgrade existing)
  - Net buy/sell IDR
  - 5-day trend mini-chart
  - Vs IHSG benchmark
- [ ] F3.5 — Update API routes
  - `/api/analysis/[ticker]` return multi-horizon + SHAP
  - `/api/broker/[ticker]` new
  - `/api/foreign-flow/[ticker]` enhanced
- [ ] F3.6 — Update stock detail page
  - Insert new components
  - Loading skeleton
- [ ] F3.7 — Tests
  - Component render with mock data
  - API contract test

**Done Criteria:**
- Stock detail page show 3 horizon + SHAP chart + broker summary
- Lighthouse score >85
- Mobile 375px responsive

---

## F4 — Bandarmologi Dashboard + Auto Chart Pattern (Est: 3 hari)

**Goal:** Dashboard khusus bandarmologi (smart money tracking) + auto-detect chart pattern.

**Tasks:**
- [ ] F4.1 — Build `pages/bandarmologi.tsx`
  - Top accumulation stocks (broker X net buy > threshold)
  - Top distribution stocks
  - Foreign flow heatmap
  - Last 7d smart money movement
- [ ] F4.2 — Build chart pattern detector (`lib/chart-patterns.ts`)
  - Head & Shoulders
  - Double Top / Double Bottom
  - Triangle (ascending/descending)
  - Cup & Handle
  - Flag / Pennant
- [ ] F4.3 — Build `PatternBadge` component
  - Show detected patterns di stock card + detail page
  - Confidence score
- [ ] F4.4 — Build screener filter "with pattern"
  - Filter by pattern type + confidence
- [ ] F4.5 — Tests
  - Pattern detection on synthetic data
  - Dashboard render

**Done Criteria:**
- Bandarmologi page accessible, shows top 10 accumulation
- Chart pattern detector >70% accuracy on test cases
- Pattern badge appear di stock list

---

## F5 — Telegram Bot (Est: 2-3 hari)

**Goal:** Bot Telegram untuk signal alerts + portfolio quick check.

**Tasks:**
- [ ] F5.1 — Decide host: Vercel serverless function + polling, atau VPS webhook
  - Recommendation: VPS webhook lebih reliable untuk alert (no cold start)
- [ ] F5.2 — Build `telegram_bot/` (Python, python-telegram-bot)
  - `/start` — register user_id
  - `/signal <ticker>` — quick signal check
  - `/portfolio` — summary P&L
  - `/watchlist` — current watchlist
  - `/alert add <ticker> <price>` — price alert
- [ ] F5.3 — Scheduled alerts (`telegram_bot/alerts.py`)
  - Check watchlist every 5 min during market hours
  - Notify on signal change (BUY → SELL) or price target hit
- [ ] F5.4 — Deploy to NAS (192.168.18.21) atau Vercel cron
- [ ] F5.5 — Tests
  - Command parsing
  - Mock Telegram API

**Done Criteria:**
- Bot respond <3s
- Signal alert delivered ke owner dalam 5 min dari perubahan
- Bot stays up >99% during market hours

---

## F6 — Test Coverage + Audit + Polish (Est: 3-4 hari)

**Goal:** Production-ready quality bar — zero known issue.

**Tasks:**
- [ ] F6.1 — Backend test expansion
  - `tests/test_ml.py` — model accuracy tests
  - `tests/test_scraper.py` — IDX scraper mock
  - `tests/test_recommender_v2.py` — combined engine
  - Target: >80% coverage
- [ ] F6.2 — Frontend test expansion
  - `lib/portfolio.test.ts` (exists) — keep
  - `components/*.test.tsx` — key components (RecommendationHero, SHAPChart, BrokerSummary)
  - `app/**/*.test.tsx` — critical pages (stock detail, portfolio)
  - Target: >60% coverage (UI tests traditionally lower)
- [ ] F6.3 — Security audit
  - No secret in code (env vars only)
  - No XSS in user-input (chat, alert message)
  - SQL injection safe (parameterized queries)
  - Rate limit on all API routes
- [ ] F6.4 — Performance audit
  - Lighthouse mobile >85
  - LCP <2.5s on 3G throttle
  - Bundle size <500KB initial
- [ ] F6.5 — Accessibility audit
  - Keyboard navigation works
  - Color contrast WCAG AA
  - ARIA labels on icon-only buttons
- [ ] F6.6 — UX polish
  - All empty states have illustration + CTA
  - All errors have retry button
  - Loading skeletons everywhere
  - Tooltip on jargon terms
- [ ] F6.7 — Documentation
  - README updated (add new features)
  - API.md updated
  - DEPLOYMENT.md updated
  - DECISIONS.md (ADR for ML choice, scraper choice, etc.)

**Done Criteria:**
- All tests pass (>80% backend, >60% frontend)
- Lighthouse mobile >85
- Zero TypeScript error
- Zero critical bug
- Owner daily-use test 1 minggu pass

---

## F7 — Production Deploy + Monitoring (Est: 1-2 hari)

**Goal:** Deploy ke production + monitoring live.

**Tasks:**
- [ ] F7.1 — Vercel deploy (Next.js frontend)
- [ ] F7.2 — Backend deploy decision
  - Option A: Vercel serverless (easy, cold start)
  - Option B: Railway / Render (always-on, recommended for ML)
  - Recommendation: Railway $5/mo
- [ ] F7.3 — Telegram bot deploy to NAS (existing infrastructure)
- [ ] F7.4 — Cron jobs
  - IDX scraper every 5 min during market hours (09:00-16:00 WIB)
  - ML model retrain weekly (Sunday 02:00)
  - Backtest validation daily (after market close)
- [ ] F7.5 — Monitoring
  - Sentry for errors
  - Vercel analytics for performance
  - Custom dashboard for signal accuracy tracking
- [ ] F7.6 — Backup strategy
  - Daily DB backup
  - Model versioning (MLflow or DVC)
- [ ] F7.7 — Owner daily-use trial
  - Owner pakai live 1 minggu
  - Catat issue → fix → ulang

**Done Criteria:**
- Live at production URL
- Monitoring aktif
- Zero downtime 1 minggu
- Owner satisfied dengan daily-use experience

---

## 📅 Daily Checklist Template

```
Tanggal: ___________
Phase saat ini: F__
Tasks hari ini:
[ ]
[ ]
[ ]

Done kemarin:
[ ]
[ ]

Blocker:
[ ]

Notes / decisions:
[ ]
```

---

## 🚀 Sprint Pattern

**Monday:** Plan phase task list, cek dependencies
**Tue-Thu:** Deep work (delegate swarm kalau parallel possible)
**Friday:** Test + audit + fix
**Saturday:** Deploy + monitor + retro

---

## 🎯 Quick Wins (mulai hari ini)

Sebelum F1-F7 parallel kick off, kerjakan quick wins ini dulu (1-2 hari):

1. **Add data freshness indicator** ke stock detail page (existing data timestamp)
2. **Increase test coverage** portfolio.test.ts yang udah ada
3. **Update README** dengan v2.0 roadmap link
4. **Add "Saham Hangat" widget** di homepage — top 5 sinyal BUY confidence tertinggi hari ini (pake data existing, no new model)

---

## 📋 Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-06-22 | Polish + tutup gap fitur IDX (Q1) | Owner pilih opsi B, balance antara existing polish + new IDX-specific |
| 2026-06-22 | yfinance + IDX scraping (Q2) | Real-time needed, gratis, no API key |
| 2026-06-22 | ML + DL + SHAP (Q3) | Owner mau AI learning proper, signal adaptif |
| 2026-06-22 | Web PWA + Telegram (Q4) | Owner mobile-first, Telegram untuk alert real-time |
| 2026-06-22 | Backend host: Railway (planned F7) | Always-on ML inference, $5/mo acceptable |
| 2026-06-22 | ML stack: PyTorch + XGBoost + SHAP | Mature, well-documented, fast inference |

---

## V2.1 — UX/UI Overhaul ✅ DONE (2026-06-23)

**Goal:** Improve user experience flow + redesign UI tanpa menunggu backend F1-F7 selesai. Mock data acceptable untuk multi-horizon (PRD F2 backlog).

**Deliverables:**
- [x] **Multi-horizon RecommendationHero** — segmented 1d/5d/20d selector + 3-up glance comparison
- [x] **Top Sinyal Hari Ini** section on homepage — top 5 high-confidence signals (mock-derived from market data)
- [x] **Data Freshness Pill** — global timestamp indicator, stale/offline states
- [x] **Smart Empty Home** — preset watchlists IDX30/LQ45 one-tap add untuk first-time users
- [x] **v2.1 utility classes** — `.ticker-pill`, `.horizon-selector`, `.horizon-row`, `.freshness-pill`, `.stock-tabs`, `.top-pick`, `.pulse-strip`, `.preset-card`
- [x] Quality gates — `tsc --noEmit` 0 errors, `next lint` 0 warnings, vitest 24/24 pass

**New components:**
- [components/data-freshness-pill.tsx](file:///d:/saham-claude/web/components/data-freshness-pill.tsx) — global data timestamp
- [components/horizon-selector.tsx](file:///d:/saham-claude/web/components/horizon-selector.tsx) — segmented 1d/5d/20d switcher
- [components/top-picks-section.tsx](file:///d:/saham-claude/web/components/top-picks-section.tsx) — top signal cards

**New API:**
- [app/api/market/top-picks/route.ts](file:///d:/saham-claude/web/app/api/market/top-picks/route.ts) — top 5 signals with mock confidence derived from changePct + volume spike

**Decisions captured (V2.1):**
- 2026-06-23 | Multi-horizon dengan mock data | Owner pilih opsi A (mock derivation dari single rec.horizon)
- 2026-06-23 | Full tabbed refactor (N/A) | Mobile sudah punya tab, refactor deemed too risky → light refactor
- 2026-06-23 | Balanced glass + gradients | Subtle glass utilities added, rec tints kept as-is

**Next iteration (V2.2 candidates):**
- Replace mock multi-horizon dengan actual backend F2 output
- Quick action sheet (bottom modal) untuk add to watchlist/portfolio
- Real-time price ticker animation (price-flash keyframe sudah ready, tinggal wire)
- Compact-mode presets integration

---

## 🔗 Related Artifacts

- PRD: D:\saham-claude\PRD.md
- README: D:\saham-claude\README.md
- Deployment: D:\saham-claude\DEPLOYMENT.md

---