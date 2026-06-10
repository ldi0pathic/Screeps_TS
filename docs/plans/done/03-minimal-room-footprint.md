# Minimal Room Footprint (Dynamic Room Scaling)

## Target

Minimize CPU per owned room so the bot can manage as many rooms as the 20 CPU budget allows — not a fixed cap.

## Core Question

> How many rooms can fit in 20 CPU?

Answer: `floor((20 - baseCPU) / cpuPerRoom)` — where both values are measured at runtime, not hardcoded.

The goal of this plan is to drive `cpuPerRoom` as low as possible for phase8 rooms, so the denominator shrinks and the maximum room count grows.

---

## CPU Budget Model

```
totalCPU = 20
baseCPU  = fixed overhead (defense scan, spawn, cleanup) ≈ 2–3 CPU
remoteCPU = N_remotes × cpuPerRemote
availableCPU = totalCPU - baseCPU - remoteCPU
maxOwnedRooms = floor(availableCPU / cpuPerRoom)
```

The bot should measure `cpuPerRoom` from actual usage history (`Memory.cpuStats`) and use that to decide whether a new room can be added.

---

## Phase8 Minimum CPU Profile (Per Room)

A fully optimized RCL8 room with the strategies below costs approximately:

| Role / Manager | CPU/tick | Notes |
|---|---|---|
| Miners × 2 (roundRobin=2, stationary) | ~0.15 | Only in endgame when storage full |
| Haulers | 0 | Replaced entirely by link network |
| Upgrader × 1 (stationary, 15 WORK) | ~0.15 | Moves to position once, then never again |
| Filler × 1 (short cached path) | ~0.10 | Extensions + spawn |
| Tower targeting | ~0.05 | Shared scan via DefenseManager |
| Spawn demand check | ~0.03 | Stable rooms: rarely changes |
| Intel scan (amortized, every 20 ticks) | ~0.03 | |
| Memory overhead | ~0.04 | |
| **Total (optimized phase8)** | **~0.55 CPU/room** | |

At 20 CPU with 3 CPU base overhead = 17 CPU available:
`17 / 0.55 ≈ 30 rooms` — theoretical maximum, not counting remote overhead.

Realistic target: **10–15 owned rooms** depending on remote count.

---

## Strategy 1: Link Network as CPU Multiplier

The single highest-impact optimization per room.

Without links (haulers move every tick):
- 2 haulers × ~0.4 CPU each = **0.8 CPU/room** just for energy transport

With links (haulers eliminated):
- Source link fills passively from miner's container → central link → storage
- **0 haulers needed** for owned source → storage transport
- CPU saving: ~0.8 CPU/room

At N owned rooms: `N × 0.8 CPU` freed by completing the link network.
Priority: complete links in every owned room before expanding to the next.

Remaining haulers (only needed for):
- Dropped resource collection (rare)
- Tombstone pickup
- Remote rooms (no links there)

---

## Strategy 2: Stationary Upgrader

At RCL8 with a controller container:
- Upgrader moves once to assigned position adjacent to controller container.
- Stores `targetPos` in memory. Never moves again.
- Withdraws from container directly — no hauler needed to controller.
- CPU: ~0.15/tick (action only, zero pathfinding)

Without stationary upgrader: ~0.3–0.4 CPU/tick (movement + pathing every N ticks).

The `StationaryAnt` pattern already exists in the codebase — upgraders should use it at RCL8.

---

## Strategy 3: Phase8 Skip List

Once a room reaches phase8, permanently stop running:

| Skipped work | CPU saved (amortized) |
|---|---|
| RoomPhaseManager.getProfile | ~0.02 |
| LayoutManager | ~0.05 |
| Phase exit criteria evaluation | ~0.02 |
| Source slot re-discovery | ~0.02 |
| Bootstrap cold-boot path | ~0.01 |

Total amortized saving: ~0.12 CPU/room.
Combined across 10+ rooms: >1 CPU freed.

Implementation: single `if (phase === phase8) return;` at the start of each of these managers.

---

## Strategy 4: Consolidate Creeps (Fewer, Larger)

Every creep removed saves ~0.3–0.5 CPU/tick (state machine + movement + memory overhead).

Target creep count per optimized owned room:

| Role | Count | Notes |
|---|---|---|
| Miner | 2 | One per source, stationary |
| Upgrader | 1 | Stationary, 15 WORK |
| Filler | 1 | Extensions + spawn |
| Hauler | 0 | Link network replaces |
| Builder | 0 | Phase8: nothing to build |
| **Total** | **4 creeps** | |

