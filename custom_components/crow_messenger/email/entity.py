"""What every Email entity shares: one device per email account, kept up to date live.

They belong to the Crow Messenger integration (Email is part of it). Their unique ids, translation
keys and devices all start with "email_" so they never clash with Crow Messenger's own.
"""
from __future__ import annotations

from collections.abc import Callable

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity
from homeassistant.helpers.event import async_track_time_change

from .const import DOMAIN, PARENT, SIGNAL_ACCOUNT_UPDATED, SIGNAL_ACCOUNTS_CHANGED
from .manager import Account, Mailer


class CrowMessengerEmailEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, account: Account, key: str) -> None:
        self.account_id = account.id
        self.mailer = account.mailer
        self.key = key
        self._attr_unique_id = f"email_{account.id}_{key}"
        self._attr_translation_key = f"email_{key}"
        acc = account.acc
        self._attr_device_info = DeviceInfo(
            identifiers={(PARENT, f"email_{account.id}")},
            name=f"{acc.get('name') or 'Email'} ({acc['email']})",
            manufacturer="Crow Messenger",
            model=acc.get("name") or acc.get("provider", "Email"),
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def rt(self) -> Account | None:
        return self.mailer.accounts.get(self.account_id)

    @property
    def stats(self) -> dict:
        rt = self.rt
        return rt.public_stats() if rt else {}

    @property
    def available(self) -> bool:
        return self.rt is not None

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(
            self.hass, f"{SIGNAL_ACCOUNT_UPDATED}_{self.account_id}", self.async_write_ha_state))


class HourlyRefresh:
    """For entities that change with the clock (a bill becoming overdue, a snooze ending): looked at again every hour
    (or every few minutes, for ones like a visit's time window)."""
    refresh_minutes: tuple[int, ...] = (0,)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(async_track_time_change(self.hass, self._hourly, minute=list(self.refresh_minutes), second=5))

    @callback
    def _hourly(self, _now) -> None:
        self.async_write_ha_state()

    @property
    def share(self) -> bool:
        rt = self.rt
        return rt.acc.get("share_details", True) if rt else True


def setup_platform(hass: HomeAssistant, entry: ConfigEntry, add: Callable, make: Callable[[Account], list]) -> Callable:
    """Entities for every account now, for accounts added later, and gone with deleted ones.
    Returns the function that stops following accounts (called when Email is switched off)."""
    mailer: Mailer = hass.data[DOMAIN]
    known: set[str] = set()

    @callback
    def sync(removed: str | None = None) -> None:
        new = []
        for a in list(mailer.accounts.values()):
            if a.id not in known:
                known.add(a.id)
                new += make(a)
        if new:
            add(new)
        if removed:
            known.discard(removed)
            remove_account_entities(hass, entry, removed)

    sync()
    return async_dispatcher_connect(hass, SIGNAL_ACCOUNTS_CHANGED, sync)


@callback
def remove_account_entities(hass: HomeAssistant, entry: ConfigEntry, account_id: str | None = None) -> None:
    """Take away one account's entities and device, or (account_id None) every Email entity and device."""
    from homeassistant.helpers import device_registry as dr
    prefix = f"email_{account_id}_" if account_id else "email_"
    reg = er.async_get(hass)
    for ent in er.async_entries_for_config_entry(reg, entry.entry_id):
        if ent.unique_id.startswith(prefix):
            reg.async_remove(ent.entity_id)
    dreg = dr.async_get(hass)
    for dev in dr.async_entries_for_config_entry(dreg, entry.entry_id):
        if any(d == PARENT and (i == f"email_{account_id}" if account_id else i.startswith("email_")) for d, i in dev.identifiers):
            dreg.async_remove_device(dev.id)
