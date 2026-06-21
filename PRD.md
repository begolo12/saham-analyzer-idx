# PRD — Saham Analyzer IDX v2.0
## Personal Daily-Use Stock Signal Platform

**Date:** 2026-06-22
**Owner:** Irvan (Daniswara Group)
**Method:** BMAD (Brainstorm → Plan → Architect → Develop → Review → Test → Deliver)

---

## 1. Brainstorm Q&A (Grill-me-doc)

| # | Pertanyaan | Jawaban |
|---|------------|---------|
| Q1 | Scope "fitur lengkap" daily-use? | **B. Polish + tutup gap fitur IDX** (foreign flow live, broker summary, bandarmologi, auto-chart pattern) |
| Q2 | Data source IDX? | **B. yfinance + scraping IDX official (rt/idx.co.id)** untuk harga real-time + broker summary |
| Q3 | AI/ML signal engine? | **D. ML + deep learning (LSTM/Transformer) + multi-horizon (1d/5d/20d) + explainable AI (SHAP)** |
| Q4 | Delivery channel? | **B. Web PWA + Telegram bot** (signal alerts, portfolio summary, quick check via chat) |

---

## 2. Current State Audit

### ✅ Yang sudah jalan (audit 2026-06-22)

**Streamlit Python (app.py 946 LOC):**
- 7 modul analisis: technical, fundamental, behavioral, sentiment, recommender, data_fetcher, utils
- Rule-based ensemble: technical 30% + fundamental 30% + behavioral 25% + sentiment 15%
- Backtest engine (manual, no framework)
- Smoke test 7 modul (1 file test_analysis.py, 214 LOC)

**Next.js 14 (web/):**
- 14 pages: home, search, stock/[ticker], portfolio, screener, backtest, compare, watchlist, share/watchlist, settings, offline
- 47 components: chatbot, alerts, foreign-flow, comparison, screener, daily-briefing, onboarding-tour, command-palette, keyboard-shortcuts, sector-heatmap, dll
- PWA (manifest.json + sw.js)
- i18n (id/en)
- TypeScript strict mode

### ❌ Gap vs requirement (v2.0)

| Gap | Dampak | Prioritas |
|-----|--------|-----------|
| Zero ML/LSTM/Transformer | Signal cuma rule-based, tidak adaptif | 🔴 P0 |
| Zero SHAP explainability | User tidak bisa audit kenapa signal muncul | 🔴 P0 |
| Single-horizon signal | Tidak tahu prediksi 1d vs 5d vs 20d | 🔴 P0 |
| No real-time price (yfinance delay 15-30m) | Trading intraday tidak akurat | 🟠 P1 |
| No broker summary | Tidak ada bandarmologi / foreign flow detail | 🟠 P1 |
| No auto chart pattern detection | Pattern harus manual identify | 🟠 P1 |
| No Telegram bot | Tidak bisa dapat alert di HP tanpa buka web | 🟠 P1 |
| Test coverage tipis (1 file smoke test) | Risiko regresi tinggi | 🟡 P2 |
| No CI/CD (deploy.yml ada tapi belum jalan) | Manual deploy, rentan human error | 🟡 P2 |
| No data freshness indicator | User tidak tahu data jam berapa | 🟡 P2 |

---

## 3. Target State (v2.0)

### 3.1 Signal Engine — Hybrid: Rule + ML + DL + SHAP

**Layer 1: Rule-based ensemble (existing)**
- Technical + Fundamental + Behavioral + Sentiment
- Tetep sebagai base score, transparan, cepat

**Layer 2: ML scoring (XGBoost on IDX historicals)**
- Features: dari semua indikator (RSI, MACD, BB, fundamental ratios, behavioral patterns, sentiment scores)
- Target: return 1d/5d/20d
- Training data: 5 tahun IDX history (2019-2024)
- Walk-forward validation, no look-ahead bias
- Output: probability distribution + expected return

**Layer 3: Deep Learning (LSTM + Transformer)**
- LSTM: sequence model untuk time-series momentum
- Transformer: multi-horizon attention (predict 1d, 5d, 20d simultaneously)
- Input: 60-day price+volume+indicator window
- Output: per-horizon signal + confidence

**Layer 4: SHAP explainability**
- Setiap prediction datang dengan top-5 features yang drive decision
- Visual: SHAP waterfall chart
- Text: narasi bahasa Indonesia "kenapa BUY karena RSI oversold + foreign inflow + broker X akumulasi"

**Architecture:**
```
Data Layer: yfinance + IDX scraper + broker scraper
       ↓
Feature Engineering: technical + fundamental + behavioral + sentiment + broker flow
       ↓
[ Rule-based Ensemble ]  ← existing, baseline
[ XGBoost ML scoring   ]  ← new, P0
[ LSTM/Transformer DL  ]  ← new, P0
       ↓
Meta-learner: weighted average of 3 outputs (weight learned from backtest)
       ↓
SHAP explainer + confidence calibration
       ↓
Action + Horizon + Entry/Target/SL + Reasoning
```