Compare to unoptimized mid-game room: 8–12 creeps.
At 10 rooms: 40 creeps vs 100–120 creeps. Difference: ~20–40 CPU saved.

---

## Strategy 5: Minimal Spawn Demand in Stable Rooms

Stable phase8 rooms only need spawn demand recalculation when a creep dies.

Instead of scanning every 3–5 ticks: trigger demand recalculation on `CleanUpManager.onCreepDied(roomName)`.
Between deaths: skip demand calculation entirely.

CPU saving: ~0.03 CPU/room/tick amortized for stable rooms.

---

## Strategy 6: Observer Replaces Scouts

At RCL8, the observer scans 1 room per tick for ~0.1 CPU total across all rooms.
This replaces scout creeps entirely:
- No scout body cost (~350e/creep)
- No scout pathfinding
- No spawn slot consumption
- Observer provides intel with zero creep overhead

Assign observer rooms in rotation via `IntelManager`, feeding `RoomIntel` directly.

---

## Strategy 7: Per-Room CPU Measurement

To know when a new room can be added, measure actual CPU per room:

```
Memory.cpuStats.perRoom[roomName] = rollingAverage(measured, 100 ticks)
Memory.cpuStats.baseOverhead       = measured overhead without room logic
```

Before expanding to a new room:
```
projected = sum(Memory.cpuStats.perRoom) + estimatedCPUForNewRoom
if (projected + baseOverhead < 17) → expansion is safe
else → wait until existing rooms are more optimized
```

This makes the room cap self-adjusting — it shrinks when rooms are less optimized, grows as strategies are applied.

---

## Endgame Remote Rooms

Remote rooms also consume CPU. Minimizing remote cost:

| Role | CPU/tick |
|---|---|
| Remote miner × 1 (roundRobin=2 in endgame) | ~0.15 |
| Remote hauler × 1 (large, cached path) | ~0.20 |
| Reserver (rarely moves) | ~0.05 |
| Intel scan (amortized) | ~0.03 |
| **Total per remote room** | **~0.43 CPU** |

A 2-source remote: ~0.86 CPU. Similar cost to an owned room.
Budget remote rooms the same way as owned rooms — measure, then decide.

---

## Dynamic Expansion Decision

The bot should check before claiming a new room:

1. Measure `Memory.cpuStats.perRoom` average over last 500 ticks.
2. Estimate cost of new room: use current average as proxy.
3. Check: `currentTotalCPU + estimatedNewRoomCPU < 17` (3 CPU safety buffer).
4. If yes: expansion is safe. If no: optimize existing rooms first.

Do not expand until at least one owned room reaches full phase8 optimization (link network complete, stationary upgrader, 4-creep profile). That room becomes the reference for "minimum CPU per room".

---

## Target CPU Profile Summary

| Rooms | Owned CPU | Remote CPU | Base | Total | Fits in 20? |
|---|---|---|---|---|---|
| 5 owned + 5 remote | 5 × 0.55 = 2.75 | 5 × 0.43 = 2.15 | 2.5 | **7.4** | Yes — 12.6 headroom |
| 10 owned + 5 remote | 10 × 0.55 = 5.5 | 5 × 0.43 = 2.15 | 2.5 | **10.15** | Yes — 9.85 headroom |
| 15 owned + 10 remote | 15 × 0.55 = 8.25 | 10 × 0.43 = 4.3 | 2.5 | **15.05** | Yes — 4.95 headroom |
| 20 owned + 10 remote | 20 × 0.55 = 11.0 | 10 × 0.43 = 4.3 | 2.5 | **17.8** | Tight — 2.2 headroom |
| 25 owned + 10 remote | 25 × 0.55 = 13.75 | 10 × 0.43 = 4.3 | 2.5 | **20.55** | No — over budget |

With all strategies applied: **~20 owned rooms + 10 remotes is the theoretical ceiling** on 20 CPU.
Without optimization (unoptimized rooms at ~1.5 CPU each): ceiling drops to ~7 owned rooms.

## Acceptance

- No hardcoded room count limit in any manager or config.
- Room expansion is gated by measured CPU, not a fixed number.
- Each phase8 room costs ≤ 0.6 CPU/tick when all strategies are applied.
- `Memory.cpuStats.perRoom` is populated and used in expansion decisions.
- The bot self-regulates: stops expanding when projected CPU would exceed 17.
