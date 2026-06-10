# Passive Player Policy

## Target

Define exact rules for coexisting with other players without triggering conflicts.

## Core Principle

This bot is passive. It does not initiate any action that damages, displaces, or provokes other players. The goal is to operate invisibly — grow fast, mine efficiently, and avoid drawing attention or retaliation.

## Why Passiveness Matters on a 20 CPU Server

- An active defense war costs 5–10 CPU/tick minimum (pathfinding, combat, repair).
- That is 25–50% of the entire budget consumed just to not lose.
- Every tick spent on active PvP is a tick not spent on economy.
- The fastest growth strategy is to pick unchallenged areas and expand uncontested.

## Room Selection Rules

Never claim, reserve, or remote-mine:

- Any room owned by another player (`room.controller.owner !== null`).
- Any room reserved by another player (`room.controller.reservation.username`).
- Any room where another player's creeps are actively harvesting or building (seen in last 500 ticks — matches danger cooldown in this plan).
- Any highway room with Source Keepers (permanent high-threat NPCs).
- Any room within range-1 of a player-owned room (border risk).

Prefer:

- Rooms with 2 sources that have no player activity in last 2000 ticks.
- Rooms not on obvious expansion paths of nearby players.
- Rooms with short, safe routes from the home room (< 3 room hops).

## Intel Requirements

Before assigning a remote or expansion target, `IntelManager` must have:

- Room owner/reservation status (from `room.controller`).
- Last seen tick for any player creep activity.
- Invader core status.
- Source count.
- Route passability (no player rooms on path).

Intel TTL for player status checks:
- Active player room: re-check every 200 ticks.
- Empty room: re-check every 500 ticks.
- Previously hostile room: re-check every 1000 ticks.

## Creep Behavior Rules

**In any room where a player creep is present:**

- All own creeps stop working immediately.
- Miners park (stay but do not harvest).
- Haulers return home if carrying energy.
- Do not attack the player creep.
- Do not pick up dropped resources that a player creep just dropped (avoid theft perception).

**In an owned room under player attack:**

- Towers fire on attacking player creeps (this is defensive, not aggressive).
- Non-combat creeps flee to safe structures (storage area, behind ramparts).
- If towers cannot stop the attacker: trigger safe mode (last resort, see plan 08).
- Do not spawn offensive creeps to counterattack another player's rooms.

## Remote Creep Flee Rule

If `DefenseManager` marks a remote room as `threat = 'player'`:

1. All remote miners and haulers in that room immediately set target to home room.
2. Suspend remote spawn demand for that room for 500 ticks minimum.
3. Mark remote state as `danger` in `Memory.remoteIntel`.
4. Re-evaluate after the cooldown period using fresh intel.

## Resource Contention

If another player places a container or road in a room that is already assigned as a remote target:

- Do not remove their structure.
- Do not build overlapping structures.
- Evaluate whether the room is still worth mining given shared access.
- If the player is actively using the room, mark it `blocked` and find an alternative.

## Novice and Respawn Zones

From `docs/knowledge/systems/threats-world.md`:

- Novice zones restrict players above GCL3 from entering.
- Respawn zones are temporary safe areas.
- Do not place remotes in novice zones — they will become unavailable as GCL grows.
- Avoid expansion targets in novice/respawn areas — the protected status will end and invite conflict.

## No-Aggression Checks Checklist

Before any action that affects another player's room or creeps, verify:

- [ ] Is this a defensive action only (towers in own room)?
- [ ] Does this action affect only NPC targets (invaders, invader cores)?
- [ ] Does no own creep enter a player-owned/reserved room?
- [ ] Is no construction site placed in a contested room?
- [ ] Is no resource taken from a room a player is actively working?

If any check fails, block the action and log the violation to `Memory.debug.policyViolations`.

## Acceptance

- No own creep ever attacks a player creep proactively.
- No own creep ever enters a player-owned or player-reserved room.
- Remote activity pauses immediately on player sighting.
- Expansion targets never include rooms adjacent to active player bases.
- Policy violation log is inspectable in Memory for debugging.
