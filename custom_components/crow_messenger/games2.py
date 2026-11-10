"""Rules for Hangman, Rock Paper Scissors, Higher or Lower, Dots and Boxes, Chess and Backgammon.

Plain functions with no Home Assistant in them, so they're easy to check. Each play function
changes the game dict it's given and raises ValueError for a move that isn't allowed.
"""
from __future__ import annotations

import hashlib
import random
import re

from .wordlists import HANG_WORDS

# ── Hangman ───────────────────────────────────────────────────────────────────
HANG_MAX = 7


def clean_phrase(text: str, lo: int = 2, hi: int = 30) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip().lower())
    if not re.fullmatch(r"[a-z][a-z '\-]*", t) or not lo <= len(t) <= hi:
        raise ValueError(f"Use {lo} to {hi} letters (spaces are fine)")
    return t


def hang_pattern(secret: str, guessed: list[str]) -> list[str]:
    return [ch if (not ch.isalpha() or ch in guessed) else "" for ch in secret]


def hang_new(word: str | None = None) -> dict:
    secret = clean_phrase(word, 3) if word else random.choice(HANG_WORDS)
    return {"secret": secret, "guessed": [], "wrong": 0, "pattern": hang_pattern(secret, [])}


def hang_play(g: dict, move: str, turn: int) -> None:
    guess = clean_phrase(str(move), 1)
    secret = g["secret"]
    if len(guess) == 1:
        if guess in g["guessed"]:
            raise ValueError("You've already tried that letter")
        g["guessed"].append(guess)
        if guess not in secret:
            g["wrong"] += 1
    else:
        if guess == secret:
            g["guessed"] += [c for c in set(secret) if c.isalpha() and c not in g["guessed"]]
        else:
            g["wrong"] += 1
    g["pattern"] = hang_pattern(secret, g["guessed"])
    g["moves"] = g.get("moves", 0) + 1
    if all(p for p in g["pattern"]):
        g["winner"] = 1                      # the guesser got it
    elif g["wrong"] >= HANG_MAX:
        g["winner"] = 0                      # the word's setter wins


