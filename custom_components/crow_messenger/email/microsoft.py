"""Signing in to Outlook.com and Microsoft 365 (OAuth 2.0 device code flow).

Microsoft no longer accepts passwords for IMAP and SMTP, so Crow Messenger Email signs in the way TVs
and other apps without a keyboard do: it shows a short code, you open microsoft.com/devicelogin
on any device, enter the code and sign in. Home Assistant then keeps a refresh token (never
your password) and swaps it for a fresh access token whenever it connects.

This needs an app registration of your own in Microsoft Entra (free); the README explains
how. Its Application (client) ID is entered once, by an administrator, in the card editor.
"""
from __future__ import annotations

import base64
import json
import logging
import time

from aiohttp import ClientError

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import MS_AUTHORITY, MS_SCOPES

_LOGGER = logging.getLogger(__name__)


class MicrosoftError(Exception):
    """Signing in to Microsoft failed (the message is shown to people)."""


def _jwt_claims(token: str) -> dict:
    try:
        part = token.split(".")[1]
        part += "=" * (-len(part) % 4)
        return json.loads(base64.urlsafe_b64decode(part))
    except Exception:  # noqa: BLE001
        return {}


async def _post(hass: HomeAssistant, url: str, data: dict) -> dict:
    session = async_get_clientsession(hass)
    try:
        async with session.post(url, data=data, timeout=30) as resp:
            body = await resp.json(content_type=None)
    except (ClientError, TimeoutError, ValueError) as err:
        raise MicrosoftError("Couldn't reach Microsoft. Check the internet connection.") from err
    return body if isinstance(body, dict) else {}


async def start_device_code(hass: HomeAssistant, client_id: str, tenant: str) -> dict:
    if not client_id:
        raise MicrosoftError("An administrator needs to add a Microsoft Application (client) ID in the card editor first.")
    body = await _post(hass, f"{MS_AUTHORITY}/{tenant or 'common'}/oauth2/v2.0/devicecode",
                       {"client_id": client_id, "scope": MS_SCOPES})
    if "device_code" not in body:
        raise MicrosoftError(_explain(body))
    return {
        "device_code": body["device_code"],
        "user_code": body["user_code"],
        "verification_uri": body.get("verification_uri") or "https://microsoft.com/devicelogin",
        "expires_at": time.time() + int(body.get("expires_in", 900)),
        "interval": int(body.get("interval", 5)),
    }


async def poll_device_code(hass: HomeAssistant, client_id: str, tenant: str, device_code: str) -> dict | None:
    """None while still waiting for you to sign in; the tokens once you have."""
    body = await _post(hass, f"{MS_AUTHORITY}/{tenant or 'common'}/oauth2/v2.0/token", {
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "client_id": client_id, "device_code": device_code,
    })
    err = body.get("error")
    if err in ("authorization_pending", "slow_down"):
        return None
    if err:
        raise MicrosoftError(_explain(body))
    return _tokens(body)


async def refresh(hass: HomeAssistant, client_id: str, tenant: str, refresh_token: str) -> dict:
    body = await _post(hass, f"{MS_AUTHORITY}/{tenant or 'common'}/oauth2/v2.0/token", {
        "grant_type": "refresh_token", "client_id": client_id,
        "refresh_token": refresh_token, "scope": MS_SCOPES,
    })
    if body.get("error"):
        raise MicrosoftError(_explain(body))
    return _tokens(body)


def _tokens(body: dict) -> dict:
    claims = _jwt_claims(body.get("id_token", ""))
    return {
        "access_token": body["access_token"],
        "refresh_token": body.get("refresh_token"),
        "expires_at": time.time() + int(body.get("expires_in", 3600)) - 120,
        "email": (claims.get("email") or claims.get("preferred_username") or "").lower(),
        "name": claims.get("name") or "",
    }


def _explain(body: dict) -> str:
    err = str(body.get("error") or "")
    desc = str(body.get("error_description") or "")
    _LOGGER.debug("Microsoft sign-in error %s: %s", err, desc)
    if err == "expired_token":
        return "The code expired before sign-in finished. Start again."
    if err in ("access_denied", "authorization_declined"):
        return "Sign-in was cancelled."
    if err == "invalid_grant":
        return "Microsoft needs you to sign in again (the sign-in has expired or was revoked)."
    if "AADSTS700016" in desc or err == "unauthorized_client":
        return "Microsoft doesn't recognise the Application (client) ID. Check it in the card editor."
    if "AADSTS7000218" in desc:
        return "Turn on 'Allow public client flows' in the app registration's Authentication page."
    if "AADSTS50020" in desc or "AADSTS50194" in desc:
        return "The app registration only allows accounts from one organisation. Set it to allow personal and work accounts, or set the tenant in the card editor."
    return "Microsoft sign-in failed" + (f": {desc.splitlines()[0][:200]}" if desc else ".")
