"""Constants for the Crow Messenger integration."""

DOMAIN = "crow_messenger"

STORAGE_VERSION = 1
STORAGE_KEY_DATA = f"{DOMAIN}.messages"
STORAGE_KEY_CONTACTS = f"{DOMAIN}.contacts"
STORAGE_KEY_BACKGROUNDS = f"{DOMAIN}.backgrounds"

# Chat background photos (per person, per conversation)
MAX_BACKGROUND_DATA_URL = 2_500_000
MAX_BACKGROUNDS_PER_USER = 40
# Live Wallpapers: animated chat backgrounds that can be used instead of a photo
LIVE_WALLPAPERS = ("rain", "aurora", "lava", "night", "fire", "ocean", "sky", "snowfall", "fireflies", "space", "fairy", "liquid")

# Folder under /config (NOT /config/www - anything in www is public at
# /local/ without logging in, which is wrong for private messages).
MEDIA_DIR_NAME = "crow_messenger_media"

EVENT_MESSAGE_RECEIVED = f"{DOMAIN}_message_received"

SERVICE_SEND_MESSAGE = "send_message"

# Virtual participant used when an automation sends a message without a user.
HA_SENDER_ID = "__home_assistant__"
HA_SENDER_NAME = "Home Assistant"

# Keep Messages choices offered in the editor (days). 0 = Forever.
RETENTION_CHOICES = [0, 1, 7, 30, 365]

CLEANUP_INTERVAL_MINUTES = 60
# Uploads that never made it into a sent message are removed after this.
ORPHAN_UPLOAD_HOURS = 24
# How long after sending a message can still be unsent (like Apple Messages)
UNSEND_WINDOW_MS = 2 * 60 * 1000

# Edit a sent message: how long after sending, and how many times (like Apple Messages)
EDIT_WINDOW_MS = 15 * 60 * 1000
MAX_EDITS = 5
# Disappearing messages (seconds after the message has been read). 0 = Off.
DISAPPEAR_CHOICES = (0, 3600, 86400, 604800)
# one message that disappears this long after it's been read (chosen from the send button)
MESSAGE_TTL_CHOICES = (60, 3600, 86400)
# Send Later: how far ahead, and how many waiting per person
MAX_SCHEDULE_AHEAD_DAYS = 366
MAX_SCHEDULED_PER_USER = 50
MAX_PINNED = 9
MAX_POLL_OPTIONS = 12
MAX_ACTIONS = 6
MAX_PLACED_STICKERS = 20
MAX_STICKERS_PER_USER = 120
MAX_STICKER_DATA_URL = 600_000
# Message effects and text styles the card knows how to play
BUBBLE_EFFECTS = ("slam", "loud", "gentle", "invisible")
SCREEN_EFFECTS = ("confetti", "balloons", "fireworks", "hearts", "lasers", "celebration", "spotlight", "echo",
                  "shootingstar", "poppers", "snow", "bubbles", "fireflies", "aurora", "petals", "leaves", "thunder", "halloween")
TEXT_STYLES = ("bold", "italic", "underline", "strike", "big", "small", "shake", "nod", "ripple", "bloom", "jitter")
# Fired when someone taps a button on a message sent by an automation
EVENT_ACTION = f"{DOMAIN}_action"
# for automations: a tapback or Feed reaction, a Feed comment, a chat read, a Ring Phone answered
EVENT_REACTION = f"{DOMAIN}_reaction"
EVENT_COMMENT = f"{DOMAIN}_post_comment"
EVENT_READ = f"{DOMAIN}_read"
EVENT_RING_ANSWERED = f"{DOMAIN}_ring_answered"
ACTION_PREFIX = "CROW_ACT_"
# Link previews are fetched by Home Assistant (never by the phone), within these limits
LINK_TIMEOUT = 8
LINK_MAX_HTML = 1_000_000
LINK_MAX_IMAGE = 8_000_000

# Links handed to the phone apps for notification previews stay valid for this long.
NOTIFY_MEDIA_TTL_DAYS = 7

