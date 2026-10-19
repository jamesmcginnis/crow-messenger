"""Rules for the bigger board games: Reversi, Draughts and Sea Battle.

Plain functions with no Home Assistant in them, so they're easy to check. Every board
is 8 x 8 and stored as a list of 64 squares, row by row from the top.
"""
from __future__ import annotations

import random

N = 8
DIRS8 = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))


def _rc(i: int) -> tuple[int, int]:
    return divmod(i, N)


def _ok(r: int, c: int) -> bool:
    return 0 <= r < N and 0 <= c < N


# ── Reversi ───────────────────────────────────────────────────────────────────
# 1 = the first player's discs (dark), 2 = the second player's (light). Dark starts.
def rev_new() -> list[int]:
    b = [0] * 64
    b[27] = b[36] = 2
    b[28] = b[35] = 1
    return b


def rev_flips(board: list[int], idx: int, who: int) -> list[int]:
    """The discs a disc placed at idx would turn over (none means it isn't a move)."""
    if not 0 <= idx < 64 or board[idx]:
        return []
    other = 3 - who
    r0, c0 = _rc(idx)
    out: list[int] = []
    for dr, dc in DIRS8:
        run, r, c = [], r0 + dr, c0 + dc
        while _ok(r, c) and board[r * N + c] == other:
            run.append(r * N + c)
            r, c = r + dr, c + dc
        if run and _ok(r, c) and board[r * N + c] == who:
            out += run
    return out


def rev_moves(board: list[int], who: int) -> list[int]:
    return [i for i in range(64) if not board[i] and rev_flips(board, i, who)]


def rev_play(g: dict, idx: int, turn: int) -> None:
    """Place a disc for player turn (0 or 1). Sets the next turn, or the winner."""
    board, who = g["board"], turn + 1
    flips = rev_flips(board, idx, who)
    if not flips:
        raise ValueError("That square doesn't turn over any discs")
    board[idx] = who
    for f in flips:
        board[f] = who
    g["last"], g["flipped"], g["passed"] = idx, flips, None
    nxt = 1 - turn
    if rev_moves(board, nxt + 1):
        g["turn"] = nxt
    elif rev_moves(board, who):
        g["turn"] = turn            # the other player can't go, so this player goes again
        g["passed"] = nxt
    else:
        a, b = board.count(1), board.count(2)
        g["winner"] = "draw" if a == b else (0 if a > b else 1)
    g["score"] = [board.count(1), board.count(2)]


# ── Draughts (English rules) ──────────────────────────────────────────────────
# 1 / 3 = the first player's man / king, 2 / 4 = the second player's. The first player
# starts at the bottom (rows 5-7) and moves up; pieces stand on the dark squares only.
# Taking is compulsory and a capture keeps going while it can; a man that reaches the far
# row is crowned and its turn ends there.
DRAW_PLIES = 80   # 40 moves each with nothing taken and nobody crowned is a draw


def dr_new() -> list[int]:
    b = [0] * 64
    for i in range(64):
        r, c = _rc(i)
        if (r + c) % 2 == 1:
            if r <= 2:
                b[i] = 2
            elif r >= 5:
                b[i] = 1
    return b


def dr_owner(v: int) -> int | None:
    return 0 if v in (1, 3) else 1 if v in (2, 4) else None


def _dr_dirs(v: int) -> tuple[tuple[int, int], ...]:
    if v in (3, 4):
        return ((-1, -1), (-1, 1), (1, -1), (1, 1))
    return ((-1, -1), (-1, 1)) if v == 1 else ((1, -1), (1, 1))


def _dr_crowns(v: int, i: int) -> bool:
    r = i // N
    return (v == 1 and r == 0) or (v == 2 and r == N - 1)


def _dr_jumps(board: list[int], start: int, v: int, pos: int, taken: list[int]) -> list[tuple[list[int], list[int]]]:
    """Every complete capture sequence from pos: (path, pieces taken)."""
    seqs = []
    r0, c0 = _rc(pos)
    me = dr_owner(v)
    for dr, dc in _dr_dirs(v):
        r1, c1, r2, c2 = r0 + dr, c0 + dc, r0 + 2 * dr, c0 + 2 * dc
        if not _ok(r2, c2):
            continue
        mid, land = r1 * N + c1, r2 * N + c2
        if mid in taken or dr_owner(board[mid]) not in (1 - me,):
            continue
        if board[land] and land != start:
            continue
        nt = taken + [mid]
        if _dr_crowns(v, land):
            seqs.append(([land], nt))          # crowned: the move ends here
            continue
        more = _dr_jumps(board, start, v, land, nt)
        if more:
            seqs += [([land] + p, t) for p, t in more]
        else:
            seqs.append(([land], nt))
    return seqs


