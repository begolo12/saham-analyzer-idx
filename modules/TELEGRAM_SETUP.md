"""
Telegram bot tokens — keep out of git.
Set via env var or .env file (gitignored).

Telegram bot untuk Saham Analyzer IDX.
BUKAN AirevoBot (Hermes AI gateway) — itu bot terpisah di chat 1567087543.

Saham bot:
  1. Chat @BotFather di Telegram
  2. /newbot → kasih nama (mis. "SahamIDX Bot")
  3. Copy token
  4. Set TELEGRAM_BOT_TOKEN env var
  5. Run: python -m modules.telegram_bot
  6. Verify: python -m modules.telegram_bot_test

Production (Vercel):
  - Webhook via /api/telegram/webhook
  - Set TELEGRAM_BOT_TOKEN + TELEGRAM_WEBHOOK_URL
  - HTTPS required by Telegram
"""
# Add your token here OR set as env var
# TELEGRAM_BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
