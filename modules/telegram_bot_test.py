"""
Quick connectivity test untuk Telegram bot.
Verifies:
- Env TELEGRAM_BOT_TOKEN present
- Token valid (getMe)
- Bot info printed

Run: python -m modules.telegram_bot_test
"""
import os
import sys

# Load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

if not TOKEN:
    print("❌ TELEGRAM_BOT_TOKEN not set")
    print("\nSetup:")
    print("  1. Chat @BotFather di Telegram")
    print("  2. /newbot, save token")
    print("  3. export TELEGRAM_BOT_TOKEN='123456:ABC...'")
    print("  4. python -m modules.telegram_bot_test")
    sys.exit(1)

print(f"🔑 Token: {TOKEN[:10]}...{TOKEN[-4:]} (len={len(TOKEN)})")

try:
    import requests
    r = requests.get(f"https://api.telegram.org/bot{TOKEN}/getMe", timeout=10)
    data = r.json()
    if data.get("ok"):
        bot = data["result"]
        print(f"✅ Connected!")
        print(f"   Bot:  @{bot.get('username')}")
        print(f"   Name: {bot.get('first_name')}")
        print(f"   ID:   {bot.get('id')}")
        print(f"   Can join groups: {bot.get('can_join_groups')}")
        print(f"   Reads messages: {bot.get('can_read_all_group_messages')}")
        print()
        print("Next: python -m modules.telegram_bot")
    else:
        print(f"❌ Token invalid: {data}")
        sys.exit(1)
except requests.exceptions.RequestException as e:
    print(f"❌ Network error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
