"""Timers, games and Home Status for Crow Messenger.

* Shared Timer: "Pizza's ready in 12 minutes" - everyone in the conversation sees it count
  down, and is told when it's done (Home Assistant keeps the time, so it still goes off
  with every phone locked, and after a restart).
* Games, played in the conversation: Noughts and Crosses, Connect Four, Reversi, Draughts and
  Sea Battle. Home Assistant checks every move (and keeps each Sea Battle fleet secret).
* Home Status: a card that shows, live, whether the house is locked up - nothing is stored
  for it; each phone reads the states from Home Assistant.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from homeassistant.core import callback
from homeassistant.helpers.event import async_track_point_in_utc_time

from . import games as G
from .const import HA_SENDER_ID

if TYPE_CHECKING:
    from .manager import Messenger

TIMER_MIN, TIMER_MAX = 5, 24 * 3600
GAME_KINDS = ("ttt", "c4", "rev", "dr", "sea")
GAME_NAMES = {"ttt": "Noughts and Crosses", "c4": "Connect Four", "rev": "Reversi", "dr": "Draughts",
              "sea": "Sea Battle", "word": "Word Game"}
C4_COLS, C4_ROWS = 7, 6

TTT_LINES = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _err(code: str, message: str) -> Exception:
    from .manager import MessengerError
    return MessengerError(code, message)


def c4_winner(board: list[int], idx: int) -> list[int] | None:
    """The four (or more) in a row through the counter just dropped at idx, if there is one."""
    who = board[idx]
    r0, c0 = divmod(idx, C4_COLS)
    for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
        line = [idx]
        for sgn in (1, -1):
            r, c = r0 + dr * sgn, c0 + dc * sgn
            while 0 <= r < C4_ROWS and 0 <= c < C4_COLS and board[r * C4_COLS + c] == who:
                line.append(r * C4_COLS + c)
                r, c = r + dr * sgn, c + dc * sgn
        if len(line) >= 4:
            return sorted(line)
    return None


class PlayMixin:
    """Mixed into Messenger."""

    # ── checking what's sent ────────────────────────────────────────────────
    def check_play(self: Messenger, uid: str, thread: dict, kind: str, extra: dict) -> dict:
        if kind == "timer":
            t = extra.get("timer") or {}
            try:
                secs = int(t.get("seconds") or 0)
            except (TypeError, ValueError) as err:
                raise _err("invalid_format", "Choose how long the timer is") from err
            if not TIMER_MIN <= secs <= TIMER_MAX:
                raise _err("invalid_format", "A timer can be from 5 seconds to 24 hours")
            return {"timer": {"seconds": secs, "ends": _now() + secs * 1000, "status": "running"}}
        if kind == "game":
            g = extra.get("game") or {}
            game = g.get("kind")
            if game not in GAME_KINDS:
                raise _err("invalid_format", "Unknown game")
            people = [p for p in thread["participants"] if p != HA_SENDER_ID]
            others = [p for p in people if p != uid]
            # two players: you, and the other person (in a group, whoever plays first; on your own, you)
            second = others[0] if len(others) == 1 else (uid if not others else None)
            base = {"kind": game, "players": [uid, second], "turn": 0, "winner": None, "line": [], "last": None, "moves": 0}
            if game == "rev":
                return {"game": {**base, "board": G.rev_new(), "score": [2, 2]}}
            if game == "dr":
                return {"game": {**base, "board": G.dr_new(), "count": [12, 12], "quiet": 0}}
            if game == "sea":
                return {"game": {**base, **G.sea_new()}}
            size = 9 if game == "ttt" else C4_COLS * C4_ROWS
            return {"game": {**base, "board": [0] * size}}
        if kind == "status":
            return {}
        return {}

    def game_view(self: Messenger, msg: dict) -> dict | None:
        """What a game looks like to everyone: the Word Game's answer only once it's over."""
        g = msg.get("game")
        if not g:
            return None
        if g.get("kind") == "word" and not g.get("done"):   # a Word Game from before it was removed
            g = {k: v for k, v in g.items() if k != "secret"}
        if g.get("kind") == "sea":
            # the ships stay hidden; each player asks for their own fleet (game/fleet).
            # once the game's over, both fleets are shown
            g = {k: v for k, v in g.items() if k != "fleets"}
            if msg["game"].get("winner") is not None:
                g["reveal"] = msg["game"].get("fleets")
        return g

    def _game_for(self: Messenger, uid: str, thread_id: str, message_id: str) -> tuple[dict, dict, dict, int | None]:
        thread, msg = self._msg(uid, thread_id, message_id)
        g = msg.get("game")
        if not g:
            raise _err("not_found", "Game not found")
        players = g["players"]
        side = 0 if players[0] == uid else 1 if players[1] == uid else None
        return thread, msg, g, side

    async def async_game_fleet(self: Messenger, uid: str, thread_id: str, message_id: str) -> dict:
        """Your own ships in a Sea Battle (nobody else's)."""
        _t, _m, g, side = self._game_for(uid, thread_id, message_id)
        if g.get("kind") != "sea" or side is None:
            return {"fleet": None}
        if g["players"][0] == g["players"][1]:
            return {"fleet": g["fleets"][g["turn"]], "side": g["turn"]}   # playing yourself: the fleet whose turn it is
        return {"fleet": g["fleets"][side], "side": side}

    async def async_game_shuffle(self: Messenger, uid: str, thread_id: str, message_id: str) -> dict:
        """Move your ships somewhere else, before anyone's fired at them."""
        thread, msg, g, side = self._game_for(uid, thread_id, message_id)
        if g.get("kind") != "sea" or side is None:
            raise _err("invalid_format", "You're not playing this game")
        if g["players"][0] == g["players"][1]:
            side = g["turn"]
        if any(g["shots"][side]) or g.get("winner") is not None:
            raise _err("invalid_format", "Your ships can't move once they've been fired at")
        g["fleets"][side] = G.sea_fleet()
        self._save()
        return {"fleet": g["fleets"][side], "side": side}

    # ── Shared Timer ────────────────────────────────────────────────────────
    @callback
    def _arm_timer(self: Messenger, thread: dict, msg: dict) -> None:
        tm = msg.get("timer") or {}
        key = f"tm_{msg['id']}"
        self._cancel_timer(key)
        if tm.get("status") != "running":
            return
        timers = self.__dict__.setdefault("_timers", {})

        @callback
        def _done(_when) -> None:
            timers.pop(key, None)
            self.hass.async_create_task(self._async_timer_done(thread["id"], msg["id"]))

        when = datetime.fromtimestamp(max(tm["ends"], _now() + 500) / 1000, tz=timezone.utc)
        timers[key] = async_track_point_in_utc_time(self.hass, _done, when)

    async def _async_timer_done(self: Messenger, thread_id: str, message_id: str) -> None:
        thread, msg = self._find(thread_id, message_id)
        if not msg or (msg.get("timer") or {}).get("status") != "running":
            return
        msg["timer"]["status"] = "done"
        msg["timer"]["done_at"] = _now()
        label = (msg.get("text") or "").strip()
        self._save()
        self._push_update(thread, msg)
        line = f"⏰ {label} timer is done." if label else "⏰ The timer is done."
        self._system_message(thread, line, msg["sender"])
        self._save()
        people = [p for p in thread["participants"] if p != HA_SENDER_ID]
        self._alert(thread, people, "Timer", f"{label} - time's up!" if label else "Time's up!",
                    tag=f"timer_{message_id}", urgent=True)

    async def async_timer_update(self: Messenger, uid: str, thread_id: str, message_id: str,
                                 action: str, minutes: int = 0) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        tm = msg.get("timer")
        if not tm or tm.get("status") != "running":
            raise _err("invalid_format", "That timer has finished")
        if action == "cancel":
            tm["status"] = "cancelled"
            tm["done_at"] = _now()
            self._cancel_timer(f"tm_{message_id}")
        elif action == "add":
            tm["ends"] = max(tm["ends"], _now()) + max(1, min(120, int(minutes or 1))) * 60_000
            tm["seconds"] = int(tm.get("seconds", 0)) + max(1, min(120, int(minutes or 1))) * 60
            self._arm_timer(thread, msg)
        self._save()
        self._push_update(thread, msg)
        return self.message_view(msg, self._hidden(thread, uid))

    # ── Games ───────────────────────────────────────────────────────────────
    async def async_game_move(self: Messenger, uid: str, thread_id: str, message_id: str, move: Any) -> dict:
        thread, msg = self._msg(uid, thread_id, message_id)
        g = msg.get("game")
        if not g:
            raise _err("not_found", "Game not found")
        nudge: str | None = None
        if g["kind"] not in GAME_KINDS:
            raise _err("invalid_format", "That game is no longer available")
        if g.get("winner") is not None:
            raise _err("invalid_format", "This game is over")
        players = g["players"]
        turn = g["turn"]
        if players[1] is None and turn == 1 and uid != players[0]:
            players[1] = uid  # in a group, whoever plays second joins the game
        if players[turn] != uid:
            raise _err("invalid_format", "It's not your turn")
        if g["kind"] in ("rev", "dr", "sea"):
            nudge = await self._big_game_move(thread, msg, g, uid, move)
            name = GAME_NAMES.get(g["kind"], "Game")
            if nudge:
                users = await self.async_user_map()
                who = users.get(uid, {}).get("name", "Someone")
                verb = "fired" if g["kind"] == "sea" else "played"
                self._alert(thread, [nudge], name, f"{who} {verb}. It's your turn.", tag=f"game_{message_id}")
            return self.message_view(msg, self._hidden(thread, uid))
        board = g["board"]
        if g["kind"] == "ttt":
            try:
                idx = int(move)
            except (TypeError, ValueError) as err:
                raise _err("invalid_format", "Choose a square") from err
            if not 0 <= idx < 9 or board[idx]:
                raise _err("invalid_format", "That square's taken")
        else:
            try:
                col = int(move)
            except (TypeError, ValueError) as err:
                raise _err("invalid_format", "Choose a column") from err
            if not 0 <= col < C4_COLS:
                raise _err("invalid_format", "Choose a column")
            free = [r for r in range(C4_ROWS) if not board[r * C4_COLS + col]]
            if not free:
                raise _err("invalid_format", "That column's full")
            idx = max(free) * C4_COLS + col
        board[idx] = turn + 1
        g["last"], g["moves"] = idx, g.get("moves", 0) + 1
        line = None
        if g["kind"] == "ttt":
            line = next((list(ln) for ln in TTT_LINES if board[ln[0]] and board[ln[0]] == board[ln[1]] == board[ln[2]]), None)
        else:
            line = c4_winner(board, idx)
        if line:
            g["winner"], g["line"] = turn, line
        elif all(board):
            g["winner"] = "draw"
        else:
            g["turn"] = 1 - turn
            nxt = players[g["turn"]]
            if nxt and nxt != uid:
                nudge = nxt
        self._save()
        self._push_update(thread, msg)
        name = GAME_NAMES.get(g["kind"], "Game")
        if nudge:
            users = await self.async_user_map()
            who = users.get(uid, {}).get("name", "Someone")
            self._alert(thread, [nudge], name, f"{who} played. It's your turn.", tag=f"game_{message_id}")
        return self.message_view(msg, self._hidden(thread, uid))

    async def _big_game_move(self: Messenger, thread: dict, msg: dict, g: dict, uid: str, move: Any) -> str | None:
        """Reversi, Draughts and Sea Battle: check the move, play it, and say who goes next."""
        turn = g["turn"]
        try:
            if g["kind"] == "dr":
                path = [int(x) for x in (move if isinstance(move, list) else str(move).split(","))]
                if len(path) < 2:
                    raise ValueError("Choose where the piece goes")
                G.dr_play(g, path, turn)
            else:
                idx = int(move)
                if g["kind"] == "rev":
                    G.rev_play(g, idx, turn)
                else:
                    G.sea_play(g, idx, turn)
        except (TypeError, ValueError) as err:
            raise _err("invalid_format", str(err) or "That move isn't allowed") from err
        g["moves"] = g.get("moves", 0) + 1
        self._save()
        self._push_update(thread, msg)
        if g.get("winner") is not None:
            return None
        nxt = g["players"][g["turn"]]
        return nxt if nxt and nxt != uid else None

    @callback
    def async_start_play(self: Messenger) -> None:
        """Timers keep going after a restart (any that finished meanwhile go off now)."""
        for tid, msgs in self.data["messages"].items():
            thread = self.data["threads"].get(tid)
            if not thread:
                continue
            for msg in msgs:
                if msg.get("type") == "timer":
                    self._arm_timer(thread, msg)
