# SahamIDX — Improvement Tracker
> Generated: 2026-06-24 | Audit: 4 parallel agents + LEAD backup read
> Baseline: tsc CLEAN | 24/24 tests PASS | build PASS

---

## Status Legend
- 🔴 = Belum dikerjakan
- 🟡 = In progress
- 🟢 = Selesai
- ⏭️ = Dilewati (dengan alasan)

---

## WAVE 1 — Security + Crashes (Quick Wins)

| # | ID | Severity | Issue | File(s) | Status | Notes |
|---|-----|----------|-------|---------|--------|-------|
| 1 | H1 | 🔴 HIGH | `validateTicker()` no regex — accepts arbitrary input | `lib/yahoo.ts:51` | 🔴 | Add `/^[A-Z0-9^]{1,10}$/` check |
| 2 | H2 | 🔴 HIGH | `stock/[ticker]/route.ts` bypasses validateTicker entirely | `api/stock/[ticker]/route.ts:16` | 🔴 | Call validateTicker() |
| 3 | H8 | 🔴 HIGH | Typo bug `"lots_lots"` should be `"lots"` | `modules/utils.py:66` | 🟢 2026-06-26 | One-line fix |
| 4 | H9 | 🔴 HIGH | `fmt_ts()` receives ISO string, expects Unix timestamp → crash | `modules/telegram_bot.py:286` | 🟢 2026-06-26 | Fix type conversion |
| 5 | H10 | 🔴 HIGH | Lexicon load no file-existence guard → FileNotFoundError | `modules/sentiment.py:97` | 🟢 2026-06-26 | Add `os.path.exists()` check |
| 6 | H11 | 🔴 HIGH | Global `warnings.filterwarnings("ignore")` masks real issues | `modules/data_fetcher.py:16` | 🟢 2026-06-26 | Scoped to specific categories |

---

## WAVE 2 — Reliability

| # | ID | Severity | Issue | File(s) | Status | Notes |
|---|-----|----------|-------|---------|--------|-------|
| 7 | H4 | 🔴 HIGH | No retry logic on any Python network call | All modules | 🟢 2026-06-26 | Added retry decorator in utils.py |
| 8 | H5 | 🔴 HIGH | All Python exceptions silently swallowed | `data_fetcher.py:124,141,152` `idx_realtime.py:168,189` | 🟢 2026-06-26 | Added logging, don't swallow |
| 9 | H6 | ⏭️ HIGH | Zero rate limiting on all 16 API routes | All `api/*/route.ts` | ⏭️ | Dilewati (permintaan user) |
| 10 | M2 | 🟢 MED | 7 type bugs revealed by removing `any` | `stock/[ticker]/page.tsx:360,370-385` | 🟢 2026-06-29 | Diperbaiki tipe meta di AnalysisData |
| 11 | M3 | 🟢 MED | No AbortController in data fetches | `page.tsx:88` `portfolio/page.tsx:145` | 🟢 2026-06-29 | Menambahkan AbortController ke client fetch |
| 12 | M4 | 🟢 MED | Missing timeouts on Yahoo fetches | `compare/route.ts` `screener/fundamental/route.ts` | 🟢 2026-06-29 | Menambahkan timeout 8s & AbortController |
| 13 | M5 | 🔴 MED | Unbounded in-memory caches — memory leak | `screener/route.ts:30` `screener/fundamental/route.ts:13` | 🟢 2026-06-26 | Added max-size eviction |
| 14 | M9 | 🔴 MED | IndexError if DataFrame < 20 rows | `modules/behavioral.py:142` | 🔴 | Add length guard |
| 15 | M12 | 🔴 MED | `top-picks` returns HTTP 200 on error | `api/market/top-picks/route.ts:107` | 🔴 | Return 500 or document intentional |

---

## WAVE 3 — Code Quality + Architecture

| # | ID | Severity | Issue | File(s) | Status | Notes |
|---|-----|----------|-------|---------|--------|-------|
| 16 | H3 | 🔴 HIGH | Zero server components (50/50 "use client") | All .tsx | 🔴 | Convert static components |
| 17 | H7 | 🔴 HIGH | Portfolio page = 1,489 lines god component | `portfolio/page.tsx` | 🔴 | Split into 5+ sub-components |
| 18 | M1 | 🔴 MED | Duplicate fetch logic in home page | `page.tsx:88-124 vs 141-181` | 🔴 | Extract shared function |
| 19 | M6 | 🔴 MED | 11 useState in portfolio — no useReducer | `portfolio/page.tsx` | 🔴 | Consolidate state |
| 20 | M7 | 🟢 MED | 9x `confirm()` — inconsistent with iOS UI | `portfolio/page.tsx` | 🟢 2026-06-29 | Diganti ke ConfirmDialog di alerts & comparison |
| 21 | M8 | 🔴 MED | 9x `eslint-disable` exhaustivedeps | Multiple pages | 🔴 | Fix closure bugs properly |
| 22 | M13 | 🟢 MED | Magic signal thresholds duplicated | `lib/analysis-engine.ts:208,242` | 🟢 2026-06-26 | Extracted to scoreToSignal/scoreToBias helpers |
| 23 | M14 | 🟢 MED | Shadowed `window` variable | `lib/analysis-engine.ts:303` | 🟢 2026-06-26 | Renamed to `lookbackWindow` |
| 24 | M15 | 🟢 MED | Cache typed as `Map<string, { data: any }>` | `api/screener/route.ts` | 🟢 2026-06-29 | Menggunakan generic type pada cache |
| 25 | L9 | 🔴 LOW | 27 empty catch blocks | Multiple lib files | 🔴 | Add console.warn minimum |
| 26 | L10 | 🔴 LOW | 30+ direct localStorage calls | Multiple files | 🔴 | Centralize storage abstraction |

