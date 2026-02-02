#!/usr/bin/env python3
"""
WhatsApp Bulk Sender Script for Restocka B2B Campaign
Uses WAHA API (http://91.98.113.215:3000)

Usage:
    python3 whatsapp_sender.py --test     # Send test to first number only
    python3 whatsapp_sender.py --dry-run  # Show what would be sent
    python3 whatsapp_sender.py --send     # Send to all numbers
"""

import requests
import json
import csv
import argparse
import time
import sys
from pathlib import Path

# Configuration
WAHA_URL = "http://91.98.113.215:3000"
API_KEY = "restocka2026"
HEADERS = {"x-api-key": API_KEY, "Content-Type": "application/json"}

# Message template
DEFAULT_MESSAGE = """Hola! 👋

Somos de Restocka - una plataforma de reabastecimiento de inventario para restaurantes.

Nos especializamos en ayudar a restaurantes en la República Dominicana a:
- Optimizar niveles de inventario
- Reducir desperdicios de alimentos  
- Automaticar órdenes de compra
- Obtener mejores precios con proveedores locales

¿Te gustaría agendar una llamada de 15 minutos para mostrarte cómo podemos ayudarte?

Saludos,
Equipo Restocka
"""


def get_session_status():
    """Check WAHA session status"""
    try:
        response = requests.get(f"{WAHA_URL}/api/sessions/default", headers=HEADERS)
        return response.json()
    except Exception as e:
        print(f"Error checking session: {e}")
        return None


def start_session():
    """Start the WAHA session"""
    try:
        response = requests.post(f"{WAHA_URL}/api/sessions/default/start", headers=HEADERS)
        return response.json()
    except Exception as e:
        print(f"Error starting session: {e}")
        return None


def stop_session():
    """Stop the WAHA session"""
    try:
        response = requests.post(f"{WAHA_URL}/api/sessions/default/stop", headers=HEADERS)
        return response.json()
    except Exception as e:
        print(f"Error stopping session: {e}")
        return None