# ── Rock Paper Scissors ───────────────────────────────────────────────────────
def rps_new(rounds: int = 3) -> dict:
    rounds = rounds if rounds in (1, 3, 5) else 3
    return {"need": rounds // 2 + 1, "scores": [0, 0], "picks": [None, None], "history": []}


def rps_play(g: dict, move: int, turn: int, solo: bool = False) -> None:
    m = int(move)
    if m not in (0, 1, 2):
        raise ValueError("Choose rock, paper or scissors")
    g["picks"][turn] = m
    if solo:
        g["picks"][1 - turn] = random.randrange(3)
    other = 1 - turn
    if g["picks"][other] is None:
        g["turn"] = other
        return
    a, b = g["picks"]
    g["history"].append([a, b])
    g["picks"] = [None, None]
    if a != b:
        g["scores"][0 if (a - b) % 3 == 1 else 1] += 1
    if max(g["scores"]) >= g["need"]:
        g["winner"] = 0 if g["scores"][0] > g["scores"][1] else 1
    else:
        g["turn"] = len(g["history"]) % 2


# ── Higher or Lower ───────────────────────────────────────────────────────────
def hol_deck(rng: random.Random | None = None) -> list[int]:
    d = list(range(52))
    (rng or random).shuffle(d)
    return d


def hol_new() -> dict:
    deck = hol_deck()
    return {"deck": deck, "card": deck.pop(), "streak": 0, "best": [None, None], "prev": None, "ok": None}


def hol_play(g: dict, move: int, turn: int) -> None:
    """move 1 = higher, 0 = lower. Same rank is a push (nothing happens)."""
    higher = int(move) == 1
    old = g["card"]
    new = g["deck"].pop()
    g["prev"], g["card"] = old, new
    a, b = old % 13, new % 13
    if a == b:
        g["ok"] = None
    elif (b > a) == higher:
        g["ok"] = True
        g["streak"] += 1
    else:
        g["ok"] = False
    if g["ok"] is False or not g["deck"]:
        g["best"][turn] = g["streak"]
        if turn == 0:
            g["turn"], g["streak"], g["deck"] = 1, 0, hol_deck()
            g["card"] = g["deck"].pop()
        else:
            x, y = g["best"]
            g["winner"] = "draw" if x == y else (0 if x > y else 1)


# ── Dots and Boxes (5 x 5 boxes) ──────────────────────────────────────────────
DB = 5   # boxes along a side; 6 x 6 dots; edges 0-29 horizontal, 30-59 vertical


def db_new() -> dict:
    return {"edges": [0] * 60, "boxes": [0] * 25, "score": [0, 0]}


def db_box_edges(r: int, c: int) -> tuple[int, int, int, int]:
    return (r * DB + c, (r + 1) * DB + c, 30 + r * (DB + 1) + c, 30 + r * (DB + 1) + c + 1)


def db_play(g: dict, move: int, turn: int) -> None:
    e = int(move)
    if not 0 <= e < 60:
        raise ValueError("Choose a line")
    if g["edges"][e]:
        raise ValueError("That line's already drawn")
    g["edges"][e] = turn + 1
    g["last"] = e
    got = 0
    for r in range(DB):
        for c in range(DB):
            if not g["boxes"][r * DB + c] and e in db_box_edges(r, c) and all(g["edges"][x] for x in db_box_edges(r, c)):
                g["boxes"][r * DB + c] = turn + 1
                got += 1
    g["score"][turn] += got
    g["got"] = got
    if all(g["boxes"]):
        a, b = g["score"]
        g["winner"] = "draw" if a == b else (0 if a > b else 1)
    elif not got:
        g["turn"] = 1 - turn          # completing a box means you go again


# ── Chess ─────────────────────────────────────────────────────────────────────
# Board: 64 squares, row by row from the top (a8 first). White is positive, black negative:
# 1 pawn, 2 knight, 3 bishop, 4 rook, 5 queen, 6 king. The first player is white.
KN = ((-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1))
KG = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))
BD = ((-1, -1), (-1, 1), (1, -1), (1, 1))
RD = ((-1, 0), (1, 0), (0, -1), (0, 1))


def ch_new() -> dict:
    back = [4, 2, 3, 5, 6, 3, 2, 4]
    board = [-p for p in back] + [-1] * 8 + [0] * 32 + [1] * 8 + back
    g = {"board": board, "castle": [True] * 4, "ep": -1, "half": 0, "check": False, "cap": [[], []], "promo": None}
    g["hist"] = [ch_key(g, 0)]
    g["legal"] = ch_legal_pairs(g, 0)
    return g


def ch_key(g: dict, turn: int) -> str:
    raw = ",".join(map(str, g["board"])) + f"|{turn}|{''.join('1' if x else '0' for x in g['castle'])}|{g['ep']}"
    return hashlib.sha1(raw.encode()).hexdigest()[:10]


def ch_attacked(board: list[int], sq: int, by_white: bool) -> bool:
    """Is sq attacked by the white (or black) pieces?"""
    s = 1 if by_white else -1
    r, c = divmod(sq, 8)
    pr = r + 1 if by_white else r - 1            # a white pawn attacks upward, so it sits below
    for dc in (-1, 1):
        if 0 <= pr < 8 and 0 <= c + dc < 8 and board[pr * 8 + c + dc] == s:
            return True
    for dr, dc in KN:
        if 0 <= r + dr < 8 and 0 <= c + dc < 8 and board[(r + dr) * 8 + c + dc] == 2 * s:
            return True
    for dr, dc in KG:
        if 0 <= r + dr < 8 and 0 <= c + dc < 8 and board[(r + dr) * 8 + c + dc] == 6 * s:
            return True
    for dirs, pcs in ((BD, (3, 5)), (RD, (4, 5))):
        for dr, dc in dirs:
            rr, cc = r + dr, c + dc
            while 0 <= rr < 8 and 0 <= cc < 8:
                v = board[rr * 8 + cc]
                if v:
                    if v * s in pcs:
                        return True
                    break
                rr, cc = rr + dr, cc + dc
    return False


