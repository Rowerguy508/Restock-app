# WhatsApp Outreach Setup - Restocka B2B Campaign

## Overview
This document describes how to set up and use WhatsApp bulk messaging for the Restocka B2B campaign targeting Dominican Republic restaurants.

## Prerequisites

### 1. WAHA Instance (Already Running)
- **URL:** http://91.98.113.215:3000
- **API Key:** `restocka2026`
- **Authentication:** Header `x-api-key: restocka2026`
- **Docker Container:** `waha` (running on VPS)

### 2. WhatsApp Authentication
Before sending messages, the WhatsApp session must be authenticated:

```bash
# Check session status
curl -H 'x-api-key: restocka2026' http://91.98.113.215:3000/api/sessions/default

# Start session (if stopped)
curl -H 'x-api-key: restocka2026' -X POST http://91.98.113.215:3000/api/sessions/default/start
```

**QR Code:** Access http://91.98.113.215:3000 in a browser and scan the QR code with WhatsApp to authenticate.

### 3. Phone Numbers
Phone numbers should be stored in `phone_numbers.txt` (one per line):
- Dominican Republic format: 10 digits (area code + number)
- Country code +1 is added automatically
- Example: `8091234567` → WhatsApp ID: `18091234567@c.us`

## Quick Start

### Check WAHA Status
```bash
curl -H 'x-api-key: restocka2026' http://91.98.113.215:3000/api/sessions/default
```

Expected response when authenticated:
```json
{
  "name": "default",
  "status": "WORKING",
  "me": {"id": "...", "name": "..."}
}
```

### Send Test Message
```bash
python3 whatsapp_sender.py --test
```

### Dry Run (Preview)
```bash
python3 whatsapp_sender.py --dry-run
```

### Send to All Numbers
```bash
python3 whatsapp_sender.py --send
```

## API Reference

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions/default` | GET | Check session status |
| `/api/sessions/default/start` | POST | Start session |
| `/api/sessions/default/stop` | POST | Stop session |
| `/api/sendText` | POST | Send text message |
| `/api/checkNumberStatus` | GET | Verify phone number on WhatsApp |

### Send Message Example
```bash
curl -H 'x-api-key: restocka2026' \
  -H 'Content-Type: application/json' \
  -X POST http://91.98.113.215:3000/api/sendText \
  -d '{
    "session": "default",
    "chatId": "18091234567@c.us",
    "text": "Hola! Somos de Restocka..."
  }'
```

## Best Practices

1. **Rate Limiting:** Add delays between messages (5-10 seconds recommended)
2. **Number Validation:** Check number status before sending
3. **Message Timing:** Avoid sending during late night hours
4. **Compliance:** Include opt-out option in messages
5. **Testing:** Always test with `--test` first

## Troubleshooting

### Session Status Issues
- `STOPPED`: Run start command or scan QR code
- `SCAN_QR_CODE`: Access dashboard and authenticate
- `DISCONNECTED`: Restart session

### API Errors
- `401 Unauthorized`: Check API key in header
- `400 Bad Request`: Verify JSON payload format
- `Session not found`: Create session first

## Files

| File | Description |
|------|-------------|
| `whatsapp_sender.py` | Main bulk sender script |
| `phone_numbers.txt` | List of phone numbers (137 needed) |
| `WAHA_SETUP.md` | This documentation |
| `DR_LEADS.md` | Restaurant contact database (emails) |

## Collecting Phone Numbers

To collect 137 DR business phone numbers:

1. **Google Maps Search:** Search for restaurants in Santo Domingo, Punta Cana, etc.
2. **Business Directories:** Dominican Republic Chamber of Commerce
3. **Restaurant Association:** ADOCARNE (Asociación Dominicana de Restaurantes)
4. **TripAdvisor/Yelp:** Extract from restaurant listings
5. **Direct Website Visits:** Check restaurant contact pages

### Phone Number Format for WhatsApp
- Remove special characters: `(809) 123-4567` → `8091234567`
- Add country code if needed: `8091234567` → `18091234567`
- WhatsApp ID format: `{country_code}{number}@c.us`

## Campaign Message Template

Default message (Spanish):
```
Hola! 👋

Somos de Restocka - una plataforma de reabastecimiento de inventario para restaurantes.

Nos especializamos en ayudar a restaurantes en la República Dominicana a:
- Optimizar niveles de inventario
- Reducir desperdicios de alimentos
- Automaticar órdenes de compra
- Obtener mejores precios con proveedores locales

¿Te gustaría agendar una llamada de 15 minutos para mostrarte cómo podemos ayudarte?

Saludos,
Equipo Restocka
```

## Security Notes

- Keep API key (`restocka2026`) secure
- Don't commit phone numbers to version control
- Use `.gitignore` for sensitive files
- Consider encrypting `phone_numbers.txt`