def check_number_status(phone: str) -> dict:
    """Check if a phone number is valid on WhatsApp"""
    chat_id = format_phone(phone)
    try:
        response = requests.get(
            f"{WAHA_URL}/api/checkNumberStatus",
            headers=HEADERS,
            params={"chatId": chat_id}
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def format_phone(phone: str) -> str:
    """Format phone number for WhatsApp (Dominican Republic format)"""
    # Remove spaces, dashes, and parentheses
    phone = ''.join(c for c in phone if c.isdigit())
    
    # Dominican Republic country code is 1, area codes: 809, 829, 849
    if phone.startswith('1') and len(phone) == 11:
        pass  # Already formatted
    elif phone.startswith('809') or phone.startswith('829') or phone.startswith('849'):
        phone = '1' + phone  # Add country code
    elif len(phone) == 10:
        phone = '1' + phone  # Add country code
    else:
        print(f"Warning: Unexpected phone format: {phone}")
    
    return f"{phone}@c.us"


def send_message(phone: str, message: str = DEFAULT_MESSAGE, session: str = "default") -> dict:
    """Send a WhatsApp message"""
    chat_id = format_phone(phone)
    payload = {
        "session": session,
        "chatId": chat_id,
        "text": message
    }
    
    try:
        response = requests.post(
            f"{WAHA_URL}/api/sendText",
            headers=HEADERS,
            json=payload
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def load_phone_numbers(filepath: str) -> list:
    """Load phone numbers from CSV or text file"""
    phones = []
    
    if filepath.endswith('.csv'):
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'phone' in row:
                    phones.append(row['phone'])
                elif 'Phone' in row:
                    phones.append(row['Phone'])
    else:
        # Assume text file with one phone per line
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                phone = line.strip()
                if phone and phone[0].isdigit():
                    phones.append(phone)
    
    return phones


def send_bulk_messages(phones: list, message: str, delay: int = 5) -> dict:
    """Send messages to multiple phones"""
    results = {
        "success": 0,
        "failed": 0,
        "details": []
    }
    
    for i, phone in enumerate(phones):
        print(f"[{i+1}/{len(phones)}] Sending to {phone}...")
        
        # Check number status first
        status = check_number_status(phone)
        
        if status.get("status") == "valid":
            result = send_message(phone, message)
            
            if result.get("id"):
                print(f"  ✓ Message sent successfully")
                results["success"] += 1
                results["details"].append({"phone": phone, "status": "sent", "result": result})
            else:
                print(f"  ✗ Failed: {result}")
                results["failed"] += 1
                results["details"].append({"phone": phone, "status": "failed", "result": result})
        else:
            print(f"  ✗ Invalid number or not on WhatsApp: {status}")
            results["failed"] += 1
            results["details"].append({"phone": phone, "status": "invalid", "result": status})
        
        # Delay between messages to avoid rate limiting
        if i < len(phones) - 1:
            time.sleep(delay)
    
    return results


def main():
    parser = argparse.ArgumentParser(description='WhatsApp Bulk Sender for Restocka B2B Campaign')
    parser.add_argument('--test', action='store_true', help='Send test to first number only')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be sent without sending')
    parser.add_argument('--send', action='store_true', help='Send to all numbers')
    parser.add_argument('--phones', type=str, default='phone_numbers.txt', help='Phone numbers file')
    parser.add_argument('--message', type=str, default=None, help='Custom message file')
    parser.add_argument('--delay', type=int, default=5, help='Delay between messages (seconds)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("WhatsApp Bulk Sender - Restocka B2B Campaign")
    print("=" * 60)
    
    # Check session status
    print("\n1. Checking WAHA session status...")
    status = get_session_status()
    
    if status:
        print(f"   Session status: {status.get('status', 'unknown')}")
        
        if status.get('status') != 'WORKING':
            print("\n⚠️  Session is not working! Please:")
            print("   - Scan the QR code at http://91.98.113.215:3000")
            print("   - Or run: python3 whatsapp_sender.py --start-session")
            return
    else:
        print("   ✗ Could not connect to WAHA")
        return
    
    # Load phone numbers
    print(f"\n2. Loading phone numbers from {args.phones}...")
    
    if not Path(args.phones).exists():
        print(f"   ✗ File not found: {args.phones}")
        print("\n   To create phone_numbers.txt, add one phone per line:")
        print("   18091234567")
        print("   18097654321")
        return
    
    phones = load_phone_numbers(args.phones)
    print(f"   ✓ Loaded {len(phones)} phone numbers")
    
    if args.test:
        phones = phones[:1]
        print(f"   → Test mode: using first number only")
    
    if not phones:
        print("   ✗ No phone numbers found")
        return
    
    # Load message
    print("\n3. Preparing message...")
    if args.message and Path(args.message).exists():
        with open(args.message, 'r', encoding='utf-8') as f:
            message = f.read()
        print(f"   ✓ Loaded custom message from {args.message}")
    else:
        message = DEFAULT_MESSAGE
        print("   ✓ Using default message template")
    
    if args.dry_run:
        print("\n4. Dry run - would send to:")
        for phone in phones:
            print(f"   - {phone}")
        print("\n   Message preview:")
        print("-" * 40)
        print(message[:200] + "..." if len(message) > 200 else message)
        print("-" * 40)
        return
    
    if args.send:
        print(f"\n4. Sending messages (with {args.delay}s delay)...")
        results = send_bulk_messages(phones, message, args.delay)
        
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)
        print(f"✓ Sent successfully: {results['success']}")
        print(f"✗ Failed: {results['failed']}")
        print(f"Total: {len(phones)}")
        
        # Save results
        with open('whatsapp_results.json', 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print("\n   Results saved to whatsapp_results.json")


if __name__ == "__main__":
    main()