def ch_pseudo(g: dict, white: bool) -> list[tuple[int, int, int]]:
    """(from, to, promotion piece or 0) ignoring whether the king is left in check."""
    board, s, out = g["board"], (1 if white else -1), []
    for i, v in enumerate(board):
        if v * s <= 0:
            continue
        p, (r, c) = abs(v), divmod(i, 8)
        if p == 1:
            fwd = -1 if white else 1
            start = 6 if white else 1
            last = 0 if white else 7
            r1 = r + fwd
            if 0 <= r1 < 8:
                if not board[r1 * 8 + c]:
                    for pr in ((5, 4, 3, 2) if r1 == last else (0,)):
                        out.append((i, r1 * 8 + c, pr))
                    if r == start and not board[(r + 2 * fwd) * 8 + c]:
                        out.append((i, (r + 2 * fwd) * 8 + c, 0))
                for dc in (-1, 1):
                    if 0 <= c + dc < 8:
                        t = r1 * 8 + c + dc
                        if board[t] * s < 0 or t == g["ep"]:
                            for pr in ((5, 4, 3, 2) if r1 == last else (0,)):
                                out.append((i, t, pr))
        elif p in (2, 6):
            for dr, dc in (KN if p == 2 else KG):
                rr, cc = r + dr, c + dc
                if 0 <= rr < 8 and 0 <= cc < 8 and board[rr * 8 + cc] * s <= 0:
                    out.append((i, rr * 8 + cc, 0))
            if p == 6:
                home = 60 if white else 4
                if i == home and not ch_attacked(board, home, not white):
                    k, q = (g["castle"][0], g["castle"][1]) if white else (g["castle"][2], g["castle"][3])
                    if k and board[home + 3] == 4 * s and not board[home + 1] and not board[home + 2] \
                            and not ch_attacked(board, home + 1, not white) and not ch_attacked(board, home + 2, not white):
                        out.append((i, home + 2, 0))
                    if q and board[home - 4] == 4 * s and not board[home - 1] and not board[home - 2] and not board[home - 3] \
                            and not ch_attacked(board, home - 1, not white) and not ch_attacked(board, home - 2, not white):
                        out.append((i, home - 2, 0))
        else:
            dirs = BD if p == 3 else RD if p == 4 else BD + RD
            for dr, dc in dirs:
                rr, cc = r + dr, c + dc
                while 0 <= rr < 8 and 0 <= cc < 8:
                    t = rr * 8 + cc
                    if board[t] * s > 0:
                        break
                    out.append((i, t, 0))
                    if board[t]:
                        break
                    rr, cc = rr + dr, cc + dc
    return out


def ch_make(g: dict, f: int, t: int, promo: int) -> tuple[list[int], int]:
    """The board after the move, and the piece taken (0 if none). Doesn't touch g."""
    board = list(g["board"])
    v = board[f]
    s = 1 if v > 0 else -1
    taken = board[t]
    board[t], board[f] = v, 0
    if abs(v) == 1:
        if t == g["ep"] and not taken and f % 8 != t % 8:
            taken = board[t + 8 * s]
            board[t + 8 * s] = 0
        if promo and t // 8 in (0, 7):
            board[t] = promo * s
    if abs(v) == 6 and abs(t - f) == 2:
        if t > f:
            board[f + 1], board[f + 3] = board[f + 3], 0
        else:
            board[f - 1], board[f - 4] = board[f - 4], 0
    return board, taken


def ch_king(board: list[int], white: bool) -> int:
    return board.index(6 if white else -6)


def ch_legal(g: dict, turn: int) -> list[tuple[int, int, int]]:
    white = turn == 0
    out = []
    for f, t, pr in ch_pseudo(g, white):
        board, _ = ch_make(g, f, t, pr)
        if not ch_attacked(board, ch_king(board, white), not white):
            out.append((f, t, pr))
    return out


def ch_legal_pairs(g: dict, turn: int) -> list[list[int]]:
    seen, out = set(), []
    for f, t, _ in ch_legal(g, turn):
        if (f, t) not in seen:
            seen.add((f, t))
            out.append([f, t])
    return out