def dr_moves(board: list[int], turn: int) -> list[dict]:
    """Every legal move for player turn: {"path": [from, to, ...], "taken": [...]}."""
    caps, steps = [], []
    for i, v in enumerate(board):
        if dr_owner(v) != turn:
            continue
        for path, taken in _dr_jumps(board, i, v, i, []):
            caps.append({"path": [i] + path, "taken": taken})
        if caps:
            continue
        r0, c0 = _rc(i)
        for dr, dc in _dr_dirs(v):
            r, c = r0 + dr, c0 + dc
            if _ok(r, c) and not board[r * N + c]:
                steps.append({"path": [i, r * N + c], "taken": []})
    return caps if caps else steps


def dr_play(g: dict, path: list[int], turn: int) -> None:
    board = g["board"]
    legal = dr_moves(board, turn)
    mv = next((m for m in legal if m["path"] == path), None)
    if not mv:
        if any(m["taken"] for m in legal):
            raise ValueError("You have to take a piece")
        raise ValueError("That piece can't go there")
    src, dst = path[0], path[-1]
    v = board[src]
    board[src] = 0
    for t in mv["taken"]:
        board[t] = 0
    crowned = _dr_crowns(v, dst)
    board[dst] = v + 2 if crowned else v
    g["last"], g["path"], g["taken"] = dst, path, mv["taken"]
    g["quiet"] = 0 if (mv["taken"] or crowned) else int(g.get("quiet", 0)) + 1
    nxt = 1 - turn
    g["count"] = [sum(1 for x in board if dr_owner(x) == 0), sum(1 for x in board if dr_owner(x) == 1)]
    if not dr_moves(board, nxt):
        g["winner"] = turn                     # nothing left to move: this player wins
    elif g["quiet"] >= DRAW_PLIES:
        g["winner"] = "draw"
    else:
        g["turn"] = nxt


# ── Sea Battle ────────────────────────────────────────────────────────────────
# Each player's fleet is hidden from the other: Home Assistant keeps the ships and only
# says where shots landed. Shots: 0 not fired at, 1 miss, 2 hit, 3 part of a sunk ship.
SHIPS = (4, 3, 3, 2, 2)


def sea_fleet(rng: random.Random | None = None) -> list[list[int]]:
    """Ships placed at random, straight, never touching (not even corner to corner)."""
    rng = rng or random.Random()
    while True:
        used: set[int] = set()
        fleet: list[list[int]] = []
        for size in SHIPS:
            for _ in range(200):
                horiz = rng.random() < 0.5
                r = rng.randrange(N if horiz else N - size + 1)
                c = rng.randrange(N - size + 1 if horiz else N)
                cells = [(r * N + c + k) if horiz else ((r + k) * N + c) for k in range(size)]
                if any(x in used for x in cells):
                    continue
                fleet.append(cells)
                for x in cells:
                    xr, xc = _rc(x)
                    for dr in (-1, 0, 1):
                        for dc in (-1, 0, 1):
                            if _ok(xr + dr, xc + dc):
                                used.add((xr + dr) * N + xc + dc)
                break
            else:
                break
        if len(fleet) == len(SHIPS):
            return fleet


def sea_new() -> dict:
    return {"shots": [[0] * 64, [0] * 64], "sunk": [[], []], "fleets": [sea_fleet(), sea_fleet()]}


def sea_play(g: dict, idx: int, turn: int) -> str:
    """Fire at the other player's waters. Returns "miss", "hit" or "sunk"."""
    target = 1 - turn
    shots = g["shots"][target]
    if not 0 <= idx < 64:
        raise ValueError("Choose a square")
    if shots[idx]:
        raise ValueError("You've already fired there")
    ship = next((s for s in g["fleets"][target] if idx in s), None)
    result = "miss"
    if not ship:
        shots[idx] = 1
    else:
        shots[idx] = 2
        result = "hit"
        if all(shots[x] for x in ship):
            for x in ship:
                shots[x] = 3
            g["sunk"][target].append(sorted(ship))
            result = "sunk"
    g["last"], g["last_board"], g["result"] = idx, target, result
    if len(g["sunk"][target]) == len(SHIPS):
        g["winner"] = turn
    else:
        g["turn"] = target
    return result
