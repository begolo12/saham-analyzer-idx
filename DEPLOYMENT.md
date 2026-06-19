# 🚀 Deployment Guide

## Quick Deploy ke Vercel

### Step 1: Push ke GitHub

**Opsi A: GitHub CLI (Recommended)**
```bash
gh repo create saham-analyzer --public --source=. --remote=origin --push
```

**Opsi B: Manual**
1. Buat repo baru di https://github.com/new (jangan init dengan README/license)
2. Run:
```bash
git remote add origin https://github.com/USERNAME/saham-analyzer.git
git push -u origin main
```

### Step 2: Deploy ke Vercel

**Opsi A: Vercel Dashboard (Paling Mudah)**
1. Buka https://vercel.com/new
2. Import repo `saham-analyzer`
3. Configure:
   - **Project Name**: saham-analyzer (atau nama lain)
   - **Framework Preset**: Next.js (auto-detect)
   - **Root Directory**: `web` ← PENTING!
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
4. Klik **Deploy**
5. Tunggu 2-3 menit, selesai! 🎉

**Opsi B: Vercel CLI**
```bash
npm i -g vercel
cd web
vercel login
vercel --prod
```

**Opsi C: Auto-Deploy via GitHub Actions**

Sudah ada di `.github/workflows/deploy.yml`. Setup:

1. Di Vercel, buat project & dapatkan credentials:
   - Buka https://vercel.com/account/tokens
   - Create Token → copy value
   - Setelah first deploy, lihat `.vercel/project.json` atau Vercel dashboard untuk:
     - `VERCEL_ORG_ID`
     - `VERCEL_PROJECT_ID`

2. Di GitHub repo, Settings → Secrets → Actions:
   - `VERCEL_TOKEN` = token value
   - `VERCEL_ORG_ID` = org id
   - `VERCEL_PROJECT_ID` = project id

3. Push ke `main` branch → auto-deploy!

## Verify Deployment

Setelah deploy, cek:
- `https://your-app.vercel.app` → home page
- `https://your-app.vercel.app/stock/BBCA` → stock detail
- `https://your-app.vercel.app/watchlist` → watchlist
- `https://your-app.vercel.app/api/analysis/BBCA` → API JSON

## Local Development

```bash
# Install
cd web
npm install

# Dev server
npm run dev
# → http://localhost:3000

# Type check
npm run type-check

# Production build
npm run build
npm run start
```

## Environment Variables

Tidak ada env vars yang dibutuhkan! Aplikasi 100% client-side + public Yahoo Finance API.

Optional (untuk production caching):
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` — Vercel KV (Redis)

## Troubleshooting

### "Module not found" errors saat build

Pastikan semua file ada. Run:
```bash
cd web
npm install
npm run type-check
```

### Yahoo Finance rate limit

Yahoo Finance bisa rate-limit jika terlalu banyak request. Solusi:
- Vercel ISR sudah cache default
- Tambah Vercel KV untuk cache yang lebih persistent
- Kurangi jumlah ticker di watchlist

### News sentiment tidak muncul

Google News bisa block request dari cloud IP. Solusi:
- Pakai Vercel Edge Functions (sesuai region: `sin1` untuk Asia Tenggara)
- Atau pakai news API premium (NewsAPI, GNews)

## Custom Domain

Di Vercel dashboard:
1. Project → Settings → Domains
2. Add domain: `saham.yourdomain.com`
3. Update DNS di domain provider

## Monitoring

- **Logs**: Vercel Dashboard → Project → Logs
- **Analytics**: Vercel Dashboard → Project → Analytics
- **Errors**: Setup Sentry (opsional)