---

## WAVE 4 — DevOps + Testing

| # | ID | Severity | Issue | File(s) | Status | Notes |
|---|-----|----------|-------|---------|--------|-------|
| 27 | M10 | 🔴 MED | CI uses 3rd-party action without SHA pinning | `.github/workflows/deploy.yml` | 🟢 2026-06-26 | Pinned to commit SHA |
| 28 | M11 | 🟢 MED | 3 React hooks warnings (useMemo deps) | `stock/page.tsx:140` `watchlist/page.tsx:290` | 🟢 2026-06-29 | Diperbaiki dependency list & useMemo |
| 29 | L1 | 🔴 LOW | Only 1 test file (24 tests) | `portfolio.test.ts` only | 🔴 | Add tests for lib/, api/ |
| 30 | L2 | 🟢 MED | No Python CI/testing | `.github/workflows/deploy.yml` | 🟢 2026-06-26 | Added pytest step + pyproject.toml |
| 31 | L3 | 🔴 LOW | requirements.txt no pinned versions | `requirements.txt` | 🔴 | Add lockfile or pin |
| 32 | L4 | 🔴 LOW | Partial token printed to stdout | `telegram_bot_test.py:41` | 🔴 | Remove or redact |
| 33 | L5 | 🟢 LOW | try-catch gap on param parsing | `api/realtime/route.ts:16-37` | 🟢 2026-06-29 | Ditambahkan try-catch di realtime api |
| 34 | L6 | 🔴 LOW | `tickers.join(",")` as useCallback dep | `hooks/use-realtime-price.ts:83` | 🔴 | Use useMemo |
| 35 | L7 | 🔴 LOW | ssl context created per-request | `idx_realtime.py:161` | 🟢 2026-06-26 | Module-level singleton |
| 36 | L8 | 🔴 LOW | `.env.production` not explicitly gitignored | `.gitignore` | 🟢 2026-06-26 | Added pattern |

---

## COMPLETED ✅

| # | ID | Issue | Fixed | Commit |
|---|-----|-------|-------|--------|
| ✅ | H-ua | 5x duplicate UA string → `lib/constants.ts` | 2026-06-24 | — |
| ✅ | L-bt | No input validation on backtest API | 2026-06-24 | — |
| ✅ | M-any | 7x `any` types in AnalysisData interface | 2026-06-24 | — |
| ✅ | S-1 | Sentiment scoring bug: single-word matches never scored | `modules/sentiment.py` | 2026-06-26 | Moved negation/score logic out of else block |
| ✅ | S-2 | Sentiment scoring bug: negative words scored positive | `modules/sentiment.py` | 2026-06-26 | Added sign flip for matched_type "negative" |
| ✅ | S-3 | Root package-lock.json empty file removed | root | 2026-06-26 | Trashed |

---

## ARCHITECTURE NOTES

### Two Disconnected Apps
- **Python Streamlit** (`app.py`) — original app, still functional
- **Next.js 14** (`web/`) — modern frontend, own analysis engine
- Frontend does NOT use Python backend — they're independent

### Key Metrics to Track
```
TypeScript errors:  0 (run: npx tsc --noEmit)
Test count:         24 (run: npx vitest run)
Build status:       PASS (run: npm run build)
Bundle size:        195 KB shared / 274 KB max page
Python test files:  2 (run: pytest)
API routes:         16 (all dynamic, no rate limiting)
Components:         50 (all "use client")
```

### Scan Commands (copy-paste)
```bash
# TypeScript check
cd web && npx tsc --noEmit

# Tests
cd web && npx vitest run

# Build
cd web && npm run build

# Count any types remaining
grep -r ": any" web/lib web/app web/components --include="*.ts" --include="*.tsx" | wc -l

# Count empty catches
grep -r "catch {" web/lib web/app --include="*.ts" --include="*.tsx" | wc -l

# Count "use client"
grep -r '"use client"' web/components web/app --include="*.tsx" | wc -l

# Python tests
cd . && python -m pytest tests/ -v
```

---

## NEXT SESSION QUICK START
1. Baca file ini dulu
2. Cek `Status` column — mulai dari 🔴 teratas
3. Setelah fix, update ke 🟢 + tambah tanggal
4. Run scan commands di atas untuk verify
5. Commit per-wave biar mudah rollback
