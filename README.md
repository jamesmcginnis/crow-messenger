# Crow Messenger

Crow Messenger is a Home Assistant integration and Lovelace card for private messaging between the people in your home. Designed with an **iPhone Messages** look and feel, the card gives you one-to-one and group chats with photos, videos, files, replies, tapbacks, effects, polls, games and much more — while the integration keeps every conversation on your own Home Assistant server, sends phone notifications through the Companion app and lets your automations send messages too.

It also has a **Feed**: a private, Facebook-style social feed just for your household, with posts, photos, videos, stories, groups, albums, events and more — every post seen only by the people you share it with.

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

> **Tip:** Crow Messenger works best on a dashboard of its own — choose **Fill the screen** for Card Height and use a **Panel** view. On any other dashboard, tap the **Full Screen** button beside Contacts and Filter on the Messages screen to give the card the whole screen.

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
- **Press and hold a conversation** — Mark as Read or Unread, Pin, Hide Alerts (for 1 hour, 8 hours, a week or always), Call (FaceTime, FaceTime Audio or a phone number from their contact card), Location (Find Me, or Find in a group, and Ask Where They Are), Details, Search in Conversation, Export as PDF, Add to Contacts (for someone who isn't in your address book yet), Archive, Leave Conversation (groups) and Delete, in a menu that matches your skin and light or dark mode
- **The conversation's ••• menu** — Details, Search & Ask, Export as PDF, Find Me, Ask Where They Are, Pin, Hide Alerts, Mark as Unread, Background, Skin, Archive, Leave Conversation (groups) and Delete, without going back to the list
- **Select Messages** — tick several messages, then copy, forward or delete them together
- **Select Conversations** — from the Messages ••• menu, to archive, delete or mark several chats as read at once
- **One-to-one and group chats** — group names and photos, mentions, nicknames and member management
- **Photos, videos and files** — up to 300 MB each by default, stored on your Home Assistant server
- **Replies, tapbacks, edits and Undo Send** — press and hold any message for the full menu, which also has Share where the browser offers a share sheet
- **Photo viewer** — save a photo, copy it, or set it as the background for one chat or all of them
- **Instant when you come back** — your conversations, the newest messages of your recent chats and photo thumbnails are kept on your device, so opening the card or coming back to the app shows them straight away, then quietly fetches anything new. Each person's copy is separate, and it is cleared when someone else signs in on that device
- **Bubble and screen effects** — Slam, Loud, Gentle, Invisible Ink, Fireworks, Confetti, Balloons and many more
- **Text formatting** — bold, italic, underline and strikethrough
- **Stickers and Sketch** — make stickers from photos, or draw and send a sketch
- **Read receipts and typing indicators**
- **Send Later** — at a time you choose, or when you arrive at or leave a place
- **Disappearing messages** — press and hold Send to send one that disappears
- **Pinned conversations, pinned messages and starred messages**
- **Archive** — tidy chats away, with a confirmation first; they come back when a new message arrives, unless you keep them archived
- **Remind Me Later** — be reminded about any message at a time you choose
- **Send a Nudge** — a friendly follow-up, worded to suit the message
- **Search** — across every conversation, or within one, with filters for photos, links, files and locations
- **Export as PDF** — a conversation, a contact or your whole address book, then download it or send it straight into one or more conversations
- **Drafts** — whatever you've typed is kept when you leave a conversation
- **Reopens your last chat** — come back to the app and you're where you left off

### Add to a Message

- **Polls** — with live results, in one-to-one and group chats
- **Check In** — let people know when you arrive, or be told if you haven't
- **Where Are You?** — ask someone to share their location just once
- **Ring Phone** — make someone's phone ring loudly, even on silent, until they tap I've Found It. Handy for finding a lost phone or reaching someone who isn't replying. In a group you choose whose phone to ring, or everyone's
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
- **Full Screen** — a button beside Contacts and Filter on the Messages screen makes the card fill the whole screen, and every screen fills it with you. Tap it again, or press Escape, to put the card back on the dashboard. It matches whichever skin you've chosen, and in the old-style window skins it's the title bar's Maximise button (the green zoom light in Mac OS X Aqua). Turn on Open in Full Screen in the editor and the card fills the screen as soon as it opens; otherwise it always opens at its normal size

### Contacts and People

- **Private address book** — each person has their own contacts, with vCard import
- **My Card and Shared Name and Photo** — choose how you appear to everyone else
- **Who voted in a poll** — small photos of who chose each option (yours first, then +N), in chat polls and Feed polls; tap a photo for that person's profile, or +N for everyone. Turn on **Anonymous Poll** when making one and only the totals show — nobody, not even whoever made it, is told who chose what
- **Favourites** — Add to Favourites on a contact card (a ★ shows by their name). Favourites get a row of photos at the top of Contacts (tap to message, press and hold for Message, Call or Contact Card), come first in New Message, Forward and Send to a Chat, and have their own filter on Messages. Adding a favourite offers once to pin your chat with them
- **People Map** — where everyone is, from their Home Assistant person, with Find Me. Tap someone to see their address, how long they've been there, the weather where they are, what they're doing (walking, driving and so on), whether Focus is on, their battery and whether it's charging, and the Wi-Fi network they're on, from the Companion app's sensors on their phone. People in the same place sit side by side on the map
- **Find Nearby** — optional and off by default: toilets, cafés, restaurants, pubs, cash machines, pharmacies, supermarkets, petrol stations, EV chargers or parking near someone, or near the middle of the map, from OpenStreetMap. Each place shows its address, opening hours, phone and website (both ask before calling or opening), and wheelchair access, with Directions, Share (in a chat or through the share sheet) and Add Zone. Distances are from the person you're looking at. Closing a search stops it straight away
- **Saved places** — places Find Nearby has found are remembered on each device for a week, two weeks or a month, and stay on the map as small pins you can tap to open without searching again. Press and hold a pin for Directions, Share or Remove from Map. The map style menu can show, hide or clear saved places
- **Zones** — create Home Assistant zones straight from the map, Check In and shared locations
- **A household member's contact card** also shows whether they're **Active now**, a **Feed** button, their **Feed profile** with their latest post and recent photos, **Post on Their Page**, their **birthday from the Feed** (with Write on the Card on the day), your **chats** with them (with unread counts), **Shared in Chats**, **Hide Alerts** and **Ring Phone**. Only posts and photos shared with you are ever shown, and nothing from the Feed shows when the Feed is switched off. Other contacts are unchanged. Switch it off in the editor (This Card → Contacts & People → Feed and Chats on Contact Cards)


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

**In the Feed** (each with its own switch under **Household → AI → Feed**):

- **Writing Tools** — the ✨ button in the composer and the comment box
- **Suggest a Caption** — a few captions for the photos you've just added
- **Suggested Comments** — short comments to tap, in any post
- **Make It an Event or Poll** — a post that mentions a day and time, or asks "this or that?", offers to become an event or a poll, filled in for you
- **Album Names** — Edit an album → Suggest a Name
- **What Did I Miss?** — a catch-up card at the top of the Feed when several posts came in while you were away
- **Catch Up on Comments** — the gist of a long comment thread
- **Translate** — posts and comments, into the language your phone uses
- **Photo Descriptions** — a Describe button in the Feed's photo viewer
- **Photo Search** — search Photos by what's in them ("beach", "cake"). **Off until you switch it on**: new photos are described in the background as they're posted, so every new photo goes to the AI
- **Memory Captions** — a short caption for On This Day memories, and a suggested caption for posts waiting for review
- **Kindness Check** — a gentle "Post This?" before something that could come across as harsh, with **Edit** or **Post Anyway**. It never blocks: if the AI is slow, the post goes out
- **Ask the Feed** — Feed ••• → Ask the Feed answers questions like "When is the BBQ?" from posts shared with you, with links to them

Only posts and photos the person using the feature can see are ever sent to the AI.

### Feed (Social Media)

A private social feed for the people in your home. It's **on by default** and can be switched off in the editor (**Feed (Social Media)**, household settings). Get around with the **app bar** — the same capsule at the top left of Messages, Contacts and the Feed: Messages, Contacts and Feed, with the one you're on highlighted, then Full Screen (and Filter on Messages). It works like tabs: switching never piles up screens behind you. A red dot on Messages means a chat has unread messages (muted chats aren't counted), and on the Feed that there are new posts or notifications.

- **A navigation bar along the bottom, like Facebook's** — Home, Videos, Groups, Events, Notifications (with a red count) and Menu (your picture). Tap the tab you're on to jump back to the top. With **Bars Liquid Glass** on it floats as a frosted-glass capsule; with it off, or with a skin, it's a solid bar along the bottom that follows the skin. It can be switched off in the editor (**Feed Navigation Bar**, under Layout), which brings back the row of buttons at the top
- **Notifications** — like Facebook's bell: reactions and comments on your posts, replies and reactions to your comments, photo tags, @mentions, posts on your page, birthday cards, claims, Chip Ins and being added to a group. Several people doing the same thing are one line (“person2 and 2 others reacted to your post”), new ones are highlighted until you open them, and a tap opens the post. Only posts you can see are ever listed
  - **Swipe a notification** like a chat: right for **Mark as Read / Unread**, left for **More** and **Remove** (a long swipe removes it, with Undo). Press and hold for the same as a menu. **More** has Turn Off Notifications for This Post, Turn Off [kind] Notifications (the same switch as Feed Settings) and Hide [name] for 30 Days
  - **The ••• menu** on Notifications: Mark All as Read, Show (All, Unread, Reactions, Comments and Replies, Mentions and Tags, Posts on Your Page, or Birthdays, Groups and More), Turned Off Posts, Recently Removed (put back anything removed or cleared in the last 30 days), Notification Settings and **Clear All** (asks first)
  - Removed, cleared, read and turned-off notifications are remembered by Home Assistant, so they're the same on every device. Something new on a post (another reaction, a new comment) brings its notification back
- **Menu** — your profile, then Activity Log, Saved, Photos, Albums, Add to Story, New Post, Feed Settings and Messages
- **More like Facebook** — each can be switched off under Household → Feed in the editor:
  - **Intro and Featured Photos** — a short bio and details on your profile (where you work, your pets…), each for **Everyone** or **Only Me**, and up to nine featured photos (each only shows to people who can see the post it's from)
  - **Story Highlights** — keep stories on your profile after the 24 hours, as named circles. Tap **+ New** on your profile, tick the stories you want (numbered in the order you pick), then name it and choose a cover. Or open one of your stories and tap **Highlight**. Each keeps the audience its story had; press and hold one to add stories, rename or delete it. The row only shows on your profile once you've posted a story
  - **Story Archive** — after its 24 hours each story is kept privately for the person who posted it, so it can go into a highlight later. Only they can see it. It follows Keep Posts (up to 300 stories each); switching it off in the card editor empties everyone's archive. A story you delete yourself isn't archived
  - **Archive** — ••• → **Move to Archive** hides a post from everyone without deleting it (with Undo); Menu → **Archive** to restore it. **Manage Posts** on your profile selects several at once to Archive, Delete or change who can see them
  - **Share a post** — a **Share** button: **Share Now**, **Write Post** (your own words above it) or **Send in a Chat**. The original only shows inside the share to people who can already see it, and whoever posted it is told
  - **Ask for Recommendations** — a post type for "Anyone know a good plumber?". People tap **Recommend Someone** to put a contact from their Contacts in a comment (name, company, phone, email and website only); everything recommended is gathered on the post, and anyone can **Save** it to their own Contacts
  - **Lists** — a checklist post people tick off together, optionally kept in step with a Home Assistant to-do list both ways
  - **Share from Home** — a button in New Post for a camera snapshot, a sensor, a chart of the last day or the weather, as it is right then
  - **Story reactions, replies and stickers** — react to a story or reply to it (replies arrive in Messages, quoting the story); add a poll, a question, a countdown, a mention, a place, the weather or the time to your story. Only you see the answers to your question and who reacted
  - **Waves** — 👋 Wave on someone's profile; they get a notification with a **Wave Back** button
  - **Weekly badges** — Top Photographer, Conversation Starter, Biggest Supporter, Most Helpful, Early Bird, Night Owl and Event Planner, in a post on Sunday evenings and on profiles. Only posts shared with everyone count
  - **Saved Collections** — ••• → **Save to Collection** sorts saved posts into folders
  - **Friends** — every profile shows "N friends" under the name and a Friends box like Facebook's: photos and names of everyone else at home (on yours, favourites first). **See All** opens a searchable list with a Message button on each; tap anyone to open their profile. Switch off with **Friends on Profiles** in the card editor
  - **Quiet Mode** — Feed Settings → pause Feed notifications for a while or every night, optionally hiding the red dots too. The bell still counts them; messages aren't affected
  - **Comment sorting** — Most Relevant, Newest or All Comments on a post
  - New notification switches in Feed Settings for Shares, Waves and Stories
- **New post notifications** — by default everyone is told about every new post shared with them (**Every New Post**). An administrator can change the household default under Household → Feed → **New Post Notifications** to Important Only (events, polls, Up for Grabs, Chip In, lists and posts from their Favourites) or Nothing, and each person can change theirs in Feed Settings
  - **Get Notified** — the bell on someone's profile: Off, Their Posts, or Their Posts and Stories
  - Several posts from the same person within five minutes become one notification ("person2 posted 3 times") instead of a buzz each time
  - Buttons on the new kinds: tick items off a list or add one, Recommend Someone, Open Original on a shared post, and Love or Comment on a new profile or cover photo
  - In **Quiet Mode**, notifications are held back; when it ends, one "While you were quiet" notification says how many, and opens the bell. Muted posts and hidden people are never notified
- **Cover photos and your profile photo, like Facebook** — on your own profile, the camera on the banner adds a **cover photo** (Upload Photo, Reposition by dragging it up or down, View Photo, Remove), and the camera on your picture changes your **profile photo** (Choose Photo, Take Photo, Use My Home Assistant Picture, View Photo) with a Move and Scale step to frame it. A new profile photo shows straight away everywhere — chats, contacts, the Feed, comments and notifications, on everyone's card — and switches on Shared Name and Photo for you; your own contact card gets it too. Either can be shared to the Feed as a post. Cover photos are kept on the server like other photos (resized to about 1600px, the old one deleted when you change it), show behind the person's photo on their contact card, and can be switched off in the editor (**Cover Photos**, under Household → Feed). Tap anyone's cover or profile photo to see it full screen

- **Private by design** — every post is shared with **Everyone at home**, **Chosen people**, **Only me** or a **group**. Only those people see the post, its photos and videos, its comments and who reacted, and only they are ever notified about it. The audience can be changed after posting
- **Link previews like Facebook** — paste a link and a preview of the page appears as you write (tap ✕ to leave it off); in the Feed it shows the page's picture across the post with the site, title and description, and the link itself isn't repeated in the words. If a site doesn't answer at first, the preview is tried again later
- **Videos play straight away** — they stream as they play instead of downloading first
- **Posts** — words, up to 20 photos and videos, link previews, a feeling or activity, a place (check in at a Home Assistant zone), @mentions, and coloured backgrounds for short posts that follow your theme
- **Post on someone's page** — like Facebook: it shows on their profile as “person1 ▸ person2” and they're told about it. It's always shared with them (and whoever else you choose), and they can hide it from their page or delete it. Every profile has **Post on Their Page**
- **Tag people in photos** — tap where someone is; they're told, can see it in their Photos, and can remove the tag
- **Reactions** — Love, Like, Haha, Wow, Sad and Angry (press and hold Like), and see who reacted with what
- **Comments** — with replies, @mentions, a photo or a sticker, reactions on comments, edit and delete
- **Who can comment** — everyone who can see the post, or only people you choose
- **Stories** — photos, videos or words that disappear after 24 hours, with who's seen yours and replies straight to a chat
- **Photos and Videos** — every photo and every video shared with you, in their own grids, for the whole household and on each person's profile
- **Press and hold a photo or video** (in Photos, Videos, a profile or an album) for a menu with a preview playing above it: Go to Post, Save, Send in a Chat, Save for Later, Copy Link, Add to Album, Make Album Cover, Who Can See This, Remove Tag of Me, Details (who posted it and when, length, size, who it's shared with, and how many people have watched it — and, for whoever posted it, who), Select… (tick several to save or delete together) and **Delete**
- **Delete a photo or video** — only the person who posted it, or an administrator. After a confirmation it's deleted for everyone and its file is removed from Home Assistant. If it was all the post had, you're told the post goes too
- **Profiles** — each person's posts, photos, videos, albums and events (only what they've shared with you)
- **Groups** — smaller spaces like “Parents” or “Garden”, with their own members and posts
- **Albums** — named albums that several people can add to, with their own audience
- **Polls**, **Events** (Going, Maybe, Can't Go, reminders and Add to Calendar), **Chip In** (a pot for a shared present — totals for everyone, who gave what only for the organiser) and **Up for Grabs** (a Claim It button, first come first served)
- **Pin a post** to the top of the Feed, **Save** posts for later, **Edit** with edit history, **Schedule** posts, and **drafts** that are kept if you leave
- **Birthdays** — share your birthday and a birthday card post appears on the day for everyone to write on
- **Milestones and anniversaries** — “Moved into the house”, marked on the day for the people you choose
- **On This Day** and a **Year in Review** of the household's most-loved photos on 31 December (only photos from posts shared with everyone)
- **Send to a chat** — a post can be sent into a conversation as a card, when everyone in it can already see the post
- **Share to the Feed** from your phone — **Post on a Page** on the notification, or **Post on a Page instead** on the Send To sheet
- **Hide someone's posts for 30 days**, without them knowing
- **Activity Log, laid out like a Facebook wall** — your photo and name at the top with a count of your posts, comments, reactions and photos of you, then a timeline by month: your posts and posts on your page in full, “You commented on person2's post” with your comment, “You reacted ❤️ to…”, “person2 tagged you in a photo” and “person3 mentioned you”, each with the post itself so you can react and comment right there. Filter by Your Posts, Comments, Reactions, Photos of You, Mentions or On Your Page, and use ••• on a story to go to it, delete your comment, remove your reaction or remove a tag. Only you can see it
- **Notifications** for posts on your page, comments, reactions, @mentions, tags, groups, events and birthdays — each switched on or off in Feed Settings — and optionally every new post
- **Buttons on Feed notifications** — press and hold one to answer without opening the card:
  - **Posts, @mentions, tags and posts on your page** — ❤️ Love, 👍 Like, Comment (type it in the notification) and Save, plus 😂 Haha and 😮 Wow on iPhone, and optionally Hide [name] for 30 Days
  - **Comments and replies** — Reply (goes under their comment), and Like or Love their comment
  - **Events** — Going, Maybe or Can't Go, and **On My Way** on a reminder
  - **Polls** — a button for each choice (the first three on Android)
  - **Up for Grabs** — Claim It
  - **Birthdays** — Write on the Card, or 🎂 Celebrate
  - **Added to a group** — Leave Group
  - Reactions on your own posts have no buttons — a tap opens the post

  Each button only does what that person could do in the card — no buttons on posts they can't see, no Comment where they can't comment, and Claim It disappears once it's claimed. A button marks that post as seen and clears the notification. Android shows three buttons at most. Each kind can be switched off in the editor (**Feed Notification Buttons**)
- **Posts follow Keep Messages** — posts, their photos, videos and comments are deleted on the same schedule as messages. Stories always go after 24 hours
- **The Crow Feed card** — the Feed on its own on a dashboard, or as a photo slideshow for a wall tablet

### Integration

- **Phone notifications** — through the Companion app on iPhone and Android, with Reply right from the notification
- **App icon badge** — optional and off by default: a red number on the Home Assistant app's icon on iPhone and iPad showing unread messages (muted chats aren't counted), kept up to date even when you read a chat on another device
- **Notification buttons** — press and hold a notification for Reply, Tapbacks (Heart, Thumbs Up and Ha Ha), Mark as Read, Hide Alerts for 1 Hour, and I'm Home or On My Way. Each can be switched on or off in the editor. Android shows three at most: Reply, Mark as Read and Thumbs Up
- **Richer notifications** — the sender's photo, or what was sent: a photo or video, a sticker, a link's preview image, a map of a shared place, or the live view of a shared camera. One-to-one chats show a note such as "Sent with Slam" or "Replied to …", and a stack of notifications says how many more messages there are
- **Share to Crow Messenger** — tap Share in any app on your phone and choose Home Assistant. A "Send link to…" notification appears; tap it and Crow Messenger opens on a Send To list where you pick one or more chats (or start a new one), add a comment if you like, and tap Send. The link arrives with its preview. Nothing is sent until you choose, and Discard throws it away. Works on iPhone, iPad and Android with the Companion app; on iPhone, anything typed in the share box becomes the comment. Links and text only (not photos or files), and a shared link waits for 24 hours
- **Cleared once read** — when you read a conversation anywhere, its notifications are removed from all your phones and tablets
- **Focus aware** — see when someone has notifications silenced, and choose Notify Anyway
- **Ring Phone alerts** — sent as a critical alert on iPhone and on the alarm channel on Android, so they sound even on silent. The ring repeats every 30 seconds and stops when they tap I've Found It, when you tap Stop Ringing, or after six rings, and you're told whether they found it
- **Sensors for each person** — Unread messages, Latest message, New messages, New posts, Active now and Phone ringing (who sent what, never what it says)
- **`crow_messenger.send_message` action** — send messages, photos and buttons from your automations
- **`crow_messenger.post` action** — post in the Feed from your automations, to everyone, chosen people or a group
- **`crow_messenger_post_created` event** — fired when a post appears in the Feed (who posted, never what it says)
- **`crow_messenger_message_received` event** — build automations around new messages
- **`crow_messenger_action` event** — fired when someone taps a button sent by an automation
- **Household settings** — how long messages are kept, the largest attachment, notifications, link previews and more
- **Opens quickly** — Export as PDF, Games, Live Wallpapers, the People Map and the Feed are fetched the first time they're used, so the card itself is smaller and opens faster
- Runs entirely on your own Home Assistant — no cloud service of its own

---

## Share from Your Phone

Share a link from any app on your phone — Safari, Chrome, YouTube, News — either into a chat or onto someone's page in the Feed:

1. Tap **Share** and choose **Home Assistant** (on iPhone, tap **Post** in the small box that appears — anything you type there comes along as your comment)
2. A notification arrives on that phone. Press and hold it to choose:
   - **Send in a Chat** — Crow Messenger opens on **Send To**: pick one or more chats, or someone you haven't messaged yet, add a comment if you like, and tap **Send**
   - **Post on a Page** — the Feed opens on **New Post** with the link filled in. Choose **Your Page** or someone else's, who can see it, and tap **Post**
   - **Discard** — throws it away
3. Tapping the notification itself opens the Feed if the card's **Startup Screen** is one of the Feed screens, and Messages otherwise. Either way the other is one tap away: **Post on a Page instead** on the Send To sheet, or **Send in a Chat instead** on New Post

The link arrives with its preview. Nothing is sent or posted until you choose, so things you share to Home Assistant for other reasons never end up anywhere. Links and text can be shared (not photos or files), and a shared link waits for 24 hours. With the Feed switched off, only **Send in a Chat** is offered. Sharing can be switched off in the editor with **Share to Crow Messenger**.

---

## Sensors

Each person in your home is a device, **Crow Messenger (Name)**, with these entities:

| Entity | Description |
|--------|-------------|
| Unread messages | Unread messages in chats that aren't muted — the same number as the app icon badge. Attributes: how many `conversations` they're in, and how many are `in_muted_conversations` |
| Latest message | Who last sent them a message. Attributes: the `conversation`, whether it `is_group`, when it was `received`, its `kind` (`text`, `photo`, `video`, `file`, `poll`, `location`, `ring` and so on), whether it's still `unread`, the `thread_id` and the `sender_id` |
| New messages | On while they have unread messages in chats that aren't muted |
| Active now | On while they have the card open and on screen. Unknown for anyone who has switched off showing their activity |
| Phone ringing | On while someone is using Ring Phone on their phone, with who `rung_by` |
| New posts | How many posts in the Feed are shared with them that they haven't seen yet |
| Feed notifications | The red number on their Feed bell: reactions, comments, tags and mentions they haven't seen |
| Last seen | When they last had the card open (now, while they do). Unknown for anyone who hides their activity |
| Typing | On while they're typing in any chat (never which). Can be switched off in the editor |
| Viewing | What they have on screen: `messages`, `chat` (never which), `feed`, `contacts`, `other`, or `off` when the card's closed. Can be switched off in the editor |
| Waiting on reply | Chats (not muted) where someone's message has waited an hour or more for their reply, with `waiting_since` |
| Pending reminders | Remind Me Later and Send Later items waiting, with `remind_me_later` and `send_later` |
| Sharing live location | On while they're sharing a Live Location in a chat |
| Last post | When they last posted in the Feed, with `posts_this_week` |
| Birthday today | On all day on their birthday, if they share it in the Feed |

The household has its own device, **Crow Messenger (Household)**:

| Entity | Description |
|--------|-------------|
| Messages today | Messages sent in the house today, with `this_week` and `this_month` |
| Storage used | Space the photos, videos and files take on the server, with how many `files` and the `oldest` |
| Next event | When the next Feed event shared with everyone starts, with its `title`, how many are `going` and `maybe`, `location` and `post_id` |
| Active chats | Conversations with a message in the last 24 hours |
| People online | How many people have the card open, with their `names` (not counting anyone who hides their activity) |

> **What a message or a post says never goes into an entity**, only who sent it and in which chat, because anyone who can see your Home Assistant can see entities and their history.

People added to Home Assistant later get their own device straight away, and a person's device is removed when they're removed.

### Turn a light on when person3 messages

```yaml
alias: Message from person3
triggers:
  - trigger: state
    entity_id: sensor.crow_messenger_person1_latest_message
    to: person3
  - trigger: state
    entity_id: sensor.crow_messenger_person1_latest_message
    attribute: received
conditions:
  - condition: state
    entity_id: sensor.crow_messenger_person1_latest_message
    state: person3
  - condition: state
    entity_id: sensor.crow_messenger_person1_latest_message
    attribute: unread
    state: true
actions:
  - action: light.turn_on
    target:
      entity_id: light.study
    data:
      color_name: purple
```

---

## Actions and Events

### Actions

| Action | Description |
|--------|-------------|
| `crow_messenger.send_message` | Sends a message from Home Assistant to one or more people, optionally with a photo or file and buttons. `to` takes names, user IDs or `person.` entities; `group_name` sends to a named group; `actions` adds buttons (a title, or a `title` and `action`) |
| `crow_messenger.post` | Posts in the Feed, as Home Assistant (or as the person who ran the action). `message` is required; `attachment` adds photos or videos (one or a list); `to` limits who sees it (names, user IDs or `person.` entities — everyone by default); `group` posts in a Feed group instead; `background` gives a short post a coloured background |

> **Attachments** can be under `/local/` (your `www` folder) or `/media/local/`. Automations and administrators can also attach from any folder listed in `allowlist_external_dirs`; people who aren't administrators can only attach from `www` and the media folders, so private files such as `secrets.yaml` can never be shared. The file is copied into Crow Messenger's own private folder when it's sent.

### Events

| Event | Description |
|-------|-------------|
| `crow_messenger_message_received` | Fired for every new message, with `thread_id`, `message_id`, `sender_id`, `sender_name`, `recipient_ids`, `is_group` and `has_attachment`. The message text is only included for chats with Home Assistant itself, so everything else stays private |
| `crow_messenger_action` | Fired when someone taps a button under a message sent by an automation, with `action`, `title`, `thread_id`, `message_id`, `user_id` and `user_name` |
| `crow_messenger_post_created` | Fired when a post appears in the Feed, with `post_id`, `author_id`, `author_name`, `kind`, `audience` (everyone, people, me or group) and `has_media`. What it says is never included |
| `crow_messenger_reaction` | Fired when someone reacts, with `user_id`, `reaction`, `to_user_id` and `on` (`message` with `thread_id` and `message_id`; `post` or `comment` with `post_id` and `comment_id`) |
| `crow_messenger_post_comment` | Fired when someone comments in the Feed, with `user_id`, `post_id`, `comment_id`, `post_author_id`, `reply_to_user_id`, `has_photo` and `has_sticker`. What it says is never included |
| `crow_messenger_read` | Fired when someone reads a chat, with `user_id`, `thread_id`, `read_up_to`, `last_sender_id` and `with_home_assistant` — so an alert that repeats can stop once it's read |
| `crow_messenger_ring_answered` | Fired when someone taps I Found It after Ring Phone, with `user_id`, `rung_by_id`, `thread_id` and `message_id` |

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
      to: ["person1", "person2"]
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

### Post the doorbell photo in the Feed for the grown-ups

```yaml
actions:
  - action: crow_messenger.post
    data:
      message: "Parcel delivered 📦"
      attachment: /local/snapshots/doorbell.jpg
      group: Parents
```

### Send to a group

```yaml
actions:
  - action: crow_messenger.send_message
    data:
      to: ["person1", "person2", "person3"]
      group_name: Family
      message: "Dinner's ready!"
```

---

## Quick Start

```yaml
type: custom:crow-messenger-card
card_height: fill
start_view: messages
card_liquid_glass: true
appearance: auto
glass: 50
glass_bars: true
glass_popups: true
animations: true
fullscreen_button: true
start_full: false
default_skin: ""
show_people_map: true
feed_nav: true
```

> **Note:** Everything above can be set from the visual editor, which has two tabs: **This Card** (how this card looks and behaves on this dashboard — anyone who can edit the dashboard) and **Household** (saved in Home Assistant and used by everyone — administrators only). Search covers both tabs and jumps to the setting it finds, and the editor remembers which sections you left open.

### The Crow Feed card

The Feed on its own, for a dashboard of its own or a wall tablet:

```yaml
type: custom:crow-feed-card
mode: feed          # or slideshow
interval: 8         # seconds per photo (slideshow)
slideshow_days: 30  # photos from the last 7, 30 or 365 days (0 = everything kept)
card_height: fill
```

The Feed shows what's shared with whoever is signed in on that device. On a shared wall tablet, sign it in as a user that should only see posts shared with everyone.

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `feed_nav` | `true` | The Facebook-style navigation bar along the bottom of the Feed (frosted glass with `glass_bars` on, solid with it off) |
| `app_bar_items` | `[messages, contacts, feed]` | Which places are in the app bar at the top left, in order. One left out still shows on its own screen |
| `app_bar_filter` | `true` | The Filter button in the app bar on Messages |
| `app_bar_dots` | `true` | Red dots in the app bar for unread chats and new Feed posts or notifications |
| `feed_start_tab` | `feed` | The tab the Feed opens on: `feed` (Home), `videos`, `groups` or `events` |
| `feed_autoplay` | `false` | Videos in Feed posts play silently while they're on screen |
| `show_stories` | `true` | The Stories row at the top of the Feed |
| `show_memories` | `true` | On This Day at the top of the Feed |
| `contact_extras` | `true` | A household member's contact card shows their Feed, your chats with them, Hide Alerts and Ring Phone |
| `start_view` | `messages` | Startup Screen: `messages` (reopens the chat you were last in), `contacts`, `feed`, `feed_videos`, `feed_groups`, `feed_events` or `feed_alerts` (Notifications). The Feed screens need the Feed switched on, otherwise it opens on Messages. Back always goes to Messages |
| `resume` | `true` | Return to Where You Left Off: leave the dashboard or the app and come back to the same screens — the chat, Contacts, a profile (and its tab), a post, the Feed tab you were on — scrolled to where you were. After 12 hours away the Startup Screen is used instead; a notification you tap or a link still opens what it's about |
| `card_height` | `700` | Height in pixels, or `fill` to fill the screen |
| `card_liquid_glass` | `true` | `true` for Glass, `false` for Classic |
| `appearance` | `auto` | `auto`, `light` or `dark` |
| `use_ha_theme` | `false` | Use your Home Assistant theme's background and text colours |
| `glass` | `50` | Glass amount, `0` (clear) to `100` (frosted) |
| `glass_bars` | `true` | Liquid Glass on the top and bottom bars |
| `glass_popups` | `true` | Liquid Glass on menus, popups and sheets |
| `default_skin` | *(iPhone)* | The skin everyone starts with; each person can choose their own |
| `animations` | `true` | Slide between screens and animate sheets and popups |
| `fullscreen_button` | `true` | The Full Screen button beside Contacts and Filter on the Messages screen |
| `resize_btn_spin` | `true` | The Full Screen button gives a quick spin each time it's tapped |
| `start_full` | `false` | Open in Full Screen: the card fills the screen as soon as it opens (needs the Full Screen button on, and never happens while editing the dashboard) |
| `effect_words` | `true` | Words like "Happy Birthday" send an effect automatically |
| `contact_blur` | `true` | Blur behind contact photos |
| `contact_sort` | `last` | Sort contacts by `first` or `last` name |
| `contact_display` | `first` | Show contacts as First Last or Last, First |
| `show_my_card` | `true` | Show My Card at the top of Contacts |
| `show_people_map` | `true` | The People Map in Contacts and Find Me in conversations |
| `people_here_since` | `true` | On the People Map, when someone arrived where they are, and for how long |
| `people_weather` | `true` | On the People Map, the temperature and weather where someone is (from Open-Meteo) |
| `people_activity` | `true` | On the People Map, whether someone is walking, running, cycling, driving or still |
| `people_focus` | `true` | On the People Map, when someone has Focus (iPhone) or Do Not Disturb (Android) on |
| `people_charging` | `true` | On the People Map, Charging or Full next to someone's battery level |
| `people_wifi` | `true` | On the People Map, the Wi-Fi network someone's phone is on |
| `people_nearby` | `false` | Find Nearby on the People Map: places near someone, or near the middle of the map, with their details (from OpenStreetMap) |
| `people_nearby_keep` | `168` | How many hours places found by Find Nearby are remembered on each device: `168` (1 week), `336` (2 weeks) or `720` (1 month). The editor can also clear them |
| `distance_units` | `auto` | How distances are shown: `auto` (as Home Assistant), `km` (kilometres and metres), `mi_m` (miles and metres), `mi_yd` (miles and yards) or `mi_ft` (miles and feet). Used on the People Map, when choosing a place, and for the size of a new zone |
| `pdf_enabled` | `true` | Export as PDF |
| `enter_sends` | `true` | On a computer keyboard, Return sends and Shift+Return starts a new line |

### Household Settings (in the editor, administrators only)

| Setting | Default | Description |
|---------|---------|-------------|
| Keep Messages | Forever | Messages and attachments older than this are deleted for everyone. The Feed's posts follow it too, unless Keep Posts is set |
| Largest File Attachment | 300 MB | The biggest photo, video or file anyone can send |
| Delete Photos & Files from the Server | 90 Days | Clears out older attachments when you choose |
| One Dashboard for Everyone | On | Every notification opens the same dashboard |
| App Icon Badge | Off | A red number on the Home Assistant app's icon showing unread messages |
| Notification Buttons | Tapbacks and Mark as Read on | Which buttons appear when a notification is pressed and held |
| Feed Notification Buttons | All on except Hide for 30 Days | Reactions, Comment and Reply, Save, Event Answers, Poll Votes, Claim It, Write on the Card, Leave Group and Hide for 30 Days on Feed notifications |
| Feed (Social Media) | On | The household Feed. Off hides the Feed and the Feed card and stops its notifications |
| Share to Crow Messenger | On | Links shared to the Home Assistant app from a phone's share sheet can be sent to a chat |
| AI Features | Off | Turns on the AI features for everyone (in Features) |
| Typing and Viewing sensors | On | Two sensors that change all the time; switch them off to keep Home Assistant's history smaller (in Features) |
| Post on Someone's Page | On | People can post on each other's pages |
| Default Audience | Everyone at Home | Who a new post or story is for until it's changed (Everyone at Home or Only Me) |
| Post Types | All on | Polls, Events, Chip In and Up for Grabs, each on or off |
| Stories | On | Stories that disappear after 24 hours |
| Birthdays and Milestones | On | Birthday card posts and milestones |
| Year in Review | On | The most-loved photos of the year, on 31 December |
| Keep Posts | Same as Keep Messages | Its own time for posts, or Forever, even if messages are deleted sooner |
| Erase Everything | — | Administrators only, in Reset: delete everything for everyone and wipe it from the server so Crow Messenger starts as if just installed (type ERASE), or choose just some of it (type RESET). Download a Backup First makes one .zip of everything |

---

## Reset and Removing

**Erase Everything** is in the editor's **Reset** section (under **Erase Crow Messenger**), for administrators only. It deletes every chat, message, contact, Feed post, story, group, album, photo, video and file, and every setting, for everyone — and wipes it from Home Assistant, including the whole `crow_messenger_media` folder — so Crow Messenger starts again as if it had just been installed. It shows how much will go, offers **Download a Backup First** (one .zip with everything, photos and videos included; the link works for an hour), then asks you to type **ERASE**.

Or choose **Choose What to Delete** and tick just some of it — Messages and Chats, Photos, Videos and Files, Feed, Contacts, Personal Settings, Household Settings — and type **RESET**.

Afterwards the integration restarts itself, so nothing that was waiting (Send Later, reminders, event and birthday timers, live locations) carries on. Open cards wipe what they kept in the browser and start again empty; cards that were closed do the same the next time they open. Crow Messenger notifications still on phones are cleared where the phone allows it. The reset is written to the Home Assistant log with who did it, and fires a `crow_messenger_reset` event (`user_id`, `parts`). Home Assistant users, the sensors and the integration itself are kept.

**Deleting the integration** in Settings → Devices & Services now removes its data and files too, so nothing is left behind.

> A Home Assistant backup made before a reset still holds Crow Messenger's data, and restoring it brings it back.

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

**Home Assistant isn't in my phone's share list**
- On iPhone, open the share sheet, scroll the row of apps to the end, tap **More** and switch on **Home Assistant** (drag it up the list to keep it near the front).
- On Android it appears in the share list once the Companion app is installed and signed in.

**Tapping the share notification opens the wrong place**
- Tapping it opens the Feed if the card's **Startup Screen** is a Feed screen, and Messages otherwise. Press and hold the notification instead to choose **Send in a Chat** or **Post on a Page**.

**I shared a link but no notification came**
- Check **Share to Crow Messenger** is switched on in the editor's household settings.
- Check notifications from the Home Assistant app are allowed, and that the phone is signed in as you. The notification goes to the phone you shared from.
- Open the card once on that phone, so Crow Messenger knows which dashboard to open (or set **One Dashboard for Everyone**).

**The Feed button is missing**
- Check **Feed (Social Media)** is switched on in the editor's household settings, then reopen the card.

**Someone can't see a post**
- Posts only show to the people they're shared with. Tap ••• → **Who Can See This** on your post to check or change it. Posts in a group are only for its members, and photos in an album follow the album's audience.

**A post disappeared**
- Posts follow **Keep Messages** (Forever unless it's been changed): with 30 days, say, a post is deleted 30 days after it was posted. Stories always go after 24 hours.

**A screen says “Loading…” for a moment**
- Export as PDF, Games, Live Wallpapers, the People Map and the Feed are fetched the first time they're opened. After that they open straight away.

**Location, Check In and Find Me don't work**
- Each person needs a Home Assistant person linked to their user, with a location from the Companion app.

**AI features are missing**
- Check **AI Features** is switched on in the editor — AI is off by default, and its menu entries are hidden until it's on.
- Check an AI Task is set up in Home Assistant, or chosen in the editor. Only Chat with Home Assistant works without one.

**Getting back from full screen**
- Go back to the Messages screen and tap the Full Screen button again, or press Escape on a keyboard. Leaving the dashboard view always puts the card back too.

**The Full Screen button is missing**
- It's only on the Messages screen (the list of conversations), beside Contacts and Filter. Check **Full Screen Button** is switched on in the editor's **Layout & Motion** section.

**Ring Phone doesn't sound on an iPhone on silent**
- The Home Assistant app must be allowed Critical Alerts: on the iPhone go to **Settings → Notifications → Home Assistant** and turn on **Critical Alerts**. Without it the ring arrives as an ordinary notification.

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