def _insufficient(board: list[int]) -> bool:
    rest = [abs(v) for v in board if v and abs(v) != 6]
    return not rest or (len(rest) == 1 and rest[0] in (2, 3))


def ch_play(g: dict, move: list[int], turn: int) -> None:
    if not isinstance(move, list) or len(move) < 2:
        raise ValueError("Choose a piece and where it goes")
    f, t = int(move[0]), int(move[1])
    promo = int(move[2]) if len(move) > 2 else 0
    legal = [m for m in ch_legal(g, turn) if m[0] == f and m[1] == t]
    if not legal:
        raise ValueError("That piece can't go there")
    if len(legal) > 1:                                   # a pawn reaching the end: queen unless told otherwise
        mv = next((m for m in legal if m[2] == (promo or 5)), None)
        if not mv:
            raise ValueError("Choose a piece to promote to")
    else:
        mv = legal[0]
    pr = mv[2]
    white = turn == 0
    v = g["board"][f]
    board, taken = ch_make(g, f, t, pr)
    # castling rights
    c = g["castle"]
    if abs(v) == 6:
        c[0 if white else 2] = c[1 if white else 3] = False
    for sq, idx in ((63, 0), (56, 1), (7, 2), (0, 3)):
        if f == sq or t == sq:
            c[idx] = False
    g["ep"] = (f + t) // 2 if abs(v) == 1 and abs(t - f) == 16 else -1
    g["half"] = 0 if (abs(v) == 1 or taken) else g["half"] + 1
    g["board"] = board
    if taken:
        g["cap"][turn].append(abs(taken))
    g["last"], g["promo"] = [f, t], pr or None
    nxt = 1 - turn
    g["check"] = ch_attacked(board, ch_king(board, nxt == 0), white)
    g["hist"].append(ch_key(g, nxt))
    legal_next = ch_legal_pairs(g, nxt)
    g["legal"] = legal_next
    g["end"] = None
    if not legal_next:
        g["winner"] = turn if g["check"] else "draw"
        g["end"] = "checkmate" if g["check"] else "stalemate"
    elif g["hist"].count(g["hist"][-1]) >= 3:
        g["winner"], g["end"] = "draw", "repetition"
    elif g["half"] >= 100:
        g["winner"], g["end"] = "draw", "fifty"
    elif _insufficient(board):
        g["winner"], g["end"] = "draw", "material"
    else:
        g["turn"] = nxt
        g["legal"] = legal_next
    if g.get("winner") is not None:
        g["legal"] = []


# ── Backgammon ────────────────────────────────────────────────────────────────
# Points 1-24. Positive numbers are the first player's checkers (they move 24 -> 1 and bear
# off past 1); negative are the second player's (1 -> 24, off past 24). A move is
# [from, to]: from 0 = the bar; to 0 = off for the first player, 25 = off for the second.
def bg_new() -> dict:
    pts = [0] * 25
    for p, n in ((24, 2), (13, 5), (8, 3), (6, 5)):
        pts[p] = n
        pts[25 - p] = -n
    g = {"pts": pts, "bar": [0, 0], "off": [0, 0], "dice": [], "roll": None, "note": None}
    return g


def _bg_dist(f: int, side: int) -> int:
    return f if side == 0 else 25 - f


def _bg_moves(pts, bar, off, side: int, d: int) -> list[tuple[int, int]]:
    s = 1 if side == 0 else -1
    out = []
    if bar[side]:
        t = 25 - d if side == 0 else d
        if pts[t] * s >= -1:
            out.append((0, t))
        return out
    home = all(pts[p] * s <= 0 for p in (range(7, 25) if side == 0 else range(1, 19)))
    for f in range(1, 25):
        if pts[f] * s <= 0:
            continue
        t = f - d if side == 0 else f + d
        if 1 <= t <= 24:
            if pts[t] * s >= -1:
                out.append((f, t))
        elif home:
            dist = _bg_dist(f, side)
            if d == dist or (d > dist and all(pts[p] * s <= 0 for p in (range(f + 1, 7) if side == 0 else range(19, f)))):
                out.append((f, 0 if side == 0 else 25))
    return out


