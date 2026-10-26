"""Constants for Crow Messenger's Email (switched on in the card editor: the Email page)."""
from __future__ import annotations

# the key for Email's own data, websocket commands and web addresses inside Crow Messenger
DOMAIN = "crow_messenger_email"
STORAGE_KEY = "crow_messenger.email"
# the integration Email belongs to (services, entities and devices)
PARENT = "crow_messenger"
# Home Assistant events keep the crow_email_ names automations already know
EVENT_PREFIX = "crow_email"
STORAGE_VERSION = 1


# Home Assistant events
EVENT_RECEIVED = f"{EVENT_PREFIX}_received"
EVENT_SENT = f"{EVENT_PREFIX}_sent"
EVENT_RULE_MATCHED = f"{EVENT_PREFIX}_rule_matched"
EVENT_DETAILS = f"{EVENT_PREFIX}_details"          # what the AI found in a new email (bills, deliveries, appointments…)
EVENT_FOLLOW_UP = f"{EVENT_PREFIX}_follow_up"      # a sent email that may need a follow-up
EVENT_PARCEL = f"{EVENT_PREFIX}_parcel"            # a parcel was added or its status changed
EVENT_FOOD = f"{EVENT_PREFIX}_food"                # a food order was added or its status changed
EVENT_GROCERY = f"{EVENT_PREFIX}_grocery"          # a supermarket delivery was added or its status changed
EVENT_BLOCKED = f"{EVENT_PREFIX}_blocked"          # email from a blocked sender was moved to Junk

# Signal sent (through the dispatcher) when an account's numbers change, so its sensors update
SIGNAL_ACCOUNT_UPDATED = f"{DOMAIN}_account_updated"
SIGNAL_ACCOUNTS_CHANGED = f"{DOMAIN}_accounts_changed"

# Phone notification buttons
NOTIFY_ACTION_PREFIX = "CROW_EMAIL"

# How things are fetched
PAGE_SIZE = 40
PREVIEW_BYTES = 20000           # the start of each email (headers included), for the preview line in the list
PREVIEW_CHARS = 220
IDLE_RENEW_SECONDS = 25 * 60    # servers drop IDLE after 29 minutes
POLL_SECONDS = 120              # for servers without IDLE, and as a safety net
COUNTS_SECONDS = 300            # unread / flagged / drafts / storage refresh
CONNECT_TIMEOUT = 30
MAX_SEARCH_RESULTS = 200
MAX_VIPS = 200
UNREAD_GROUP_MAX = 1000   # newest unread emails sorted into groups (People, Shopping...) for the sensors
SUBSCRIPTIONS_EVERY = 6 * 3600   # seconds between counting mailing lists for the Subscriptions sensor
MAX_RULES = 50
MAX_ACCOUNTS_PER_USER = 10

# Providers: where to connect, and how
PROVIDERS: dict[str, dict] = {
    "icloud": {
        "name": "iCloud", "auth": "password",
        "imap": {"host": "imap.mail.me.com", "port": 993, "security": "ssl"},
        "smtp": {"host": "smtp.mail.me.com", "port": 587, "security": "starttls"},
        "sent_copy": True,
        "help": "Use an app-specific password: appleid.apple.com → Sign-In and Security → App-Specific Passwords.",
    },
    "gmail": {
        "name": "Gmail", "auth": "password",
        "imap": {"host": "imap.gmail.com", "port": 993, "security": "ssl"},
        "smtp": {"host": "smtp.gmail.com", "port": 465, "security": "ssl"},
        "sent_copy": False,   # Gmail files sent mail itself
        "help": "Use an App Password: myaccount.google.com → Security → 2-Step Verification → App passwords.",
    },
    "yahoo": {
        "name": "Yahoo", "auth": "password",
        "imap": {"host": "imap.mail.yahoo.com", "port": 993, "security": "ssl"},
        "smtp": {"host": "smtp.mail.yahoo.com", "port": 465, "security": "ssl"},
        "sent_copy": True,
        "help": "Use an app password: Yahoo Account Security → Generate app password.",
    },
    "outlook": {
        "name": "Outlook", "auth": "microsoft",
        "imap": {"host": "outlook.office365.com", "port": 993, "security": "ssl"},
        "smtp": {"host": "smtp.office365.com", "port": 587, "security": "starttls"},
        "sent_copy": False,   # Outlook and Microsoft 365 file sent mail themselves
        "help": "Sign in with your Microsoft account. Works with Outlook.com, Hotmail, Live and Microsoft 365.",
    },
    "other": {
        "name": "Other", "auth": "password",
        "imap": {"host": "", "port": 993, "security": "ssl"},
        "smtp": {"host": "", "port": 587, "security": "starttls"},
        "sent_copy": True,
        "help": "Your email provider's IMAP and SMTP settings.",
    },
}

# Microsoft sign-in (the device code flow: sign in on any device with a short code)
MS_AUTHORITY = "https://login.microsoftonline.com"
MS_SCOPES = ("offline_access openid email profile "
             "https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send")

DEFAULT_SETTINGS = {
    # Microsoft sign-in needs an app registration of your own (see the README)
    "ms_client_id": "",
    "ms_tenant": "common",
    "max_attachment_mb": 25,
    # Parcel Tracker: days a delivered parcel stays in Parcels (0: until it's removed)
    "parcel_keep_days": 3,
    # the red number on the Home Assistant app's icon (off until an administrator turns it on)
    "badge": {"enabled": False},
    # new-email notifications: which buttons they have, and whether they're grouped by sender
    "notifications": {"buttons": {"reply": True, "read": True, "archive": True, "flag": False, "remind": False, "delete": False},
                      "group_sender": False},
    # Email Home Assistant: an email to yourself starting "HA:" goes to Assist (off until turned on)
    "email_ha": {"enabled": False, "agent": ""},
    "ai": {
        "enabled": False,
        "task_entity": "",
        # the ones that run by themselves on new mail (and so use the AI more) start off
        "features": {"whois": True, "summary": True, "replies": True, "writing": True, "translate": True, "actions": True,
                     "ask": True, "thread": True, "search": True, "attachments": True, "tone": True, "scam": True,
                     "describe": True, "assist": False, "notify": False, "automation": False, "parcels": False,
                     "categories": False, "followup": False, "rules": False,
                     # the newer ones: all on as soon as AI Features is turned on
                     "smart_snooze": True, "screener_notes": True, "sub_notes": True, "tidy": True, "chaser": True,
                     "signatures": True, "appointments": True, "bills": True, "briefing": True,
                     "food": True, "groceries": True, "travel": True, "returns": True, "renewals": True, "visits": True,
                     "tickets": True, "council": True, "receipts": True},
    },
}

NOTIFY_CHOICES = ("all", "smart", "vip", "none")
SEND_LATER_GRACE = 30_000   # ms: a Send Later time in the past is sent straight away
