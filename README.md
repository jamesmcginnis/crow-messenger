# Crow Messenger

Crow Messenger is a Home Assistant integration and Lovelace card for private messaging between the people in your home. Designed with an **iPhone Messages** look and feel, the card gives you one-to-one and group chats with photos, videos, files, replies, tapbacks, effects, polls, games and much more — while the integration keeps every conversation on your own Home Assistant server, sends phone notifications through the Companion app and lets your automations send messages too.

It also has a **Feed**: a private, Facebook-style social feed just for your household, with posts, photos, videos, stories, groups, albums, events and more — every post seen only by the people you share it with.

And, when an administrator switches it on, **Email**: each person's own iCloud, Gmail, Yahoo, Outlook or other email accounts in the card, sharing the same contacts book and app icon badge as Messages (see [Email](#email)).

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
- **Reopens where you left off** — leave the app and come back to the same screen: a chat, Contacts, a Feed post or profile, or Email with the mailbox and email you were reading

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
- **Favourites** — Add to Favourites on a contact card (a ★ shows by their name). Favourites get a row of photos at the top of Contacts (tap for their contact card, press and hold for Message, Call or Contact Card), come first in New Message, Forward and Send to a Chat, and have their own filter on Messages. Adding a favourite offers once to pin your chat with them
- **People Map** — where everyone is, from their Home Assistant person, with Find Me. Open it with **Maps** in the app bar. Tap someone to see their address, how long they've been there, the weather where they are, what they're doing (walking, driving and so on), whether Focus is on, their battery and whether it's charging, and the Wi-Fi network they're on, from the Companion app's sensors on their phone. People in the same place sit side by side on the map
- **Find Nearby** — optional and off by default: toilets, cafés, restaurants, pubs, cash machines, pharmacies, supermarkets, petrol stations, EV chargers or parking near someone, or near the middle of the map, from OpenStreetMap. Each place shows its address, opening hours, phone and website (both ask before calling or opening), and wheelchair access, with Directions, Share (in a chat or through the share sheet) and Add Zone. Distances are from the person you're looking at. Closing a search stops it straight away
- **Saved places** — places Find Nearby has found are remembered on each device for a week, two weeks or a month, and stay on the map as small pins you can tap to open without searching again. Press and hold a pin for Directions, Share or Remove from Map. The map style menu can show, hide or clear saved places
- **Zones** — create Home Assistant zones straight from the map, Check In and shared locations
- **A household member's contact card** also shows whether they're **Active now**, a **Feed** button, their **Feed profile** with their latest post and recent photos, **Post on Their Page**, their **birthday from the Feed** (with Write on the Card on the day), your **chats** with them (with unread counts), **Shared in Chats**, **Hide Alerts** and **Ring Phone**. Only posts and photos shared with you are ever shown, and nothing from the Feed shows when the Feed is switched off. Other contacts are unchanged. Switch it off in the editor (Contacts & Maps → Feed and Chats on Contact Cards)


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
- **Link Safety** — links shared in chats and the Feed are checked, and one that looks like a scam (a fake bank or courier site, look-alike letters, a well-known name on a site that isn't theirs) gets a warning underneath and a question before it opens. Only the link and its page's title and description go to the AI, never the message, and well-known sites aren't sent at all

**In the Feed** (each with its own switch on the editor's **AI** page):

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
- **Make an Album** — after a busy few days of photos (a weekend away, a birthday), the top of the Feed offers to gather them into an album, with three names from the AI to choose from (or your own). Your photos go in straight away, and everyone else who posted photos in those days is asked, at the top of their Feed, whether to add theirs. Only photos shared with everyone are gathered, the album is shared with everyone, and the copies only appear in the album, not as new posts

Only posts and photos the person using the feature can see are ever sent to the AI.

### Feed (Social Media)

A private social feed for the people in your home. It's **on by default** and can be switched off in the editor (**Feed (Social Media)**, household settings). Get around with the **app bar** — the same capsule at the top left of Messages, Contacts and the Feed: Messages, Contacts and Feed, with the one you're on highlighted, then Full Screen (and Filter on Messages). It works like tabs: switching never piles up screens behind you. A red dot on Messages means a chat has unread messages (muted chats aren't counted), and on the Feed that there are new posts or notifications.

- **A navigation bar along the bottom, like Facebook's** — Home, Videos, Groups, Events, Notifications (with a red count) and Menu (your picture). Tap the tab you're on to jump back to the top. With **Bars Liquid Glass** on it floats as a frosted-glass capsule; with it off, or with a skin, it's a solid bar along the bottom that follows the skin. It can be switched off in the editor (**Feed Navigation Bar**, under Layout), which brings back the row of buttons at the top
- **Notifications** — like Facebook's bell: reactions and comments on your posts, replies and reactions to your comments, photo tags, @mentions, posts on your page, birthday cards, claims, Chip Ins and being added to a group. Several people doing the same thing are one line (“person2 and 2 others reacted to your post”), new ones are highlighted until you open them, and a tap opens the post. Only posts you can see are ever listed
  - **Swipe a notification** like a chat: right for **Mark as Read / Unread**, left for **More** and **Remove** (a long swipe removes it, with Undo). Press and hold for the same as a menu. **More** has Turn Off Notifications for This Post, Turn Off [kind] Notifications (the same switch as Feed Settings) and Hide [name] for 30 Days
  - **The ••• menu** on Notifications: Mark All as Read, Show (All, Unread, Reactions, Comments and Replies, Mentions and Tags, Posts on Your Page, or Birthdays, Groups and More), Turned Off Posts, Recently Removed (put back anything removed or cleared in the last 30 days), Notification Settings and **Clear All** (asks first)
  - Removed, cleared, read and turned-off notifications are remembered by Home Assistant, so they're the same on every device. Something new on a post (another reaction, a new comment) brings its notification back
- **Menu** — your profile, then Activity Log, Saved, Photos, Albums, Add to Story, New Post, Feed Settings and Messages
- **More like Facebook** — each can be switched off on the editor's Feed page:
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
- **New post notifications** — by default everyone is told about every new post shared with them (**Every New Post**). An administrator can change the household default on the editor's Feed page (**New Post Notifications**) to Important Only (events, polls, Up for Grabs, Chip In, lists and posts from their Favourites) or Nothing, and each person can change theirs in Feed Settings
  - **Get Notified** — the bell on someone's profile: Off, Their Posts, or Their Posts and Stories
  - Several posts from the same person within five minutes become one notification ("person2 posted 3 times") instead of a buzz each time
  - Buttons on the new kinds: tick items off a list or add one, Recommend Someone, Open Original on a shared post, and Love or Comment on a new profile or cover photo
  - In **Quiet Mode**, notifications are held back; when it ends, one "While you were quiet" notification says how many, and opens the bell. Muted posts and hidden people are never notified
- **Cover photos and your profile photo, like Facebook** — on your own profile, the camera on the banner adds a **cover photo** (Upload Photo, Reposition by dragging it up or down, View Photo, Remove), and the camera on your picture changes your **profile photo** (Choose Photo, Take Photo, Use My Home Assistant Picture, View Photo) with a Move and Scale step to frame it. A new profile photo shows straight away everywhere — chats, contacts, the Feed, comments and notifications, on everyone's card — and switches on Shared Name and Photo for you; your own contact card gets it too. Either can be shared to the Feed as a post. Cover photos are kept on the server like other photos (resized to about 1600px, the old one deleted when you change it), show behind the person's photo on their contact card, and can be switched off in the editor (**Cover Photos**, on the editor's Feed page). Tap anyone's cover or profile photo to see it full screen

- **Private by design** — every post is shared with **Everyone at home**, **Chosen people**, **Only me** or a **group**. Only those people see the post, its photos and videos, its comments and who reacted, and only they are ever notified about it. The audience can be changed after posting
- **Link previews like Facebook** — paste a link and a preview of the page appears as you write (tap ✕ to leave it off); in the Feed it shows the page's picture across the post with the site, title and description, and the link itself isn't repeated in the words. If a site doesn't answer at first, the preview is tried again later
- **Videos play straight away** — they stream as they play instead of downloading first
- **Posts** — words, up to 20 photos, videos and GIFs, link previews, a feeling or activity, a place (check in at a Home Assistant zone), @mentions, and coloured backgrounds for short posts that follow your theme
- **Post on someone's page** — like Facebook: it shows on their profile as “person1 ▸ person2” and they're told about it. It's always shared with them (and whoever else you choose), and they can hide it from their page or delete it. Every profile has **Post on Their Page**
- **Tag people in photos** — tap where someone is; they're told, can see it in their Photos, and can remove the tag
- **Reactions** — Love, Like, Haha, Wow, Sad and Angry (press and hold Like), and see who reacted with what
- **One row under each post** — Like, Comment and Share, each with how many, a Save bookmark (saved posts are in Menu → Saved), and the reactions on the right (tap them to see who reacted)
- **Comments** — with replies, @mentions, a photo, a GIF or a sticker, reactions on comments, edit and delete
- **GIFs** — search GIPHY and add GIFs to posts and comments, or add your own. An administrator adds a free GIPHY API key in the card editor (Feed → GIFs) to switch search on; searches go through Home Assistant so the key stays private, and results are rated PG
- **Feed background** — each person can choose a photo or a Live Wallpaper to show behind their Feed, profiles and groups (Menu → Feed Settings → Feed Background). Only they see it
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

## Email

Email is an email client inside the card: each person adds their own iCloud, Gmail, Yahoo, Outlook / Microsoft 365 or other IMAP accounts and reads and writes email from the **Email** button in the app bar, next to Messages, Contacts and the Feed.

**Email is off until an administrator switches it on**: card editor → **Household** → **Features** → **Email**, then press **Save**. It starts straight away, with no restart. While it's off nothing runs: no mail server connections, no entities, no actions and no Assist tools, and the card never downloads Email's screens. Switching it off again removes its entities and devices (each person's accounts and settings are kept for next time).

- **One contacts book.** Email uses the card's Contacts: a contact added from an email shows in Messages, and tapping an email address on a contact starts an email.
- **One app icon badge.** When **App Icon Badge** is on (the editor's Notifications page), unread email is added to the number on the Home Assistant app's icon. Each person chooses which email counts (all unread, email that notified them, VIPs only, or none) in Email's Settings.
- **The card's look.** Email follows the card's light or dark mode, Liquid Glass or Classic, the Home Assistant theme, the accent colour and full screen. Its mail skins are all kept (iPhone, Airmail, Gmail, Outlook, Spark, Superhuman, Proton Mail, Outlook Express, Hotmail 2000, You've Got Mail, Terminal, iPhone OS 3, BlackBerry and Mac OS 9). Unless someone picks one of their own (Email's ⋯ menu → Skin) or the editor sets one for the card, Email uses the mail skin closest to their Crow Messenger skin: Material You uses Gmail, MSN and Yahoo! use Hotmail 2000, AIM uses You've Got Mail, ICQ and Windows use Outlook Express, Aqua uses Mac OS 9, BlackBerry and Nokia use BlackBerry, IRC uses Terminal, Signal uses Proton Mail, Discord uses Superhuman, and the rest use iPhone in the card's own colours.
- **Opens on the Inbox.** Email always opens on the Inbox (all your accounts together), with the card's app bar at the top left and a Mailboxes button after it. Tapping Email in the app bar while you're in Email goes back to the Inbox; tapping it on the Inbox opens the Mailboxes.
- **Settings.** The editor's **Email** page has this card's mail skin, wide layout, mail list, Inbox Tools and calendars, then the household's notices, Microsoft sign-in, attachments and automations. Email's notification and AI settings are on the Notifications and AI pages.

### Messages, Contacts, the Feed and Email Together

- **Recent emails on a contact card** — the last few emails to and from that person, with See All in Email. Each person can show or hide this in the ⋯ menu at the top right of any contact card, which also has Send Message, New Email, Edit, Share, Export as PDF, Favourites and Delete
- **From an email** (⋯ in an open email) — Message the sender when they're in your household, Send to a Chat (the sender, subject and start of the email go into the chats you choose), Post Photos in the Feed, Make a Feed Event (filled in from the appointment Email found, if there is one) and Who's This? for someone new
- **Ask Home Assistant about your email** — in the Home Assistant chat, ask things like "any emails from the school today?" or "when's my parcel coming?". Only your own email is used, and only in your own chat with Home Assistant
- **What Did I Miss?** — on Messages, Filter → What Did I Miss? gives one short catch-up on unread messages, new Feed posts and important email (needs Catch Up under AI). The morning briefing includes your messages and the Feed too
- **Search everything** — searching Messages also finds Feed posts and email, each in its own section
- **Favourites are VIPs** — your Favourites in Contacts count as Email VIPs (each person can turn this off in Email's Settings)
- **One sticker collection and one background** — stickers you save are in Messages and Email, and the background for all chats is also the background for all mailboxes. My Card (the email signature) can be filled in from your card in Contacts
- **Household notices** — an administrator can have Home Assistant post in the Feed when someone's email says a parcel is out for delivery, a supermarket delivery is booked or on its way, or bin collections change (Email page → Household Notices, each off until switched on)
- **Snooze until I get home** — Snooze has When I Get Home, which brings the email back when you next arrive home
- **Quiet during Focus** — new email arrives silently while your phone's Focus or Do Not Disturb is on, as in Messages. VIPs still come through (each person can turn this off in Email's Settings)
- **Notifications** open the card's dashboard (General page → Dashboards) straight into the email.

### Adding Accounts

Each person adds their own accounts in the card (**Settings → Add Account**). Only they can see them.

| Provider | How to sign in |
|----------|----------------|
| **iCloud** | An app-specific password: [appleid.apple.com](https://appleid.apple.com) → **Sign-In and Security** → **App-Specific Passwords** |
| **Gmail** | An App Password: [myaccount.google.com](https://myaccount.google.com) → **Security** → **2-Step Verification** → **App passwords** |
| **Yahoo** | An app password: **Yahoo Account Security** → **Generate app password** |
| **Outlook** (Outlook.com, Hotmail, Live and Microsoft 365) | Sign in with Microsoft: a short code is shown, you open **microsoft.com/devicelogin** on any device and sign in. Needs a one-off app registration — see below |
| **Other** | Your provider's IMAP and SMTP server settings |

Passwords and Microsoft sign-in tokens are kept by Home Assistant, never in the card.

#### Microsoft (Outlook) Setup

Microsoft only lets apps it knows sign in to Outlook, so an administrator registers Crow Messenger once (free, about five minutes):

1. Go to [entra.microsoft.com](https://entra.microsoft.com) (or the Azure portal) and sign in with any Microsoft account
2. Open **App registrations** → **New registration**
3. Name it **Crow Messenger**, and under **Supported account types** choose **Accounts in any organizational directory and personal Microsoft accounts**. Leave **Redirect URI** empty, then click **Register**
4. Open **Authentication** → **Advanced settings**, set **Allow public client flows** to **Yes**, and click **Save**
5. Open **API permissions** → **Add a permission** → **APIs my organization uses** → **Office 365 Exchange Online** → **Delegated permissions**, tick **IMAP.AccessAsUser.All** and **SMTP.Send**, and click **Add permissions**
6. On the **Overview** page, copy the **Application (client) ID**
7. In the card editor, open the **Email** page, go to **Accounts and Sending** and paste it into **Application (Client) ID**. Leave **Tenant** as `common` for personal and work accounts, or enter your organisation's tenant ID to allow only its accounts

> For Microsoft 365 work or school accounts, an administrator may need to grant consent for the permissions, and **Authenticated SMTP** must be allowed for the mailbox in the Microsoft 365 admin centre.



### Features

#### Mail

- **iPhone Mail design** — Liquid Glass bars, large titles, swipe actions and smooth page transitions
- **Every account in one place** — All Inboxes, VIP, Flagged, Unread, Today and Attachments, plus each account's own folders
- **Side by side on a wide screen** — mailboxes, the list and the email together on a tablet, a computer or a Panel view
- **Swipes** — swipe right for Read and Pin, left for More, Flag and Archive (or Delete), with a long swipe to archive. Turn on **Custom Swipes** and each person chooses their own
- **Press and hold an email** — Reply, Forward, Mark as Read, Flag, Remind Me, Move, Export as PDF, Report Spam, Archive and Delete
- **Select Emails** — mark, move, copy, archive or delete several at once
- **Search** — across every account, with filters for unread, flagged, VIPs, attachments and today
- **Remind Me** — an email comes back to the top of the Inbox, with a notification, when you choose
- **Send Later and Undo Send** — schedule an email, or take one back in the seconds after sending
- **Pin to Top of Inbox** — keep important emails at the top
- **Conversations** — the emails in a back-and-forth, shown together
- **Export as PDF** — an email or a whole conversation, then download it or attach it to a new email
- **Group by Type** — optional: the Inbox in sections — People, Notifications, Shopping, Social and Newsletters
- **Instant when you come back** — the emails you've seen are kept on your device, so the card opens straight away, then quietly fetches anything new

#### Writing

- **Rich text** — bold, italic, underline, lists, quotes, emoji and stickers
- **Attachments** — photos, files and PDFs, up to 25 MB by default
- **Signatures** for each account
- **Voting buttons** — a poll in an email; replies are counted for you
- **Event invitations** — send one, or answer one with Accept, Maybe or Decline
- **Contact cards** — attach a contact from your address book
- **Read receipts** — ask for one, and answer them

#### Inbox Tools

Each one is off until it's switched on in the editor:

- **Snooze** — put an email away until later. It waits in a Snoozed folder, then comes back to the top of the Inbox, unread, with a notification
- **Mute Conversation** — replies in a busy thread skip the Inbox and don't notify you
- **The Screener** — the first email from someone new waits in the Screener until you choose **Let In** or **Screen Out**. Contacts, VIPs and anyone you've emailed always get through
- **Subscriptions** — every mailing list in your Inbox, busiest first, with one-tap Unsubscribe where the sender supports it and **Unsubscribe All** for the ones you never read
- **Sweep** — delete or archive everything from one sender, keep only the latest, or delete ones over 10 days old
- **Custom Swipes** — each person chooses the buttons a swipe shows, and what a long swipe does
- **Today** — a panel at the top of the Mailboxes with parcels arriving, food orders, supermarket delivery slots, appointments, bills due, reminders, snoozed emails coming back and follow-ups
- **Keyboard shortcuts** — on a tablet or computer: `j`/`k` to move, `e` archive, `#` delete, `r` reply, `c` new email, `/` search, `?` for the full list

#### Parcels and Dates

- **Track Parcel** — tracking numbers are found in delivery emails from couriers in the UK, Ireland, the US, Canada, Australia and New Zealand, with a link to the courier's own tracking page (no API keys)
- **Parcels** — a mailbox of deliveries on their way, with swipes, Rename, Share and Add to Calendar, an Arriving Today section, and a countdown before delivered parcels are tidied away
- **Food Orders** — takeaway and restaurant orders (Just Eat, Deliveroo, Uber Eats, Foodhub and others) in a mailbox of their own, with when each should arrive or be ready to collect. An order counts as delivered an hour after it was due if no email says otherwise, and leaves a few hours later
- **Supermarket Deliveries** — supermarket deliveries and click and collect (Tesco, Sainsbury's, Asda, Ocado and others) in a mailbox of their own, with the slot, the last time the order can be changed, substitutions and missing items. A delivery counts as delivered two hours after its slot if no email says otherwise, and stays two days so the substitutions can be checked
- **Travel** — flights, trains, ferries, coaches, hotels and car hire grouped into trips, with check-in times, terminals, seats, delays and gate changes
- **Home Visits** — engineers, services, installs and big deliveries coming to your home, with their time window
- **Tickets** — concerts, matches, shows and the cinema, with doors, seats and Show Ticket
- **Returns and Refunds** — things you're sending back, with the last day to return them and the refund to come
- **Renewals** — insurance, MOT, TV licence, contracts and memberships, with the renewal date and last year's price to compare
- **Council and Local** — bin collection changes, council tax, school news, road works and consultations, with any deadline
- **Receipts** — receipts for things worth keeping, with warranties and a search
- **Sign-in Codes** — the latest sign-in or verification code from a new email at the top of the Inbox, with Copy, for 10 minutes (found without AI, never saved, and never in sensors or events)
- **Add to…** — in an email's menu, adds an older email (or one that went into Parcels) to Food Orders, Supermarket Deliveries or any of the sections above
- **Add to Calendar** — tap a date in an email (optional, off by default) to add it to the calendar each person chooses, with the time, place and notes filled in

#### Look and Feel

- **The card's own look** — light or dark, Classic or Liquid Glass (with the card's Glass amount), the Home Assistant theme and the accent colour all come from the card
- **Mail skins** — each person can pick their own look: iPhone, Airmail, Gmail, Outlook, Spark, Superhuman, Proton Mail, or old-school Outlook Express, Hotmail 2000, You've Got Mail, Terminal, iPhone OS 3, BlackBerry and Mac OS 9. Match Crow Messenger (the standard) uses the one closest to their card skin
- **Backgrounds** — any photo, for one mailbox or all of them
- **Colour** — one accent colour, or each account's own
- **Full Screen** — the card's full screen button is at the top of the Mailboxes too

#### Privacy and Safety

- **Images** — pictures from the web are hidden until you choose Show Images (or always shown for senders you trust), so senders can't tell when you've opened an email
- **Block Trackers** — the hidden pictures that report when you open an email are left out, even when images are shown
- **Hide My Location** — pictures can be fetched through Home Assistant, so senders never see your IP address
- **Block Ads** — ads from ad networks are taken out before the email reaches you, and optionally labelled sponsored sections are folded away
- **Report Spam, Block Sender and Report Phishing** — with Unsubscribe in the same step
- **Scam warnings** — emails pretending to be from someone else, or with links that go somewhere other than they say, are flagged
- **Private contacts** — each person's own address book, with VIPs

#### AI Features

All optional, and each can be switched off individually in the editor:

- **Catch Up and Summaries** — a digest of unread email, and a summary of any email or whole conversation
- **Ask About This Email** — ask a question, like "When's the refund deadline?"
- **Smart Replies and Writing Tools** — suggested replies, proofreading, rewriting, or an email from a few words
- **Tone Check** — a gentle warning if an email might come across badly, with a kinder version
- **Translate** and **Describe Pictures**
- **Smart Search** — "the plumber's email about the boiler last month"
- **Find Dates and To-dos** — appointments and deadlines, ready for a calendar or to-do list
- **Smart Notifications** — only email worth a notification
- **Smart Categories** — Primary, Transactions, Updates and Promotions
- **Parcel Tracker** — deliveries found in email, with a Parcels sensor
- **Food Orders and Supermarket Deliveries** — found in email, each with its own mailbox, sensors and event. Parcels leaves them out while these are on
- **Travel, Home Visits, Tickets, Returns and Refunds, Renewals, Council and Local, and Receipts** — found in email, each with its own mailbox, sensors and event
- **Appointments** — bookings found in new email, with Add to Calendar
- **Bills** — amounts and due dates, a reminder a few days before, and a warning when a bill is much higher than last time
- **Morning Briefing** — a short summary of your day each morning, as a notification or read aloud on a speaker
- **Smart Snooze** — a suggested time from what's in the email, like the morning of a delivery
- **Screener Insights** — who each new sender seems to be, with a suggested Let In or Screen Out
- **Subscription Notes** — what each mailing list sends
- **Inbox Tidy-Up** — old promotions, unopened newsletters, sign-in codes and order confirmations to clear in one go
- **Contacts from Signatures** — add a sender's phone number or address to their contact
- **Follow-Up Nudges and Write the Follow-Up** — emails you sent that haven't had a reply, with a polite chaser drafted for you
- **AI Rules** — describe a rule in plain English, like "anything about my car insurance"
- **Email Details for Automations** — bills, amounts, deliveries and appointments in a `crow_email_details` event
- **Ask Your Email** — ask an Assist conversation agent about your email

#### Integration

- **Phone notifications** — through the Companion app on iPhone and Android, with the sender, subject and preview, grouped by sender if you like
- **Notification buttons** — Reply, Mark as Read, Archive, Flag, Remind Me in 1 Hour and Delete (each can be switched on or off)
- **Quiet Hours** — new email arrives silently overnight; VIPs still come through
- **App icon badge** — unread email is added to the card's App Icon Badge (when it's on), and the Email button in the app bar gets a red dot
- **Rules** — move, mark or flag new email, and choose whether it notifies you
- **Email Home Assistant** — optional and off by default: email yourself a subject starting `HA:`, like "HA: is the garage door closed?", and Assist answers by email
- **Sensors and binary sensors** for every account (below)
- **Actions and events** for your automations (below)
- Runs entirely on your own Home Assistant — no cloud service of its own



### Sensors

Each account is a device (made by Crow Messenger) with these entities, while Email is on:

| Entity | Description |
|--------|-------------|
| Unread | Unread emails in the Inbox |
| Unread VIP | Unread emails from VIPs |
| Unread people, notifications, council and local, shopping, social and newsletters | Unread emails in each of the Inbox's groups, sorted the same way as the card (an email added to Council and Local counts there) |
| Latest email | Who the newest email is from, and its subject |
| Latest VIP email | Who the newest email from a VIP is from, and its subject |
| Received today | Emails received today |
| Flagged | Flagged emails |
| Drafts and scheduled | Drafts, plus emails waiting to Send Later |
| Mailbox usage | How full the mailbox is, where the provider says |
| Last checked | When the account was last checked |
| Junk | Emails in Junk (or Spam) |
| Parcels | Deliveries on their way (with the Parcel Tracker) |
| Needs attention today | Parcels arriving, appointments, bills due, reminders, snoozed emails and follow-ups |
| Bills due this week | Unpaid bills due in the next 7 days, with the total (with Bills) |
| Next bill | The due date of the next unpaid bill, with who it's to and how much (with Bills) |
| Snoozed | Snoozed emails, and when the next one comes back |
| Reminders | Emails with a Remind Me set, and when the next one is due |
| Waiting for a reply | Emails you sent that haven't had a reply (with Follow-Up Nudges) |
| Screener | Emails from first-time senders waiting for a Yes or No, and who sent them (with the Screener on) |
| Subscriptions | Mailing lists in the Inbox you're still subscribed to, counted every 6 hours |
| Food arriving | When the next food order should arrive or be ready, with the restaurant, status and total (with Food Orders) |
| Food order spend this month | What food orders found in email have cost this month, in Home Assistant's currency, with last month's total (with Food Orders) |
| Next supermarket delivery | The start of the next delivery or collection slot, with the shop, the end of the slot, the last time to change the order, substitutions and missing items (with Supermarket Deliveries) |
| Supermarket spend this month | What supermarket orders found in email have cost this month, with last month's total (with Supermarket Deliveries) |
| Next travel | When the next booking starts, with the flight or train, from and to, terminal, gate, seat, delay, check-in time and the trip (with Travel) |
| Next home visit | The start of the next visit's window, with what it is, the company and the end of the window (with Home Visits) |
| Next event | When the next event starts, with the venue, doors, seats and number of tickets (with Tickets) |
| Refunds owed | Refunds still to come, in Home Assistant's currency, with each return (with Returns and Refunds) |
| Return deadline | The last day to send back the next thing that hasn't been sent, with the days left (with Returns and Refunds) |
| Next renewal | The next renewal or expiry date, with the price, last year's price and the change (with Renewals) |
| Council updates | Current news from the council, school or local services, with the next bin collection change (with Council and Local) |
| Warranties ending soon | Warranties ending in the next 90 days (with Receipts) |
| Badge | The number on the app icon (with the App Icon Badge) |
| Connected | On while Home Assistant is signed in to the mail server |
| New mail | On when unread email has arrived since the Inbox was last looked at |
| Parcel out for delivery | On while a parcel is out for delivery (with the Parcel Tracker) |
| Food order in progress | On from ordering until the food is delivered or collected, with whether it's on its way or ready to collect (with Food Orders) |
| Supermarket delivery coming | On while a supermarket delivery is on its way, ready to collect, or during its slot (with Supermarket Deliveries) |
| Away on a trip | On from the start of a trip to its end (a trip with somewhere to stay, more than one booking, or over 12 hours), with when you're back (with Travel) |
| Travel disruption | On while a booking in the next two days is delayed, changed or cancelled (with Travel) |
| Renewal due soon | On while something renews or runs out in the next 30 days (with Renewals) |
| Home visit today | On all day when an engineer, service or delivery is due (with Home Visits) |
| Home visit now | On during a visit's time window, or for four hours from its start when no end is given (with Home Visits) |
| Bill overdue | On while a bill is past its due date and not marked paid (with Bills) |

> Each account's **Show Sender and Subject** and **Show Preview Text** settings decide whether those details appear in its sensors and events, since anyone who can see your Home Assistant can see them.



### Actions and Events

#### Actions

| Action | Description |
|--------|-------------|
| `crow_messenger.send_email` | Sends an email from one of the accounts. `account` is its email address or name; `to`, `cc` and `bcc` take addresses separated by commas. Optional `subject`, `message` (or `html`), `attachments` (files under `/local/`, your `www` folder, or `/media/local/`), `send_at`, `buttons`, `poll` and `read_receipt` |
| `crow_messenger.mark_email_as_read` | Marks an email (by `uid` or `message_id`), or `all` emails in a folder, as read or unread |
| `crow_messenger.archive_email` | Archives an email |
| `crow_messenger.move_email` | Moves an email to another folder |
| `crow_messenger.flag_email` | Flags or unflags an email |
| `crow_messenger.refresh_email` | Checks one account, or all of them, for new email now |
| `crow_messenger.update_email_badge` | Updates the app icon badge, optionally adding a number of your own |

#### Events

| Event | Description |
|-------|-------------|
| `crow_email_received` | A new email arrived, with the account, sender, subject, whether it's from a VIP and (if allowed) a preview |
| `crow_email_sent` | An email was sent |
| `crow_email_rule_matched` | One of your rules matched a new email |
| `crow_email_details` | What the AI found in a new email: its kind, amount, due date, appointment time, location and reference (with Email Details for Automations) |
| `crow_email_follow_up` | An email you sent may need a follow-up |
| `crow_email_parcel` | A parcel was added, changed status or was removed |
| `crow_email_food` | A food order was added, changed status (including probably delivered) or was removed |
| `crow_email_grocery` | A supermarket delivery was added, changed status (including probably delivered) or was removed, with how many substitutions and missing items |
| `crow_email_travel`, `crow_email_visit`, `crow_email_ticket`, `crow_email_return`, `crow_email_renewal`, `crow_email_council`, `crow_email_receipt` | Something was added, changed or removed in that section. `change` says which (`added`, `changed` for a new status, `updated` or `removed`); `crow_email_council` has a `topic`, such as `bins` |
| `crow_email_blocked` | Email from a blocked sender was moved to Junk |
| `crow_email_action` | Someone tapped a button in an email sent by an automation |
| `crow_email_vote` | Someone voted on an email with voting buttons |



### Automation Examples

#### Email a snapshot when the doorbell rings

```yaml
alias: Doorbell snapshot by email
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
  - action: crow_messenger.send_email
    data:
      account: me@icloud.com
      to: me@icloud.com
      subject: Someone is at the front door
      message: Here's who was there.
      attachments:
        - /local/snapshots/doorbell.jpg
```

#### Buttons in an email

```yaml
actions:
  - action: crow_messenger.send_email
    data:
      account: me@icloud.com
      to: me@icloud.com
      subject: The garage door has been open for 30 minutes
      buttons:
        - title: Close the garage
          action: close_garage
```

```yaml
alias: Close the garage from an email
triggers:
  - trigger: event
    event_type: crow_email_action
    event_data:
      action: close_garage
actions:
  - action: cover.close_cover
    target:
      entity_id: cover.garage_door
```

#### Flash a light when a VIP emails

```yaml
alias: VIP email light
triggers:
  - trigger: event
    event_type: crow_email_received
    event_data:
      vip: true
actions:
  - action: light.turn_on
    target:
      entity_id: light.hallway
    data:
      flash: short
```

---

## Share from Your Phone

Share a link from any app on your phone — Safari, Chrome, YouTube, News — into a chat, onto someone's page in the Feed, or into an email:

1. Tap **Share** and choose **Home Assistant** (on iPhone, tap **Post** in the small box that appears — anything you type there comes along as your comment)
2. A notification arrives on that phone, showing the page's title, its site and (on iPhone) its picture. Press and hold it to choose:
   - **Send in a Chat** — Crow Messenger opens on **Send To**: pick one or more chats, or someone you haven't messaged yet, add a comment if you like, and tap **Send**
   - **Post on a Page** — the Feed opens on **New Post** with the link filled in. Choose **Your Page** or someone else's, who can see it, and tap **Post**
   - **Send in an Email** — Email opens on a new email with the link in it and the page's title as the subject (with Email switched on and an email account of your own)
   - **Discard** — throws it away (on Android, which shows three buttons at most, Discard is left out when all three places are offered: swipe the notification away instead)
3. Tapping the notification itself asks where it should go: a chat, a page or an email (or Discard). On the Send To sheet, **Post on a Page instead** and **Send in an Email instead** are one tap away too

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
| Needs my attention | One number for everything waiting on them: unread conversations (not muted), polls from the last two weeks they haven't voted in (in chats and the Feed), Feed events they haven't answered, and sent emails that haven't had a reply (with Follow-Up Nudges on). Attributes: `unread_conversations`, `polls_to_vote_in`, `events_to_answer` and `emails_to_follow_up` |
| Unread mentions | Unread @mentions in chats (including ones with Hide Alerts on, as mentions still get through) and in the Feed's posts, comments and stories, with `in_chats` and `in_feed` |
| Quiet mode | On while they don't want to be disturbed: the Feed's Quiet Mode (paused, or its nightly hours) or Focus (iPhone) / Do Not Disturb (Android) on their phone. Attributes: `feed_quiet_mode`, `phone_focus`, `quiet_until`, `nightly` and how many `conversations_with_hide_alerts` |

The household has its own device, **Crow Messenger (Household)**:

| Entity | Description |
|--------|-------------|
| Messages today | Messages sent in the house today, with `this_week` and `this_month` |
| Storage used | Space the photos, videos and files take on the server, with how many `files` and the `oldest` |
| Next event | When the next Feed event shared with everyone starts, with its `title`, how many are `going` and `maybe`, `location` and `post_id` |
| Active chats | Conversations with a message in the last 24 hours |
| People online | How many people have the card open, with their `names` (not counting anyone who hides their activity) |
| Next birthday | Whose birthday is next, with its `date`, how many `days` away and the next few as `upcoming`. Only people who share their birthday in the Feed, and never their age |

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

> **Note:** Everything above can be set from the visual editor. It opens on a list of pages, like iPhone Settings: General, Messages, Contacts & Maps, Feed, Email, Notifications, AI, and Storage & Reset. Each page shows this card's own settings first (anyone who can edit the dashboard), then its **Household (everyone)** settings, which are saved in Home Assistant and used by every card and phone (administrators only). Feed, Email and AI start with their own on/off switch, rarely changed settings are under **More**, and a setting that only matters while another is on is only shown then. The search box at the top finds any setting on any page and takes you to it.

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
| `app_bar_items` | `[messages, contacts, maps, feed, email]` | Which places are in the app bar at the top left, in order. One left out still shows on its own screen. Maps shows while the People map is on, and Email while Email is switched on |
| `app_bar_filter` | `true` | The Filter button in the app bar on Messages |
| `app_bar_dots` | `true` | Red dots in the app bar for unread chats and new Feed posts or notifications |
| `feed_start_tab` | `feed` | The tab the Feed opens on: `feed` (Home), `videos`, `groups` or `events` |
| `feed_autoplay` | `false` | Videos in Feed posts play silently while they're on screen |
| `show_stories` | `true` | The Stories row at the top of the Feed |
| `show_memories` | `true` | On This Day at the top of the Feed |
| `contact_extras` | `true` | A household member's contact card shows their Feed, your chats with them, Hide Alerts and Ring Phone |
| `start_view` | `messages` | Startup Screen: `messages` (reopens the chat you were last in), `contacts`, `feed`, `feed_videos`, `feed_groups`, `feed_events` or `feed_alerts` (Notifications). The Feed screens need the Feed switched on, otherwise it opens on Messages. Back always goes to Messages |
| `resume` | `true` | Return to Where You Left Off: leave the dashboard or the app and come back to the same screens — the chat, Contacts, a profile (and its tab), a post, the Feed tab you were on, Email (with the mailbox and email you had open) — scrolled to where you were. Where you are is saved the moment you leave the app. After 12 hours away the Startup Screen is used instead; a notification you tap or a link still opens what it's about |
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
| `show_people_map` | `true` | The People Map (Maps in the app bar) and Find Me in conversations |
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
