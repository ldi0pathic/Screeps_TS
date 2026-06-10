# Defense Baseline

## Target

Mandatory defense without aggressive player behavior.

## Policy

- Attack NPC invaders and invader cores in owned/reserved/economic rooms.
- Attack hostile creeps in owned rooms.
- In remote rooms: flee immediately on player sighting; defend only against NPC invaders if tower coverage exists.
- Do not raid, harass, dismantle, reserve, or attack other player rooms.
- Avoid rooms owned/reserved by other players.

## Current Code

- `TowerManager` attacks closest hostile to controller.
- `RoomManager` records `needDefence` and `invaderCore`.
- No hostile body analysis.
- No remote flee policy.

## Problems

- Tower target choice ignores healer presence — focusing a healer-supported attacker is CPU waste.
- Defense scans run in both `TowerManager` and `RoomManager` — duplicated, uncoordinated.
- No defender spawn demand.
- Remote creeps continue working when hostile players are present.
- Safe mode not planned — should be a last-resort reserve, not auto-trigger.

## Threat Reference (from docs/knowledge/mechanics/combat-defense.md and systems/threats-world.md)

### NPC Invaders

- Triggered when room has accumulated ≥ 100 000 energy over its history.
- ~10% chance per eligible tick. Frequency increases with room energy throughput.
- NPC invader bodies: attack + tough + move combinations. No heal.
- Tower at range 5 deals 600 damage/tick. At range 20: ~150 damage/tick.
- **Tower damage formula:** `max(150, 600 - (range - 5) × (450 / 20))` (approximately).
- A standard NPC invader (1500 HP tough + attack) is killed by one tower in 3–5 ticks at close range.

### Invader Cores (regular rooms)

- Invader cores appear in **regular rooms** that have been mined extensively.
- Triggered by sustained energy harvesting in that room.
- Small structure that spawns waves of NPC attackers.
- `invaderCore` in room memory — disable remote spawn demand for that room until `coreExpires`.

### Strongholds (highway rooms only)

- Level 1–5 invader strongholds with up to 20+ creeps at level 5.
- Appear **only in highway rooms** (the border rows/columns of the world grid).
- Regular owned rooms and normal remote rooms never have strongholds.
- Do not remote-mine highway rooms — strongholds respawn indefinitely.
- Separate from invader cores: strongholds are permanent fixtures of highway rooms.

### Player Threats

- No body formula available in advance — must scan and classify.
- Boosted attackers (UH/UH2O/XUH2O) can do 120–360 attack dps vs. 30 unboosted.
- A tower alone cannot stop a boosted player attacker at range > 10.
- Response: safe mode if tower is insufficient and room has claims remaining.

## Add

Create `DefenseManager`.

Responsibilities:

- Single hostile scan per visible room per tick.
- Classify threat: NPC invader, player, healer, boosted, ranged, dismantler.
- Choose tower target by killability score.
- Request defender spawn only when tower damage is clearly insufficient.
- Publish `RoomMemory.threat` for movement/jobs to consume.

## Tower Target Scoring

Priority order:

1. Healer with no attack support: eliminate first — stops regeneration chain.
2. Dismantler near owned structures: high asset risk.
3. Ranged attacker: consistent damage source.
4. Closest low-TOUGH attacker: easiest kill.
5. Skip: any target with enough heal to survive tower damage — waste of energy.

Quick check: if hostile has HEAL parts ≥ 3, and tower is at range ≥ 15, tower cannot kill. Flag room for defender spawn.

## Tower Placement Policy

Tower placement must optimize two costs:

- Combat distance: closer to expected breach, exit, and rampart lines gives higher damage/heal/repair output.
- Refill distance: towers spend up to 10 energy/tick while active. A tower that cannot be refilled quickly loses effective DPS.

Heuristic:

```text
tower_score =
  combat_coverage * 0.45 +
  refill_access * 0.35 +
  core_protection * 0.15 +
  redundancy * 0.05
```

Refill scoring:

- Path range <= 5 from storage/spawn/link/filler route: ideal.
- Path range <= 10: acceptable.
- Path range > 15: reject for the first/primary tower unless a dedicated road/refiller plan exists.

Placement by phase:

- RCL3: first tower near spawn/extension core and planned storage anchor. Refill access wins over edge range.
- RCL4-6: place towers on or beside the main filler route; roads to towers are mandatory.
- RCL7-8: distribute towers for overlap on likely breach zones, but keep all towers filler-reachable.

Rule: tower range is room-wide, but tower energy logistics are local. Empty tower = 0 DPS.

## Tower Repair Policy

Tower repair is not energy-efficient compared with creep repair:

| Method | Hits/energy |
|---|---:|
| Creep repair | 100 |
| Tower repair range <=5 | 80 |
| Tower repair range 15 | 40 |
| Tower repair range >=20 | 20 |

Policy:

- Keep tower energy reserved for defense first.
- Allow tower repair only when tower energy is above reserve threshold.
- Use tower repair for emergency patching and small nearby road/container damage.
- Use creep repair for planned maintenance, distant structures, ramparts, walls, and large repair backlogs.
- Do not treat tower repair as the default peacetime repair method just because it is convenient.

## Defense Phases

| Phase | Defense |
|---|---|
| 1–2 | Do not enter rooms with hostile presence. Use safe mode if spawner is threatened. |
| 3 | Tower active, single emergency defender spawnable. |
| 4–5 | Rampart + tower combination. Remote creeps flee on player sighting. |
| 6–8 | Body analysis, boosted defender hooks, observer intel for early warning. |

## Safe Mode Policy

- Safe mode lasts 20 000 ticks. Only one active per room. Cooldown 50 000 ticks.
- **Do not auto-trigger safe mode on NPC invaders** — towers handle them.
- **Only trigger safe mode when:** player attacker is about to destroy spawn/tower and no other defense is possible.
- Save safe mode uses as a true emergency reserve.

## Steps

1. Move hostile scan from `TowerManager`/`RoomManager` into `DefenseManager` — single source of truth.
2. Add `RoomMemory.threat: ThreatLevel` and `RoomMemory.threatExpires: number`.
3. Implement tower target scoring above.
4. Add remote creep rule: if `threat === 'player'` in remote room → flee to home room immediately.
5. Add NPC invader core check: `invaderCore === true` → suspend remote spawn demand for that room.
6. Add emergency defender spawn demand only when tower fails to kill.
7. Define safe mode trigger: strict conditions, manual override preferred over automation.

## Acceptance

- Owned room towers fire in the same tick a hostile becomes visible.
- Remote miners/haulers immediately stop working and flee on player sighting.
- Invader cores block remote spawn demand until `coreExpires`.
- NPC invaders in owned rooms are handled by towers alone at phases 3+.
- Safe mode is never triggered automatically by NPC invaders.
- No code initiates attacks on neutral or player economy rooms.