MAX_TEXT_LENGTH = 10000
MAX_PHOTO_DATA_URL = 400_000  # contact / group / profile photos (resized in the card)
MAX_CONTACTS_PER_USER = 5000

ANDROID_CHANNEL = "Crow Messenger"
ANDROID_CHANNEL_SILENT = "Crow Messenger (silent)"

DEFAULT_SETTINGS = {
    # Keep Messages (and the Feed): forever unless an administrator chooses a time
    "retention_days": 0,
    "max_upload_mb": 300,
    "notifications": {
        "enabled": True,
        "show_text": True,
        "show_attachment": True,
        "sound": True,
        "reply_action": True,
        # the red number on the Home Assistant app's icon (unread messages)
        "badge": False,
        # the buttons on a message notification (press and hold it)
        "buttons": {"tapbacks": True, "mark_read": True, "mute": False, "home": False},
        # the buttons on a Feed notification
        "feed_buttons": {"reactions": True, "comment": True, "save": True, "events": True, "polls": True,
                         "claim": True, "birthday": True, "leave": True, "hide": False},
    },
    # Messages extras: link previews (fetched by Home Assistant)
    # Share to Home Assistant: links shared from a phone's share sheet can be sent to a chat
    # the Feed: a private social feed for the household (posts follow Keep Messages)
    "features": {"link_previews": True, "share_sheet": True, "feed": True},
    # sensors that change often (each can be switched off so the recorder doesn't fill up)
    "sensors": {"typing": True, "viewing": True},
    # the Feed, for the whole household
    "feed": {
        "page_posts": True,            # posting on someone's page
        "default_audience": "everyone",  # who a new post is for until changed: everyone | me
        "keep_days": None,             # None = the same as Keep Messages; 0 = forever
        "stories": True, "birthdays": True, "review": True,
        "kinds": {"poll": True, "event": True, "fund": True, "grabs": True, "recs": True, "list": True},
        "covers": True,
        # more like Facebook (each can be switched off in the editor)
        "intro": True,                 # a bio, details and featured photos on profiles
        "highlights": True,
        "story_archive": True,         # stories are kept privately after 24 hours, to make highlights from            # Story Highlights kept on profiles
        "shares": True,                # Share a post (with your own words)
        "story_replies": True,         # react to and reply to stories (replies arrive in Messages)
        "story_stickers": True,        # poll, question, countdown, mention, place, weather and time stickers
        "home_cards": True,            # Share from Home: a sensor, a chart, the weather or a camera snapshot
        "waves": True,                 # wave at someone
        "badges": True,                # weekly badges, posted on Sunday evenings
        "collections": True,           # Saved collections
        "friends": True,               # a Friends section on each profile, like Facebook
        "quiet": True,                 # Quiet Mode in each person's Feed Settings
        "notify_default": "everything",  # new posts on phones until someone changes it: everything | important | nothing                # cover photos at the top of profiles (and contact cards)
    },
    # one dashboard for everyone's notifications (when on and a dashboard is chosen, the
    # per-person choices are ignored; with no dashboard chosen yet, each person's choice is used)
    "dashboard": {"everyone": True, "path": ""},
    # user_id -> {"dashboard": "lovelace", "view": "0", "notify": True, "devices": {service: bool}}
    "users": {},
    # AI Features (off until an administrator turns them on in the editor)
    "ai": {
        "enabled": False,
        "agent_id": "",      # conversation agent for the Home Assistant chat ("" = Home Assistant's own)
        "task_entity": "",   # AI Task entity for everything else ("" = Home Assistant's preferred one)
        "features": {"assistant": True, "replies": True, "writing": True, "catchup": True,
                     "translate": True, "actions": True, "photos": True, "ask": True,
                     "feed_writing": True, "feed_captions": True, "feed_comments": True, "feed_smart": True,
                     "feed_albums": True, "feed_catchup": True, "feed_threads": True, "feed_translate": True,
                     "feed_photos": True, "feed_search": False, "feed_memories": True, "feed_kindness": True,
                     "feed_ask": True},
    },
}
