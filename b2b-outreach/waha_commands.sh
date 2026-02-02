#!/bin/bash
# Quick WAHA Commands for Restocka WhatsApp Campaign

WAHA_URL="http://91.98.113.215:3000"
API_KEY="restocka2026"

echo "=== WAHA Quick Commands ==="
echo ""

# Check session
echo "1. Check session status:"
curl -s -H "x-api-key: $API_KEY" $WAHA_URL/api/sessions/default
echo ""

# Start session
echo "2. Start session:"
curl -s -H "x-api-key: $API_KEY" -X POST $WAHA_URL/api/sessions/default/start
echo ""

# Stop session
echo "3. Stop session:"
curl -s -H "x-api-key: $API_KEY" -X POST $WAHA_URL/api/sessions/default/stop
echo ""

# Send test message (replace phone)
echo "4. Send message example:"
curl -s -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -X POST $WAHA_URL/api/sendText \
  -d '{"session":"default","chatId":"18091234567@c.us","text":"Test message"}'
echo ""

# Check number status
echo "5. Check number status:"
curl -s -H "x-api-key: $API_KEY" "$WAHA_URL/api/checkNumberStatus?chatId=18091234567@c.us"
echo ""

echo "=== Usage ==="
echo "- QR Code: http://91.98.113.215:3000 (scan with WhatsApp)"
echo "- API Key: restocka2026"
echo "- Script: python3 ~/restocka-app/b2b-outreach/whatsapp_sender.py --help"
