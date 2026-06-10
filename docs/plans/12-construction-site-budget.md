# Construction Site Budget

## Target

Manage global construction site slots (100 total) so that multiple rooms and remotes can always build what they need.

## Why This Matters

Screeps allows a maximum of **100 construction sites** globally per account.
If one room's LayoutManager places 60 sites at once, no other room can build containers, roads, or extension paths.

At 5 owned + 5 remote rooms:
- Each remote needs 1–3 sites for containers and roads.
- Each owned room needs ongoing sites for new structures.
- Emergency bootstrap (new room, lost structures) needs immediate capacity.

Without a budget, the first room to run LayoutManager will exhaust all slots.

## Global Slot Allocation

| Consumer | Max simultaneous sites |
|---|---|
| LayoutManager per owned room | **5 sites max** (never more) |
| Remote roads + containers (per remote room) | 3 sites |
| Bootstrap emergency (cold room recovery) | 5 sites (reserved) |
| Unmanaged / manual | 10 sites (buffer) |
| **Total managed** | **≤ 75 sites** (leaves 25 buffer) |

LayoutManager must never exceed its room quota regardless of how many structures remain to be built. Build them incrementally over many ticks — not all at once.

## Current Problem in LayoutManager

`src/manager/LayoutManager.ts` currently places structures based on available slots at RCL without checking the global site count. It can place up to 25 sites in one call.

Changes needed:

1. Before placing any site, check:
   ```ts
   const globalUsed = Object.keys(Game.constructionSites).length;
   const roomSites = room.find(FIND_CONSTRUCTION_SITES).length;
   ```
2. Set `maxNewSitesPerRoom = 5` as a hard limit.
3. Set `maxNewSitesPerCall = min(maxNewSitesPerRoom - roomSites, globalBudget - globalUsed)`.
4. Place sites in priority order:
   - First: structures required for income (containers, extensions, storage, spawn).
   - Second: roads on active hauler routes.
   - Third: defensive structures (ramparts, walls).
   - Last: cosmetic roads, observer, nuker, factory, power spawn.

## Priority Queue for Placement

| Priority | Structure | Condition |
|---|---|---|
| 1 | Spawn (if missing) | Always |
| 2 | Container (near source) | Miner exists or will exist |
| 3 | Extensions | Count < RCL max |
| 4 | Storage | RCL4+, not yet built |
| 5 | Tower | RCL3+, count < RCL max |
| 6 | Roads (source → spawn) | Hauler route active |
| 7 | Roads (spawn → controller) | Upgrader route active |
| 8 | Link | RCL5+, count < RCL max |
| 9 | Terminal | RCL6+ |
| 10 | Ramparts/walls | After core economy stable |
| 11 | All other roads | Low priority, slow rollout |
| 12 | Factory, Observer, Nuker, Power Spawn | Phase 7–8 only |

## Staggering

LayoutManager must not run every tick. From plan 06:
- Run every 50 ticks per room (staggered by room index).
- Skip phase8 rooms (all structures built).
- Skip if bucket < 3000.

Each run: place at most `maxNewSitesPerCall` sites. If quota is full, do nothing and wait for existing sites to complete.

## Remote Room Sites

Remote rooms need containers (1 per source) and roads (source → exit tile).
These are managed by `RemotePlanner`, not `LayoutManager`.
`RemotePlanner` must also respect the global budget:
- Reserve 3 slots per active remote room.
- Do not place remote roads if global sites > 70 (keeps total under 80, consistent with Acceptance criterion).

## Acceptance

- `LayoutManager` never places more than 5 sites per room per call.
- Global site count never exceeds 80 under normal conditions.
- Remote containers and roads can always be placed (budget reserved).
- A new bootstrap room can immediately place spawn + container sites.
- Phase8 rooms never consume construction site slots.
