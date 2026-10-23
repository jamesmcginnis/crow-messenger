# Crow Messenger

Crow Messenger is a Home Assistant integration and Lovelace card for private messaging between the people in your home. Designed with an **iPhone Messages** look and feel, the card gives you one-to-one and group chats with photos, videos, files, replies, tapbacks, effects, polls and games — while the integration keeps every conversation on your own Home Assistant server, sends phone notifications through the Companion app and lets your automations send messages too.

Everything is **private to your household** — nothing is stored in the cloud.

> **One download installs both.** The card is bundled inside the integration and loads into your dashboards automatically — no resource to add.

> **AI features are optional and off by default.** Turn on **AI Features** in the card editor to unlock them — they use the conversation agent and AI Task you've already set up in Home Assistant. With AI off, everything else in the card works as normal.

**Step 1 — Add the repository to HACS:**

[![Open your Home Assistant instance and add this repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=crow-messenger&category=integration)

**Step 2 — After downloading and restarting, add the integration:**

[![Open your Home Assistant instance and start setting up Crow Messenger.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=crow_messenger)

**Step 3 — Add the card to a dashboard:**

[![Open your Home Assistant instance and show your dashboards.](https://my.home-assistant.io/badges/lovelace_dashboards.svg)](https://my.home-assistant.io/redirect/lovelace_dashboards/)

## Key Features

- **iPhone Messages Design** — Liquid Glass bars, bubbles with tails and swipe actions
- **One-to-one and Group Chats** — group names and photos, mentions and nicknames
- **Photos, Videos and Files** — up to 300 MB each by default, stored on your server
- **Instant When You Come Back** — your chats show straight away, then only new messages are fetched
- **Replies, Tapbacks, Edits and Undo Send** — press and hold any message
- **Conversation Menus** — press and hold a chat, or open its ••• menu, for Pin, Hide Alerts, Mark as Unread, Find Me, Export as PDF, Archive, Delete and more
- **Select Messages and Conversations** — copy, forward or delete several messages at once, or tidy away several chats
- **Bubble and Screen Effects** — Invisible Ink, Fireworks, Confetti, Balloons and more
- **Send Later and Disappearing Messages**
- **Archive, Remind Me Later and Send a Nudge**
- **Pinned and Starred Messages, Search and Export as PDF** — send an exported PDF straight into a chat
- **Polls, Check In, Where Are You?, Live Location and Shared Places**
- **Ring Phone** — make someone's phone ring loudly, even on silent, until they say they've found it
- **Share a Device and Home Status** — live Home Assistant cards in the conversation
- **Checklists, Events and Shared Timers**
- **Games** — Noughts and Crosses, Connect Four, Reversi, Draughts and Sea Battle
- **Skins** — iPhone, WhatsApp, Messenger, Telegram, Signal, Discord, Material You and old-school MSN, ICQ, AIM, Yahoo!, Windows 98, Windows XP, Mac OS X Aqua, BlackBerry, Nokia SMS and IRC
- **Chat Backgrounds and Live Wallpapers** — or set any photo someone sent as the background
- **Full Screen** — one tap on the Messages screen gives the card the whole screen, another puts it back, or have it open in full screen every time
- **Private Contacts** — each person's own address book, with vCard import
- **People Map** — where everyone is, with Find Me and zones, and for each person how long they've been there, the weather there, what they're doing, Focus, charging and Wi-Fi, plus Find Nearby for places around them, with saved places kept on the map

## AI Features

All optional, and each can be switched off individually:

- **Chat with Home Assistant** — ask questions or control your home by message
- **Suggested Replies** and **Writing Tools**
- **Catch Up** — the gist of several unread messages
- **Translate** — any message, into your phone's language
- **Add to Calendar and Reminders**
- **Ask This Chat** — ask a question about a conversation
- **Photo Descriptions**

## Integration

- **Phone Notifications** — through the Companion app, with Reply from the notification
- **App Icon Badge** — optional: a red number on the app's icon showing unread messages
- **Notification Buttons** — Tapbacks, Mark as Read, Hide Alerts, and I'm Home or On My Way
- **Richer Notifications** — the sender's photo, stickers, link previews, maps and live camera views
- **`crow_messenger.send_message` action** — send messages, photos and buttons from automations
- **`crow_messenger_message_received` event** — for automations around new messages
- **`crow_messenger_action` event** — when someone taps a button sent by an automation

## Installation

1. Add `https://github.com/jamesmcginnis/crow-messenger` as an **Integration** custom repository in HACS
2. Search for **Crow Messenger** and click **Download**
3. Restart Home Assistant
4. Go to **Settings → Devices & Services → + Add Integration**, search for **Crow Messenger** and click **Submit**
5. Hard-refresh your browser, or close and reopen the HA app on your iPhone
6. Add the **Crow Messenger** card to a dashboard

Or copy `custom_components/crow_messenger` from the [Releases](../../releases/latest) page into `/config/custom_components/`, restart, and add the integration.

## Doorbell Example

```yaml
alias: Doorbell snapshot
triggers:
  - trigger: state
    entity_id: binary_sensor.doorbell
    to: "on"
actions:
  - action: camera.snapshot
    target:
      entity_id: camera.front_door
    data:
      filename: /config/www/snapshots/doorbell.jpg
  - action: crow_messenger.send_message
    data:
      to: ["James", "Sarah"]
      message: "Someone is at the front door"
      attachment: /local/snapshots/doorbell.jpg
```

## Quick Start

```yaml
type: custom:crow-messenger-card
card_height: fill
card_liquid_glass: true
appearance: auto
glass: 50
```

> **Note:** Everything above can be set from the visual editor. Household settings are stored by the integration and set from the editor by an administrator.