def _bg_apply(pts, bar, off, side: int, f: int, t: int):
    pts, bar, off = list(pts), list(bar), list(off)
    s = 1 if side == 0 else -1
    if f == 0:
        bar[side] -= 1
    else:
        pts[f] -= s
    if t in (0, 25):
        off[side] += 1
    else:
        if pts[t] * s == -1:
            pts[t] = 0
            bar[1 - side] += 1
        pts[t] += s
    return tuple(pts), tuple(bar), tuple(off)


def _bg_best(state, side: int, dice: tuple, memo: dict) -> int:
    key = (state, side, dice)
    if key in memo:
        return memo[key]
    best = 0
    for d in set(dice):
        rest = list(dice)
        rest.remove(d)
        rest = tuple(rest)
        for f, t in _bg_moves(*state, side, d):
            best = max(best, 1 + _bg_best(_bg_apply(*state, side, f, t), side, rest, memo))
    memo[key] = best
    return best


def bg_legal(g: dict, side: int) -> list[tuple[int, int, int]]:
    """Every (from, to, die) that may be played now, keeping to 'use as many dice as you can'."""
    dice = tuple(sorted(g["dice"]))
    if not dice:
        return []
    state = (tuple(g["pts"]), tuple(g["bar"]), tuple(g["off"]))
    memo: dict = {}
    top = _bg_best(state, side, dice, memo)
    if not top:
        return []
    cands = []
    for d in sorted(set(dice)):
        rest = list(dice)
        rest.remove(d)
        rest = tuple(rest)
        for f, t in _bg_moves(*state, side, d):
            if 1 + _bg_best(_bg_apply(*state, side, f, t), side, rest, memo) == top:
                cands.append((f, t, d))
    if top == 1 and len(set(dice)) == 2:
        big = max(dice)
        if any(c[2] == big for c in cands):
            cands = [c for c in cands if c[2] == big]
    return cands


def _bg_pairs(cands) -> list[list[int]]:
    seen, out = set(), []
    for f, t, _ in cands:
        if (f, t) not in seen:
            seen.add((f, t))
            out.append([f, t])
    return out


def _bg_next(g: dict, side: int) -> None:
    """After a roll or a move: end the turn if nothing more can be played."""
    cands = bg_legal(g, side)
    if cands:
        g["legal"] = _bg_pairs(cands)
        return
    g["legal"], g["dice"] = [], []
    if g["off"][side] >= 15:
        g["winner"] = side
    else:
        g["turn"] = 1 - side


def bg_play(g: dict, move, turn: int, rng: random.Random | None = None) -> None:
    rng = rng or random
    g.setdefault("legal", [])
    if move == "roll":
        if g["dice"]:
            raise ValueError("You've already rolled")
        a, b = rng.randint(1, 6), rng.randint(1, 6)
        g["dice"] = [a] * 4 if a == b else [a, b]
        g["roll"], g["note"] = [a, b], None
        g["rolls"] = g.get("rolls", 0) + 1
        before = g["turn"]
        _bg_next(g, turn)
        if g["turn"] != before and g.get("winner") is None:
            g["note"] = "no moves"
        return
    if not isinstance(move, list) or len(move) != 2:
        raise ValueError("Roll the dice first" if not g["dice"] else "Choose a checker and where it goes")
    if not g["dice"]:
        raise ValueError("Roll the dice first")
    f, t = int(move[0]), int(move[1])
    options = [c for c in bg_legal(g, turn) if c[0] == f and c[1] == t]
    if not options:
        raise ValueError("That checker can't go there")
    d = min(c[2] for c in options)
    state = _bg_apply(tuple(g["pts"]), tuple(g["bar"]), tuple(g["off"]), turn, f, t)
    g["pts"], g["bar"], g["off"] = list(state[0]), list(state[1]), list(state[2])
    g["dice"].remove(d)
    g["last"] = t
    g["moved"] = [f, t]
    _bg_next(g, turn)
