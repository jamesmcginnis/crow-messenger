"""What kind of sender an email is from: a person, or something automatic.

The same rules as the card's Inbox groups (senderKind in crow-email.js), so the
Unread sensors for each group match what the card shows. Change both together.
An email added to Council and Local is in that group whoever sent it (see Account.async_counts).
"""
from __future__ import annotations

import re

GROUPS = ("person", "notify", "council", "shop", "social", "news")

_RULES = [
    ("council", re.compile(r"govdelivery|granicus|\.gov\b|\bcouncils?\b|\bnhs\b|\bhmrc\b|\bdvla\b", re.I)),
    ("shop", re.compile(r"amazon|ebay|etsy|paypal|\b(?:orders?|ordered|order[-_.]?confirm|shipment|shipping|dispatch|deliver"
                        r"|parcel|receipt|invoice|payment|billing|bills?\b|checkout|basket|store|shop)", re.I)),
    ("social", re.compile(r"facebook|instagram|twitter|x\.com|linkedin|tiktok|reddit|whatsapp|discord|pinterest|snapchat"
                          r"|youtube|strava", re.I)),
    ("news", re.compile(r"substack|mailchimp|\b(?:newsletter|digest|weekly|daily|news|marketing|offers?\b|deals?\b|promo"
                        r"|sales?\b|subscribe)", re.I)),
    ("notify", re.compile(r"no-?reply|do-?not-?reply|notification|notify|alert|security|verify|account|support|service|team"
                          r"|info@|hello@|mailer|bounce|updates?@|github|google|apple|microsoft", re.I)),
]
_SHOP_SUBJECT = re.compile(r"\b(?:receipt|orders?|ordered|invoice|delivery|delivered|your bill)\b", re.I)


def sender_kind(it: dict) -> str:
    frm = (it.get("from") or [{}])[0] or {}
    text = f"{frm.get('email') or ''} {frm.get('name') or ''}"
    for kind, rx in _RULES:
        if rx.search(text):
            return kind
    if _SHOP_SUBJECT.search(it.get("subject") or ""):
        return "shop"
    return "person"