### 3.2 Data Layer — Real-time IDX

| Source | Purpose | Cadence |
|--------|---------|---------|
| yfinance (existing) | OHLCV history, fundamental info | Daily |
| IDX official (rt/idx.co.id) | Real-time price, volume, value | Every 5 min |
| IDX broker summary | Top buyer/seller broker, foreign flow | Every 15 min |
| IDX news | News sentiment input | Every 30 min |
| Self-collected (cache) | Historical broker summary | Append-only |

**Cache strategy:**
- Real-time price: Redis TTL 5 min, fallback to yfinance last close
- Broker summary: Redis TTL 15 min
- Fundamental: yfinance (daily refresh)
- Sentiment/news: Redis TTL 30 min

### 3.3 Features — Daily-Use Priorities

**P0 (must-have, blocking):**
- [x] Portfolio tracking + P&L (existing, polish)
- [x] Watchlist + alerts (existing, polish)
- [x] Backtest engine (existing, polish)
- [x] Screener fundamental (existing, polish)
- [ ] **Multi-horizon signal** (1d/5d/20d separate)
- [ ] **SHAP explanation** di setiap rekomendasi
- [ ] **Real-time price** dari IDX
- [ ] **Broker summary** (top 5 buyer/seller broker)
- [ ] **Bandarmologi dashboard** (foreign flow + broker accumulation)

**P1 (high value):**
- [ ] Auto chart pattern detection (head&shoulders, double bottom, triangle, dll)
- [ ] Telegram bot (signal alerts, portfolio quick check, watchlist update)
- [ ] Signal accuracy dashboard (track semua signal → actual return)

**P2 (nice to have):**
- [ ] Earnings calendar
- [ ] Sector rotation heatmap
- [ ] Insider transaction tracker
- [ ] Dark pool detection (advanced)

### 3.4 Delivery

| Channel | Status | Daily-use |
|---------|--------|-----------|
| Web PWA (existing) | ✅ Production | Install to home screen |
| Telegram bot | 🆕 Build | Real-time alerts |
| Email digest | ❌ Out of scope | - |
| Mobile native | ❌ Out of scope | PWA cukup |

### 3.5 Quality Bar

**"Siap dijual" definition (sesuai user pattern):**
- ✅ Zero critical bug
- ✅ Zero TypeScript error
- ✅ All tests pass (>80% coverage)
- ✅ Signal accuracy dashboard: model backtest vs actual > 65% directional
- ✅ <2s page load (LCP)
- ✅ PWA install works on iOS + Android
- ✅ Telegram bot responds <3s
- ✅ Real-time price update <10s dari IDX
- ✅ Audit pass: no secret in code, no XSS, no SQL injection
- ✅ Daily-use tested oleh owner 1 minggu tanpa issue

---

## 4. Non-Goals (v2.0)

- Multi-broker integration (Stockbit, Tradingview API) — out of scope, pakai scraping
- Real-time tick data (per-second) — overkill untuk daily-use, 5 min cukup
- Social trading / copy-trade — out of scope
- Crypto / forex — IDX saham only
- Mobile native (iOS/Android) — PWA cukup
- Multi-user / multi-tenant — single-user, personal
- Auth (login) — single-user local
- WhatsApp gateway — Telegram cukup
- Email digest — out of scope
- Premium tier / payment — out of scope

---

## 5. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| IDX website block scraping (Cloudflare/CAPTCHA) | High | High | Use yfinance as fallback + polite scraping dengan rate limit |
| ML model overfit ke IDX lama | Medium | High | Walk-forward validation, train di 2019-2023, test di 2024 |
| LSTM lambat di inference | Medium | Medium | Pre-compute batch, cache 5 min, fallback ke XGBoost |
| Telegram bot abuse | Low | Medium | User ID whitelist, rate limit per user |
| Real-time scraper down | Medium | Medium | Fallback ke yfinance last close + indicator "stale data" |
| DL model size besar untuk deploy | Medium | Low | ONNX export, server-side inference only |

---

## 6. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Signal accuracy (directional) | >65% on 5d horizon | Backtest + live tracking |
| Page load LCP | <2.5s on 3G | Lighthouse |
| Real-time price freshness | <10 min from IDX | Timestamp on each quote |
| Test coverage | >80% | pytest + vitest |
| TypeScript errors | 0 | tsc --noEmit |
| Daily active user (owner) | 1 (Irvan) | Manual check |
| Telegram bot response | <3s | Bot metrics |
| Uptime | >99% on Vercel | Vercel analytics |

---

## 7. Stakeholder

- **Owner / User:** Irvan (saham trader IDX, daily-use)
- **AI Agents:** LEAD (PM), backend-dev, frontend-dev, ml-engineer, data-engineer, devops, qa, security
- **Constraints:** mobile-first (375px), Bahasa Indonesia UI, iOS 18 aesthetic, single-user

---