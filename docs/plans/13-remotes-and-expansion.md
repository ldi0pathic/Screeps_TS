# Remotes And Expansion

## Target

Only run remotes and expansion when net positive and defensible.

## Current Code

- `roomConfig` hardcodes remote rooms and `spawnRoom`.
- `remoteMinerPerSource` can be fractional.
- Remote logic runs by static config flags.
- Scout stores some room data.

## Problems

- No ROI check.
- No route distance or carry demand estimate.
- No player-room avoidance policy.
- No phase gate beyond config.
- Maintenance costs of remote containers and roads not accounted for.

## Remote ROI Formula (from docs/knowledge/efficiency/energy-economy.md)

```text
gross         = sourceCount × (reserved ? 10 : 5)   [e/t]
haulerCost    = bodyCost(haulers) / 1500             [e/t amortized]
minerCost     = bodyCost(miners)  / 1500             [e/t amortized]
reserverCost  = bodyCost(reserver) / 600             [e/t amortized, CLAIM x1 + MOVE x1 = 650e]
containerMaint= 0.5 per container                   [e/t, unowned = 5000 hits / 100 ticks decay]
roadMaint     = 0.001 (plain) or 0.005 (swamp) per road tile per tick
net           = gross - haulerCost - minerCost - reserverCost - containerMaint - roadMaint - riskPenalty
```

Accept remote only if `net > 3 e/t` after all costs. Reject if net is uncertain or marginal.

### Key Maintenance Constants

| Structure | Decay | Cost per tick |
|---|---|---|
| Container (unowned room) | 5 000 / 100 ticks | 0.5 e/t passive |
| Container (owned/reserved) | 5 000 / 500 ticks | 0.1 e/t passive |
| Road (plain) | 100 / 1000 ticks | 0.001 e/t |
| Road (swamp) | 500 / 1000 ticks | 0.005 e/t |

Reserving the remote room changes container decay from 100-tick to 500-tick rate — strong incentive to reserve.

## Room Avoidance Rules (passive player policy)

Never remote-mine or path through:

- Player-owned rooms (any `room.controller.owner !== null`).
- Player-reserved rooms (`room.controller.reservation.username !== null`).
- Rooms with an active **invader core** (`invaderCore` in room memory) — suspend until `coreExpires`.
- **Highway rooms** — rows/columns of the world grid containing Source Keepers and permanent Strongholds.
- **Source Keeper (SK) rooms** — rooms at coordinates divisible by 10, 3 rooms from highways. SK creeps have 1300 HP and attack range 5, constantly respawn.
- Rooms marked `novice` or `respawn zone` if GCL restriction would prevent claiming.

Note: Invader cores (regular rooms) and Strongholds (highway rooms only) are distinct threats. See plan 08 for details.

## Remote States

```ts
type RemoteState =
  | 'unknown'
  | 'scouting'
  | 'blocked'        // player, SK, stronghold
  | 'candidate'      // positive ROI, safe route
  | 'reserved'
  | 'mining'
  | 'danger'         // hostile detected, temporary suspend
  | 'disabled';      // manual or permanent disable
```

## Scouting Intel TTL

- Unknown rooms: scout immediately when GCL allows expansion.
- Known candidate rooms: re-verify every 500 ticks.
- Blocked rooms (player/SK): re-check every 2000 ticks (status can change).
- Rooms with invader core: re-check every 50 ticks until core expires.

## Expansion Rules

- Prefer two-source rooms.
- Avoid player-owned/reserved rooms.
- Parent room must have storage > 50 000 and spawn utilization < 70%.
- New room runs bootstrap logic only (plan 11) — no remotes until RCL3+.
- Defense path (tower) required before activating remotes from new room.
- Do not expand if active threat in any owned room.

## Steps

1. Replace static remote list with `Memory.remoteIntel[roomName]: RoomIntel`.
2. Keep config only as allowlist/denylist for manual override.
3. Add `RemotePlanner.run()` every 200 ticks (staggered by owned room index).
4. Estimate route length from `IntelManager` cached path or linear fallback (distance × 1.3).
5. Compute required miners/haulers/reserver using formulas above.
6. Disable remote if any condition:
   - Player-owned/reserved room on route or target.
   - Stronghold/core active in target room.
   - Hostile player creep seen in target or route in last 500 ticks (matches plan 01 danger cooldown).
   - Net income below 3 e/t.
   - Home CPU bucket below 3000.
7. Allow expansion only after local economy is at **phase 4 exit criteria**: storage built and consistently filling (see plan 04). Do not wait for phase 5 (terminal/100k) — that is too late for fast growth.

## Acceptance

- No remote creeps spawn from static config alone.
- Remote hauler CARRY scales with measured route distance.
- Remote suspends immediately under threat, resumes when clear.
- Expansion does not starve the parent room.
- SK and player-owned rooms are never entered for economic purposes.
- Container maintenance costs are included in all ROI calculations.
