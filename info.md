# Crow Messenger

Crow Messenger is a Home Assistant integration and Lovelace card for private messaging between the people in your home. Designed with an **iPhone Messages** look and feel, the card gives you one-to-one and group chats with photos, videos, files, replies, tapbacks, effects, polls and games — while the integration keeps every conversation on your own Home Assistant server, sends phone notifications through the Companion app and lets your automations send messages too.

It also has a **Feed**: a private, Facebook-style social feed for your household — every post seen only by the people you share it with.

And, when an administrator switches it on, **Email**: each person's own iCloud, Gmail, Yahoo, Outlook or other email accounts in the card, sharing the same contacts book and app icon badge as Messages.

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
- **Private Contacts** — each person's own address book, with vCard import; a household member's card also links to their Feed profile, latest post and photos, your chats, Hide Alerts and Ring Phone
- **People Map** — where everyone is, with Find Me and zones, and for each person how long they've been there, the weather there, what they're doing, Focus, charging and Wi-Fi, plus Find Nearby for places around them, with saved places kept on the map

## Feed (Social Media)

On by default, and can be switched off in the editor.

- **Private Posts** — share with everyone at home, chosen people, only you, or a group
- **Post on Someone's Page** — shows on their profile, and they can hide or delete it
- **Photos, Videos, Feelings, Places, @Mentions and Photo Tags**, with link previews and coloured backgrounds
- **Reactions and Comments** — Love, Like, Haha, Wow, Sad and Angry, with replies, photos and stickers
- **Stories** that disappear after 24 hours
- **Photos and Videos** grids, **Profiles**, **Groups** and shared **Albums**
- **Polls, Events with RSVPs and reminders, Chip In and Up for Grabs**
- **Pin, Save, Edit, Schedule and Drafts**
- **Press and hold a photo or video** — save, send, add to an album, see who watched it, select several, or delete it from the server
- **Birthdays, Milestones, On This Day and Year in Review**
- **More like Facebook** — Intro and featured photos, Story Highlights, Archive and Manage Posts, Share a post, Ask for Recommendations, Lists, Share from Home, story reactions, replies and stickers, Waves, weekly badges, Saved Collections, Quiet Mode and comment sorting
- **Cover photos and profile photos like Facebook** — add and reposition a cover photo, and change your profile photo from your profile; it updates everywhere at once
- **Send a post to a chat**, **Hide someone for 30 days** and an **Activity Log** laid out like a Facebook wall
- **Buttons on Feed notifications** — react, comment, reply, save, answer an event, vote, claim, write on a birthday card or leave a group, right from the notification
- **Posts follow Keep Messages**
- **The Crow Feed card** — the Feed on its own, or a photo slideshow for a wall tablet
- **An app bar** — the same capsule at the top left of Messages, Contacts and the Feed, for switching between them in one tap
- **A Facebook-style navigation bar** — Home, Videos, Groups, Events, Notifications and Menu along the bottom, frosted glass or solid to match your Bars Liquid Glass setting
- **Notifications** — reactions, comments, replies, tags, mentions and posts on your page, with a red count; swipe to mark read or remove, turn off a post, filter, Clear All and Recently Removed
- **Favourites** — a row at the top of Contacts, first when choosing who to message, and a Favourites filter on Messages
- **Startup Screen** — open the card on Messages (the default), Contacts, the Feed, or straight to the Feed's Videos, Groups, Events or Notifications

## Email (Optional)

Off until an administrator switches it on (the card editor's Email page). Each person adds their own iCloud, Gmail, Yahoo, Outlook / Microsoft 365 or other IMAP accounts and reads and writes email from the Email button in the app bar.

- **One contacts book** — the same Contacts as Messages; tap an email address on a contact to write to them
- **One app icon badge** — unread email is added to the App Icon Badge, and the Email button gets a red dot
- **Follows the card** — light and dark, Liquid Glass, the Home Assistant theme, the accent colour and full screen, with every mail skin kept (or the one matching your card skin)
- **Notifications, sensors, actions and events** for every account, plus Ask Your Email in Assist
- **Works with the rest of the card** — recent emails on contact cards, send an email to a chat or the Feed, ask Home Assistant about your email, one What Did I Miss? and one search across Messages, the Feed and Email

## AI Features

All optional, and each can be switched off individually:

- **Chat with Home Assistant** — ask questions or control your home by message
- **Suggested Replies** and **Writing Tools**
- **Catch Up** — the gist of several unread messages
- **Translate** — any message, into your phone's language
- **Add to Calendar and Reminders**
- **Ask This Chat** — ask a question about a conversation
- **Photo Descriptions**
- **Link Safety** — a warning on links in chats and the Feed that look like scams
- **In the Feed** — Writing Tools, Suggest a Caption, Suggested Comments, Make It an Event or Poll, Album Names, Make an Album, What Did I Miss?, Catch Up on Comments, Translate, Photo Descriptions, Photo Search (off until switched on), Memory Captions, a Kindness Check before posting and Ask the Feed

## Integration

- **Phone Notifications** — through the Companion app, with Reply from the notification
- **App Icon Badge** — optional: a red number on the app's icon showing unread messages
- **Notification Buttons** — Tapbacks, Mark as Read, Hide Alerts, and I'm Home or On My Way
- **Richer Notifications** — the sender's photo, stickers, link previews, maps and live camera views
- **Share to Crow Messenger** — tap Share in any app on your phone, choose Home Assistant, then **Send in a Chat** or **Post on a Page** in the Feed
- **Sensors for each person** — Unread messages, Latest message, New messages, New posts, Feed notifications, Last seen, Typing, Viewing, Waiting on reply, Pending reminders, Sharing live location, Last post, Birthday today, Needs my attention, Unread mentions, Quiet mode, Active now and Phone ringing (who sent what, never what it says)
- **Household sensors** — Messages today, Storage used, Next event, Next birthday, Active chats and People online
- **More events** — reactions, Feed comments, chats being read and Ring Phone answered
- **`crow_messenger.send_message` action** — send messages, photos and buttons from automations
- **`crow_messenger_message_received` event** — for automations around new messages
- **`crow_messenger_action` event** — when someone taps a button sent by an automation
- **`crow_messenger.post` action** and **`crow_messenger_post_created` event** — post in the Feed from automations
- **Opens Quickly** — larger features are fetched the first time they're used
- **Erase Everything** — administrators can wipe every chat, contact, post, photo, video and file from the server and start again as if just installed (or delete just some of it), with a backup first; removing the integration removes its data too

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
      to: ["person1", "person2"]
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
