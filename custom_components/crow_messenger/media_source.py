"""Lets Home Assistant's AI Task read a photo from a chat, for photo descriptions.

Nothing is listed here (the folder in the Media panel is empty): a photo can only
be reached by its random id, and the address it resolves to still needs a login
by someone in that chat.
"""
from __future__ import annotations

from pathlib import Path

from homeassistant.components.media_player import MediaClass, MediaType
from homeassistant.components.media_source import (
    BrowseMediaSource,
    MediaSource,
    MediaSourceItem,
    PlayMedia,
    Unresolvable,
)
from homeassistant.core import HomeAssistant

from .const import DOMAIN


async def async_get_media_source(hass: HomeAssistant) -> MediaSource:
    return CrowMessengerMediaSource(hass)


class CrowMessengerMediaSource(MediaSource):
    name = "Crow Messenger"

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(DOMAIN)
        self.hass = hass

    async def async_resolve_media(self, item: MediaSourceItem) -> PlayMedia:
        messenger = self.hass.data.get(DOMAIN)
        att = messenger.data["attachments"].get(item.identifier or "") if messenger else None
        if not att or att.get("status") != "sent" or att.get("removed"):
            raise Unresolvable("Not found")
        path = messenger.attachment_path(att)
        if not path or not await self.hass.async_add_executor_job(Path(path).is_file):
            raise Unresolvable("Not found")
        return PlayMedia(f"/api/crow_messenger/media/{att['id']}", att.get("mime") or "application/octet-stream",
                         path=Path(path))

    async def async_browse_media(self, item: MediaSourceItem) -> BrowseMediaSource:
        return BrowseMediaSource(
            domain=DOMAIN, identifier=None, media_class=MediaClass.DIRECTORY, media_content_type=MediaType.IMAGE,
            title="Crow Messenger (private)", can_play=False, can_expand=True, children=[],
        )
