# Endgame CPU Efficiency

## Target

At RCL7–8, squeeze every unnecessary CPU cost out of each room so the bot can manage as many rooms as possible within the 20 CPU budget. See plan 03 for the dynamic room scaling model and minimum per-room CPU targets.

## Core Principle

In the endgame, the bottleneck shifts from energy to CPU.
- Economy is stable: sources saturated, links routing energy, storage full.
- The main enemy is creep count × per-creep CPU cost.
- Goal: **fewer creeps, each doing more, each moving less.**

---

## 1. Creep Following (Pull Mechanic)

Screeps supports `creep.pull(other)` + `other.move(creep)`.
The pulled creep moves along with the puller without generating its own fatigue or pathfinding.

Use cases:

- **Hauler train**: One lead hauler pathfinds. Trailing haulers call `leadHauler.move(creep)` to follow. Only 1 pathfinding call for N haulers on the same route.
- **Bootstrap delivery**: A worker with energy pulls a miner to its slot during spawn.

Rules:
- The leader must actually move (not stand still) for pull to work.
- All creeps must be adjacent at the start.
- Useful only when 2+ creeps share the exact same route every tick.
- Not useful for miners or upgraders (stationary).

CPU saving: N haulers on same route → 1 pathfinding call instead of N. With R owned rooms × 2 haulers each → R fewer pathfinding calls per tick → ~0.2 × R CPU saved. Scales linearly with room count.

---

## 2. Fewer, Larger Creeps

At RCL7–8, spawn budgets are unconstrained. Prefer:

| Replace | With |
|---|---|
| 4 small haulers (10 CARRY) | 1 large hauler (40 CARRY) |
| 3 upgraders (5 WORK each) | 1 upgrader (15 WORK) |
| 2 builders (5 WORK each) | 1 builder (10 WORK) |

Every eliminated creep removes:
- 1 per-tick state machine evaluation.
- 1 per-tick movement command.
- 1 path entry in Memory.
- ~0.3–0.5 CPU/tick saved per creep.

At 50 creeps → 20 creeps: saves ~10–15 CPU/tick. On a 20 CPU server, this is transformative.

Body sizing for large creeps:
- Max body: 50 parts. Full 50-part body costs 150 ticks to spawn.
- Large hauler: `[CARRY×25, MOVE×13]` on roads = 1950 carry (39 CARRY-worth on road).
- Large upgrader: `[WORK×15, CARRY×5, MOVE×5]` capped at RCL8 upgrade limit.

---

## 3. Stationary Miner Optimization

Miners are already stationary. Further optimizations:

- `roundRobin = 2` only in endgame surplus rooms (see plan 02). Halves mining CPU when income loss is acceptable.
- In rooms with links: miner only needs to fill the link. Once the link is full, miner idles. Add an explicit idle check before harvesting.
- Miner container repair: only repair if hits < 80% capacity (not every tick). Current code repairs too frequently.

```
if (container.hits < container.hitsMax * 0.8) → repair
else → harvest
```

Skip the repair action entirely if no container is present or already full.

---

## 4. Link Network Replaces Haulers

At RCL5+, links eliminate hauling between source and storage:

```
Source link (fills from miner) → Central link → Storage/controller
```

CPU saved per room with links active:
- 2 haulers eliminated = ~0.8 CPU/tick per room.
- At N rooms: N × 0.8 CPU saved — this scales directly with room count and is the highest-impact optimization for maximizing room capacity.

Link-based rooms should spawn **zero haulers** from source to storage.
Only spawn haulers for routes that links cannot cover (e.g., dropped resources, tombstones, remote rooms without links).

---

## 5. Shared Route Cache (Path Deduplication)

Multiple creeps on the same fixed route (e.g., storage → controller, spawn → link) should share one serialized path.

```ts
// Global path cache (not Memory — rebuilt each tick if needed)
const sharedRoutes: Map<string, string> = new Map(); // key: "from:to:range"
```

On pathfinding:
1. Build cache key: `${from.roomName}_${from.x}_${from.y}:${to.x}_${to.y}:${range}`.
2. If key exists in `sharedRoutes`: use it directly.
3. If not: calculate once, store in `sharedRoutes` for this tick.

Same-tick benefit: if 3 upgraders all path to controller, only 1 PathFinder call.

---

## 6. Upgrader Positioning (Stationary at RCL8)

At RCL8, upgraders can and should be stationary:

- Place upgraders adjacent to the controller at spawn time (store target position in memory).
- Use `StationaryAnt` pattern: move once to position, then never move again.
- 15 WORK upgrader standing still = 0 pathfinding CPU, 0 fatigue, 0 movement.

If a container is placed adjacent to the controller, upgraders withdraw from it directly — no hauler needed.

---

## 7. Observer for Early Warning

At RCL8, the observer allows scanning one room per tick for free (negligible CPU).

Use:
- Scan adjacent rooms in rotation (1 room per tick).
- Look for hostile creeps or invader activity before they reach owned/remote rooms.
- Update `IntelManager` with scan results instead of waiting for creeps to be present.
- Pre-emptively suspend remote spawn demand if hostile detected 1–2 rooms away.

CPU cost: ~0.1 per tick. Value: potential save of 2–5 CPU when defense is avoidable.

---

## 8. Endgame Manager Skip List

Managers that are no longer needed at RCL8 and should be permanently skipped:

| Manager | Why skip at RCL8 |
|---|---|
| LayoutManager | All structures built |
| RoomPhaseManager.getProfile | Phase is final, no transitions |
| Phase exit criteria evaluation | Already at max phase |
| Source slot discovery | Already stable |
| Bootstrap cold-boot path | Room is fully operational |
| SpawnDemandManager cold-boot | Not reachable |

Add `if (room.memory.state === eRoomState.phase8) return;` at entry of each of these.

---

## 9. Memory Compaction

At scale, Memory can grow large and serialization/deserialization costs CPU every tick.

At RCL8:
- Remove stale path caches older than 100 ticks.
- Remove dead creep memory immediately on creep death (not deferred).
- Limit `Memory.remoteIntel` to actively-mined or candidate rooms only.
- Do not store detailed build-progress history longer than 100 ticks.

Keep `Memory.size` inspectable at `Memory.stats.memorySize` every 500 ticks.

---

## Summary of CPU Savings Per Room (RCL8, fully optimized)

| Optimization | CPU saved per room/tick | Notes |
|---|---|---|
| Link network (removes 2 haulers) | ~0.80 | Highest impact — do first |
| Fewer, larger creeps | ~0.30 | Depends on current creep count |
| Stationary upgrader | ~0.20 | Once, then permanent |
| Miner round-robin = 2 | ~0.15 | Only when storage full |
| Endgame skip list | ~0.12 | Phase8 short-circuits |
| Shared route cache | ~0.05 | Amortized |
| **Total per room** | **~1.62 → 0.55 CPU** | Unoptimized → optimized |

Each room saved ~1.07 CPU/tick after full optimization. With N owned rooms: `N × 1.07 CPU` freed — directly translating to additional room capacity.

Example: 10 rooms optimized frees ~10.7 CPU, enabling roughly 10 additional rooms at the new 0.55 CPU/room rate. The optimization compounds: more rooms → more rooms.

See plan 03 for the complete dynamic room scaling model and expansion decision logic.
