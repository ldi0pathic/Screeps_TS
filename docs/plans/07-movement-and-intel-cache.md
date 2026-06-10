# Movement And Intel Cache

## Target

Reduce pathfinding CPU and repeated room scans.

## Current Code

- `Movement.moveByMemory()` stores one serialized path per creep.
- `calculateNewPath()` calls `creep.pos.findPathTo(targetPos)`.
- `moveToRoom()` uses `Game.map.findRoute()` and `findClosestByPath()`.
- `RoomExtension` caches sources/storage/link ids.
- Visuals run when bucket > 500 — far too low a threshold.

## Problems

- `findPathTo` does not support range or CostMatrix — wastes CPU pathing to occupied tiles.
- No shared CostMatrix cache — each creep builds its own cost map.
- `ignoreCreeps` parameter accepted but not used.
- Visuals threshold (bucket > 500) is dangerously low on 20 CPU.
- Path target has no range/version/TTL — stale paths are reused silently.
- Room intel is split across `room.memory` and `roomConfig`.

## CPU Impact (from docs/knowledge/efficiency/cpu-pathfinding.md)

- Each `creep.moveTo` without a cached path = ~2 CPU.
- Each tick with cached path (`noPathFinding`) = ~0.2 CPU.
- 20 creeps × 2 CPU fresh pathfinding = 40 CPU — impossible on a 20 CPU server.
- **Every creep must reuse its cached path on most ticks. Fresh pathfinding is a controlled, rare event.**

## Add

Create `IntelManager` and `PathingManager`.

### IntelManager

Stores per-room intel in `Memory.intel[roomName]`:

```ts
interface RoomIntel {
  scannedAt: number;
  owner: string | null;
  reservation: string | null;
  sourceIds: string[];
  sourceSlots: number[];        // free adjacent tiles per source
  controllerPos: { x: number; y: number };
  storageId: string | null;
  linkIds: string[];
  invaderCore: boolean;
  coreExpires: number;
  threat: 'none' | 'npc' | 'player';
  threatExpires: number;
  status: 'normal' | 'novice' | 'respawn' | 'highway' | 'sk' | 'closed';
  routeDistance: number;        // from nearest owned room
}
```

Scan cadence: owned rooms every 20 ticks, visible remotes every 30 ticks, unvisited on scout entry.

### PathingManager

Shared `CostMatrix` cache:

```ts
// global (not Memory) — rebuilt each tick on demand, TTL = 1 tick
const costMatrixCache: Map<string, CostMatrix> = new Map();
```

Cache key: `roomName`. Populated on first pathfinding request per room per tick. Multiple creeps pathing through the same room share the matrix within that tick.

Path metadata stored per creep:

```ts
interface PathMemory {
  target: string;       // packed RoomPosition
  range: number;
  path: string;         // serialized
  createdAt: number;
  policy: 'road' | 'plain' | 'remote';
}
```

## Movement Rules

1. Try cached path first (`noPathFinding: true`).
2. Repath only when: stuck > 3 ticks, target changed, TTL expired (20 ticks local, 50 ticks remote), or room threat changed.
3. Use `PathFinder.search` for all new path calculations — supports `range`, `CostMatrix`, multi-room.
4. Always pass `range`:
   - Harvest, transfer, withdraw, attack: `range: 1`
   - Build, repair, upgradeController: `range: 3`
   - Pathing without range to non-walkable tiles wastes ops.
5. Road CostMatrix weight: 1. Plain: 2. Swamp: 10. Walls/impassable: 255.
6. Roads on hauler routes cut MOVE requirements in half — worth building.
7. Disable visuals entirely unless `Memory.debug.visuals === true` (never auto-enable).

## Steps

1. Replace `calculateNewPath()` with `PathFinder.search` using `range` and shared `CostMatrix`.
2. Store `PathMemory` struct per creep (adds `range`, `createdAt`, `policy`, `target`).
3. Add global `CostMatrix` cache rebuilt per-tick on demand (`costMatrixCache`).
4. Add `IntelManager.scanRoom(room)` staggered by phase (see plan 05 for cadences).
5. Replace repeated `Room.find(...)` calls in roles with `IntelManager` cached ids.
6. Add remote route score to `RoomIntel`: distance, hostile risk, sources, reservation status.
7. Fix `ignoreCreeps` — use `false` on repath after stuck detection, `true` on initial path to avoid dead ends.
8. Raise visual gate to `Memory.debug.visuals === true` only.

## Acceptance

- Moving creeps do not pathfind every tick under normal conditions.
- Multiple creeps on the same route share the CostMatrix within a tick.
- Visuals cost zero CPU unless debug mode is on.
- Remote and expansion decisions use `IntelManager` data, not hardcoded config alone.
- `PathFinder.search` is used for all new paths; `findPathTo` is removed.
