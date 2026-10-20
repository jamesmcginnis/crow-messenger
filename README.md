# Crow Messenger

Crow Messenger is a Home Assistant integration and Lovelace card for private messaging between the people in your home. Designed with an **iPhone Messages** look and feel, the card gives you one-to-one and group chats with photos, videos, files, replies, tapbacks, effects, polls, games and much more — while the integration keeps every conversation on your own Home Assistant server, sends phone notifications through the Companion app and lets your automations send messages too.

Everything is **private to your household** — messages, photos and contacts are stored by the integration on your Home Assistant server, never in the cloud.

> **One download installs both.** The card is bundled inside the integration and is loaded into your dashboards automatically — there's no separate resource to add.

> **AI features are optional and off by default.** Turn on **AI Features** in the card editor to unlock them — they use the conversation agent and AI Task you've already set up in Home Assistant (see [AI Features Setup](#ai-features-setup-optional) below). With AI off, everything else in the card works as normal.

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2025.8+-blue)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)

**Step 1 — Add the repository to HACS:**

[![Open your Home Assistant instance and add this repository to HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=jamesmcginnis&repository=crow-messenger&category=integration)

**Step 2 — After downloading and restarting, add the integration:**

[![Open your Home Assistant instance and start setting up Crow Messenger.](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start/?domain=crow_messenger)

**Step 3 — Add the card to a dashboard:**

[![Open your Home Assistant instance and show your dashboards.](https://my.home-assistant.io/badges/lovelace_dashboards.svg)](https://my.home-assistant.io/redirect/lovelace_dashboards/)

Open a dashboard, click **Edit** → **+ Add Card** and search for **Crow Messenger**.

---

## Installation

### Via HACS (Recommended)

1. Click the **Add to HACS** button above, or in Home Assistant open **HACS** → **⋮ menu** (top right) → **Custom repositories**
2. Add `https://github.com/jamesmcginnis/crow-messenger` as an **Integration** repository, then close
3. Search for **Crow Messenger** and click **Download**
4. **Restart Home Assistant**
5. Click the **Add Integration** button above, or go to **Settings → Devices & Services → + Add Integration** and search for **Crow Messenger**
6. Click **Submit** — there's nothing to fill in, everything else is set from the card
7. Hard-refresh your browser (Cmd+Shift+R on Mac) or close and reopen the Home Assistant app on your iPhone
8. Click the **Add Card** button above, edit a dashboard, click **+ Add Card** and search for **Crow Messenger**

### Manual

1. Download this repository from [Releases](../../releases/latest)
2. Copy the `custom_components/crow_messenger` folder into `/config/custom_components/` on your Home Assistant instance
3. Restart Home Assistant, then add the integration under **Settings → Devices & Services → + Add Integration**
4. Hard-refresh your browser and add the **Crow Messenger** card to a dashboard

> **You don't need to add a dashboard resource.** The integration serves the card and registers it automatically. If you previously added `crow-messenger-card.js` as a resource by hand, remove it under **Settings → Dashboards → Resources** so only the bundled copy loads.

> **Tip:** Crow Messenger works best on a dashboard of its own — choose **Fill the screen** for Card Height and use a **Panel** view.

---

## AI Features Setup (Optional)

AI features are **off by default** — the card works fully without them. They use what's already set up in Home Assistant, so no extra accounts or keys are added to the card:

- **Chat with Home Assistant** uses a **conversation agent** (Assist, or any AI conversation agent you've added under **Settings → Voice assistants**). Message "Home Assistant" to ask questions or control your home.
- **Everything else** uses an **AI Task** entity. Add an AI integration under **Settings → Devices & Services**, then choose a preferred AI Task under **Settings → System → General → AI suggestions**, or pick one in the card editor.

To turn them on, open the card editor's **AI Features** section, switch on **AI Features**, then choose the conversation agent and AI Task. Each feature can be switched off on its own.

> AI Tasks have no access to your devices, so a message that says "turn off the heating" can be translated or summarised without anything being switched off.

---

## Features

### Messaging

- **iPhone Messages design** — Liquid Glass bars, bubbles with tails, swipe actions and smooth page transitions
- **One-to-one and group chats** — group names and photos, mentions, nicknames and member management
- **Photos, videos and files** — up to 300 MB each by default, stored on your Home Assistant server
- **Replies, tapbacks, edits and Undo Send** — press and hold any message for the full menu
- **Instant when you come back** — your conversations, the newest messages of your recent chats and photo thumbnails are kept on your device, so opening the card or coming back to the app shows them straight away, then quietly fetches anything new. Each person's copy is separate, and it is cleared when someone else signs in on that device
- **Bubble and screen effects** — Slam, Loud, Gentle, Invisible Ink, Fireworks, Confetti, Balloons and many more
- **Text formatting** — bold, italic, underline and strikethrough
- **Stickers and Sketch** — make stickers from photos, or draw and send a sketch
- **Read receipts and typing indicators**
- **Send Later** — at a time you choose, or when you arrive at or leave a place
- **Disappearing messages** — press and hold Send to send one that disappears
- **Pinned conversations, pinned messages and starred messages**
- **Archive** — tidy chats away; they come back when a new message arrives, unless you keep them archived
- **Remind Me Later** — be reminded about any message at a time you choose
- **Send a Nudge** — a friendly follow-up, worded to suit the message
- **Search** — across every conversation, or within one, with filters for photos, links, files and locations
- **Export as PDF** — a conversation, a contact or your whole address book
- **Drafts** — whatever you've typed is kept when you leave a conversation
- **Reopens your last chat** — come back to the app and you're where you left off

### Add to a Message

- **Polls** — with live results, in one-to-one and group chats
- **Check In** — let people know when you arrive, or be told if you haven't
- **Where Are You?** — ask someone to share their location just once
- **Live Location and shared places** — with a map in the conversation
- **Share a Device** — send any Home Assistant device as a live, tappable card
- **Home Status** — what's unlocked, open or switched on right now
- **Checklists** — shared lists, optionally linked to a Home Assistant to-do list
- **Events** — with Going, Maybe and Can't Go, and Add to Calendar
- **Shared Timers** — everyone sees the countdown and is told when it's done
- **Games** — Noughts and Crosses, Connect Four, Reversi, Draughts and Sea Battle, with Home Assistant checking every move
- **Contact cards** — share a contact from your address book
- **Editable drawer** — reorder or hide the apps you don't use

### Look and Feel

- **Classic or Glass** style, with **Auto, Light or Dark** theme and a Glass slider from clear to frosted
- **Skins** — each person can pick their own look: iPhone, WhatsApp, Messenger, Telegram, Signal, Discord, Material You, or old-school MSN 2005, ICQ 2000, AIM, Yahoo!, Windows 98, Windows XP, Mac OS X Aqua, BlackBerry Messenger, Nokia SMS and IRC / Terminal
- **Chat backgrounds** — any photo, for one chat or all of them
- **Live Wallpapers** — Rain on Glass, Ambient Aurora, Lava Lamp, Night Sky, Fireplace, Ocean, Living Sky, Snowfall, Fireflies, Deep Space, Fairy Lights and Liquid Colour
- **Colour themes** — per conversation or for all chats

### Contacts and People

- **Private address book** — each person has their own contacts, with vCard import
- **My Card and Shared Name and Photo** — choose how you appear to everyone else
- **People Map** — where everyone is, from their Home Assistant person, with Find Me
- **Zones** — create Home Assistant zones straight from the map, Check In and shared locations

### AI Features

All optional, and each can be switched off individually in the editor:

- **Chat with Home Assistant** — ask questions or control your home by message, or by replying to a notification
- **Suggested Replies** — short replies to the latest message, ready to tap
- **Writing Tools** — Proofread, Make Friendlier, Shorter, More Formal or More Casual
- **Catch Up** — the gist of several unread messages in a sentence or two
- **Translate** — any message, into the language your phone uses
- **Add to Calendar and Reminders** — turn a message into an event or a to-do
- **Ask This Chat** — ask a question about a conversation and see the messages the answer came from
- **Photo Descriptions** — a description of any photo, for anyone who can't see it

### Integration

- **Phone notifications** — through the Companion app on iPhone and Android, with Reply right from the notification
- **App icon badge** — optional and off by default: a red number on the Home Assistant app's icon on iPhone and iPad showing unread messages (muted chats aren't counted), kept up to date even when you read a chat on another device. On Android, notifications for chats you've read are cleared, so the app's dot goes away
- **Focus aware** — see when someone has notifications silenced, and choose Notify Anyway
- **`crow_messenger.send_message` action** — send messages, photos and buttons from your automations
- **`crow_messenger_message_received` event** — build automations around new messages
- **`crow_messenger_action` event** — fired when someone taps a button sent by an automation
- **Household settings** — how long messages are kept, the largest attachment, notifications, link previews and more
- Runs entirely on your own Home Assistant — no cloud service of its own

---

## Actions and Events

### Actions

| Action | Description |
|--------|-------------|
| `crow_messenger.send_message` | Sends a message from Home Assistant to one or more people, optionally with a photo or file and buttons. `to` takes names, user IDs or `person.` entities; `group_name` sends to a named group; `actions` adds buttons (a title, or a `title` and `action`) |

> **Attachments** can be under `/local/` (your `www` folder), `/media/local/`, or any folder listed in `allowlist_external_dirs`. The file is copied into Crow Messenger's own private folder when it's sent.

### Events

| Event | Description |
|-------|-------------|
| `crow_messenger_message_received` | Fired for every new message, with `thread_id`, `message_id`, `sender_id`, `sender_name`, `recipient_ids`, `is_group` and `has_attachment`. The message text is only included for chats with Home Assistant itself, so everything else stays private |
| `crow_messenger_action` | Fired when someone taps a button under a message sent by an automation, with `action`, `title`, `thread_id`, `message_id`, `user_id` and `user_name` |

---

## Automation Examples

### Send a photo when the doorbell rings

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
      actions: ["Unlock", "Ignore"]
```

### Do something when a button is tapped

```yaml
alias: Unlock from Crow Messenger
triggers:
  - trigger: event
    event_type: crow_messenger_action
    event_data:
      title: Unlock
actions:
  - action: lock.unlock
    target:
      entity_id: lock.front_door
```

### Send to a group

```yaml
actions:
  - action: crow_messenger.send_message
    data:
      to: ["James", "Sarah", "Keeva"]
      group_name: Family
      message: "Dinner's ready!"
```

---

## Quick Start

```yaml
type: custom:crow-messenger-card
card_height: fill
card_liquid_glass: true
appearance: auto
glass: 50
glass_bars: true
glass_popups: true
animations: true
default_skin: ""
show_people_map: true
```

> **Note:** Everything above can be set from the visual editor. Household settings (how long messages are kept, notifications, AI and so on) are stored by the integration and set from the editor by an administrator.

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `card_height` | `700` | Height in pixels, or `fill` to fill the screen |
| `card_liquid_glass` | `true` | `true` for Glass, `false` for Classic |
| `appearance` | `auto` | `auto`, `light` or `dark` |
| `use_ha_theme` | `false` | Use your Home Assistant theme's background and text colours |
| `glass` | `50` | Glass amount, `0` (clear) to `100` (frosted) |
| `glass_bars` | `true` | Liquid Glass on the top and bottom bars |
| `glass_popups` | `true` | Liquid Glass on menus, popups and sheets |
| `default_skin` | *(iPhone)* | The skin everyone starts with; each person can choose their own |
| `animations` | `true` | Slide between screens and animate sheets and popups |
| `effect_words` | `true` | Words like "Happy Birthday" send an effect automatically |
| `contact_blur` | `true` | Blur behind contact photos |
| `contact_sort` | `last` | Sort contacts by `first` or `last` name |
| `contact_display` | `first` | Show contacts as First Last or Last, First |
| `show_my_card` | `true` | Show My Card at the top of Contacts |
| `show_people_map` | `true` | The People Map in Contacts and Find Me in conversations |
| `pdf_enabled` | `true` | Export as PDF |
| `enter_sends` | `true` | On a computer keyboard, Return sends and Shift+Return starts a new line |

### Household Settings (in the editor, administrators only)

| Setting | Default | Description |
|---------|---------|-------------|
| Keep Messages | 30 Days | Messages and attachments older than this are deleted for everyone |
| Largest File Attachment | 300 MB | The biggest photo, video or file anyone can send |
| Delete Photos & Files from the Server | 90 Days | Clears out older attachments when you choose |
| One Dashboard for Everyone | On | Every notification opens the same dashboard |
| App Icon Badge | Off | A red number on the Home Assistant app's icon showing unread messages |
| AI Features | Off | Turns on the AI features for everyone |

---

## Troubleshooting

**The card doesn't appear in the card picker**
- Make sure the integration has been added under **Settings → Devices & Services** — the card is loaded by the integration.
- Hard-refresh your browser, or close and reopen the Home Assistant app on your iPhone.

**Notifications don't arrive**
- Check the person has the Home Assistant Companion app installed and signed in as their own user.
- Check **Notifications** is switched on in the editor's household settings, and that the person's device is ticked.
- If someone has a Focus on, their messages are delivered quietly — the sender sees **Notify Anyway**.

**Notifications open the wrong dashboard**
- With **One Dashboard for Everyone** on, enter the dashboard's path underneath it. Until a path is entered, each person's own dashboard choice is used.

**Location, Check In and Find Me don't work**
- Each person needs a Home Assistant person linked to their user, with a location from the Companion app.

**AI features are missing**
- Check **AI Features** is switched on in the editor — AI is off by default, and its menu entries are hidden until it's on.
- Check an AI Task is set up in Home Assistant, or chosen in the editor. Only Chat with Home Assistant works without one.

**A photo or file won't send**
- Files must be under the **Largest File Attachment** size set in the editor (300 MB by default).

---

## Credits & Acknowledgements

- The [Home Assistant](https://www.home-assistant.io) team
- All users who test, report issues and suggest improvements
- My Loving Wife for her endless support

---

## License

MIT License — free to use, modify and distribute.

---

## Support

If this is useful to you, please **star the repository** and share it with the community!

For bugs or feature requests, use the [GitHub Issues](../../issues) page.
