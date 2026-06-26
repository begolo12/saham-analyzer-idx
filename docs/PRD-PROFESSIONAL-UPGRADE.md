# PRD: SahamIDX Professional Upgrade

## 1. Brainstorm — Analisis Current State

### Stack
- **Frontend**: Next.js 14 + React 18 + Tailwind 3 + TypeScript + framer-motion + lightweight-charts
- **Backend**: Python (Streamlit legacy) + yfinance + Next.js API routes
- **Deploy**: Vercel (frontend) + local (backend)
- **DB**: None (localStorage only)

### Fitur Existing (cukup lengkap)
- Home: greeting, market pulse, quick actions, top picks, daily briefing, sector heatmap, foreign flow
- Stock Detail: technical indicators, recommendation, fundamental data
- Screener: scan peluang teknikal
- Portfolio: track investasi + chart + cash ledger
- Watchlist: preset IDX30/LQ45 + custom
- Compare: bandingkan 2-3 saham
- Backtest: uji strategi historis
- AI Chatbot + Command Palette
- Onboarding Tour
- Bottom Nav (mobile) + Top Header (desktop)
- PWA basics (manifest, sw.js)
- i18n (ID/EN)

### Problem Areas (UX Audit)
1. **Animasi kaku** — framer-motion dipasang tapi minim micro-interactions
2. **Empty states generic** — belum ada personality, CTA lemah
3. **Loading states** — skeleton ada tapi basic, shimmer belum halus
4. **Page transitions** — hard cut antar halaman, no shared layout animation
5. **Gesture support** — swipe, pull-to-refresh belum ada
6. **Haptic feedback** — belum ada sama sekali
7. **Dark mode** — token udah ada tapi beberapa komponen belum perfect
8. **Typography** — scale belum konsisten, beberapa text terlalu kecil di mobile
9. **Spacing** — beberapa area terlalu rapat di mobile
10. **Card design** — flat, kurang depth hierarchy
11. **Bottom nav** — functional tapi kurang polished
12. **Stock detail** — terlalu panjang, informasi overwhelm
13. **Performance** — belum lazy loading, LCP > 3s
14. **PWA** — basic, belum proper offline + install prompt
15. **Auth** — belum ada

---

## 2. PRD — Product Requirements

### [Q1: Scope] A: Full profesional (UX + power features + backend API proper + auth + PWA + monetization-ready)

### Target
- **Primary**: Retail investor Indonesia (mobile-first)
- **Secondary**: Desktop power users
- **Quality bar**: "siap dijual" — zero known issues, prod-ready

### Success Metrics
- Lighthouse mobile > 90
- LCP < 2.5s
- First Input Delay < 100ms
- CLS < 0.1
- Zero critical UX bugs

---

## 3. Upgrade Phases

### Phase 1: UX Core (Priority #1)
**Goal**: Animasi halus, micro-interactions, haptic, gesture, empty states

| Task | Detail |
|------|--------|
| Micro-interactions | Button press scale(0.97), card hover lift, list item tap ripple |
| Page transitions | Shared layout + fade/slide dengan framer-motion AnimatePresence |
| Empty states | Unique per page (watchlist, portfolio, screener) dengan illustration + CTA |
| Loading skeletons | Shimmer effect halus, per-component (stock row, card, chart) |
| Gesture: pull-to-refresh | Mobile home + screener pull-to-refresh |
| Gesture: swipe actions | Watchlist swipe-to-delete, portfolio swipe-to-edit |
| Haptic feedback | navigator.vibrate() on key actions (add watchlist, buy signal tap) |
| Scroll animations | Stagger reveal on list items, fade-in on section enter |

### Phase 2: UI Polish
**Goal**: Dark mode perfect, typography, spacing, card redesign

| Task | Detail |
|------|--------|
| Dark mode audit | Fix all hardcoded colors, ensure every component respects dark tokens |
| Typography scale | H1-H6 + body + caption yang konsisten, mobile minimum 14px |
| Spacing audit | 8px grid, mobile padding minimum 16px, touch target 44px |
| Card redesign | Layered depth: subtle shadow hierarchy, proper hover/focus states |
| Status chips | Semantic colors (bull/bear/neutral) dengan dot indicator |
| Bottom nav polish | Active indicator animation, safe area, frosted glass |
| Color palette | Ensure WCAG AA contrast ratios |

### Phase 3: Performance
**Goal**: LCP < 2.5s, bundle < 200KB gzipped

| Task | Detail |
|------|--------|
| Code splitting | Dynamic import per page (screener, portfolio, backtest) |
| Image optimization | next/image for all images, WebP priority |
| Lazy loading | Charts, heavy components lazy load on viewport |
| Bundle analysis | @next/bundle-analyzer, remove unused deps |
| API caching | SWR/React Query for data fetching + stale-while-revalidate |
| Prefetch | Link prefetch on hover/touch-start |

### Phase 4: PWA Pro
**Goal**: Installable, offline-capable, push notification prep

| Task | Detail |
|------|--------|
| Service worker | Workbox-based, cache strategies per route |
| Offline mode | Cache last viewed stocks, watchlist, portfolio |
| Install prompt | Custom install banner (not default browser) |
| App shortcuts | Quick actions on long-press icon |
| Push prep | VAPID key setup, notification permission flow UI |

### Phase 5: Auth + Backend
**Goal**: User accounts, data persistence, API proper

| Task | Detail |
|------|--------|
| Auth system | NextAuth.js (Google + email magic link) |
| API routes | Proper REST API dengan rate limiting |
| Data persistence | PostgreSQL (Neon) untuk user data, watchlist, portfolio |
| Real-time | WebSocket untuk price updates (replace polling) |

---

## 4. Execution Strategy

Pakai **parallel sub-agents** untuk setiap workstream. File ownership disjoint.

| Agent | Scope | Files |
|-------|-------|-------|
| UX Core | Animasi, gestures, haptic, empty states | web/components/*, web/app/page.tsx |
| UI Polish | Dark mode, typography, spacing, cards | web/app/globals.css, web/components/ui/* |
| Performance | Bundle, lazy load, caching | web/app/layout.tsx, web/next.config.js, web/lib/* |
| PWA | SW, offline, install | web/public/sw.js, web/app/layout.tsx, web/components/* |

---

## 5. Quality Gate

- [ ] `npm run build` — zero errors
- [ ] `npm run type-check` — zero errors
- [ ] `npm test` — all pass
- [ ] Lighthouse mobile > 90
- [ ] Manual test: semua page di 375px viewport
- [ ] Dark mode: semua page perfect
- [ ] Gesture: pull-to-refresh + swipe working
- [ ] Animasi: smooth 60fps
