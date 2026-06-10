# Spawn Demand And Bodies

## Target

Replace static headcounts with phase-specific throughput demand.

## Current Code

- `roomConfig` sets `builderCount`, `upgraderCount`, etc.
- `Ant.spawn()` checks count by job/room.
- Emergency spawn queues `[WORK,CARRY,CARRY,MOVE,MOVE]`.
- Bodies are generated inside each role.

## Problems

- Headcounts ignore source count, distance, storage, roads, links, and CPU.
- Remote miners/haulers are enabled by static config with no ROI check.
- Spawn queue dedupes by job/room, hiding multiple same-role needs (e.g., two miners for two sources).
- Body builders do not share phase policy.
- No replacement pre-spawn: creep dies, then a gap exists before replacement arrives.

## Add

Create `SpawnDemandManager` and `BodyBuilder` utility.

Demand model:

```ts
interface SpawnDemand {
  role: eJobType;
  room: string;
  spawnRoom: string;
  priority: number;
  requiredParts: Partial<Record<BodyPartConstant, number>>;
  maxEnergy: number;
  reason: string;
  sourceId?: string;   // for multiple miners/haulers of same role
  replacesCreep?: string; // pre-spawn replacement by name
}
```

## Body Formulas (from docs/knowledge/efficiency/energy-economy.md)

### Miner (stationary, drops on container/link)

| Situation | Body | Energy |
|---|---|---|
| Owned source, container | `[WORK x5, MOVE]` | 550 |
| Owned source, container + buffer | `[WORK x5, CARRY, MOVE]` | 650 |
| Remote source (unreserved) | `[WORK x3, MOVE]` | 350 |
| Remote source (reserved) | `[WORK x5, MOVE]` | 550 |

Rule: 5 WORK saturates owned source (10 e/t × 300 t = 3000). 3 WORK saturates unreserved (5 e/t).

### Hauler

```
CARRY = ceil(energyPerTick × roundTripTicks / 50)
```

For owned source (10 e/t):
- 10-tick round trip → 2 CARRY (100 capacity)
- 20-tick round trip → 4 CARRY (200 capacity)
- 40-tick round trip → 8 CARRY (400 capacity)

For unreserved remote (5 e/t):
- 30-tick round trip → 3 CARRY

MOVE ratio:
- Road: 1 MOVE per 2 loaded non-MOVE parts
- Plain: 1 MOVE per 1 loaded non-MOVE part
- Swamp: 5 MOVE per 1 loaded non-MOVE part

Always build roads between source and storage for haulers — halves MOVE requirement.

### Upgrader

- Scale WORK count by `floor((storage.energy - 20000) / 10000)`, capped at 15 WORK at RCL8.
- At RCL8: max 15 WORK benefit. Do not spawn more WORK than this.
- Below 20 000 storage: keep 1–2 WORK only — economy takes priority.
- See plan 02 (Throughput Reference) for the full upgrader scaling table.

### Builder

- Scale by construction backlog: `totalConstructionProgress / 100` WORK parts, min 1, max affordable.
- Drop to 1 small builder if no construction sites exist.

### Cold-Boot (emergency, ≥ 300 energy)

`[WORK, CARRY, MOVE]` — can harvest, carry, and upgrade. Never rely on headcount for this; always keep a dedicated cold-boot path that fires independently of SpawnDemandManager.

## Phase Demand

| Phase | Demand |
|---|---|
| 1 | 1 cold-boot worker; add second only if first dies |
| 2 | 1–2 miners (one per source), 1 hauler per source, 1 filler |
| 3 | miners on both sources, haulers sized to route, tower filler, optional small builder |
| 4 | storage haulers, fillers, builders/upgraders by storage energy |
| 5 | link-aware fillers, profitable remotes (remote miners + haulers per ROI), reservers |
| 6 | mineral miner only if storage > 50 000 and terminal has capacity |
| 7 | larger bodies, multi-spawn replacement windows |
| 8 | fewer larger creeps; unboosted upgrader cap is 15 WORK |

## Replacement Timing

Pre-spawn replacement before the current creep dies:

```
spawnAt = creep.ticksToLive - (body.length * 3) - travelTimeToRoom
```

Queue replacement when `ticksToLive < (body.length * 3) + travelTime + 10` (safety margin).

## Steps

1. Add `BodyBuilder` utility with methods per role using formulas above.
2. Move body sizing out of role classes into `BodyBuilder`.
3. Replace `roomConfig` counts with policy flags: `mineLocalSources`, `remoteRooms[]`, `upgradeWhenSurplus`.
4. Make queue key include `sourceId` or `routeId` so two miners for two sources are independent requests.
5. Implement replacement timing based on `ticksToLive`.
6. Keep hard cold-boot path (`[WORK,CARRY,MOVE]`) independent of demand manager — fires when no other creeps exist.

## Acceptance

- New room recovers from 300 energy with the cold-boot path.
- Local sources are saturated (5 WORK each) before remotes.
- Spawn queue can hold two independent miner requests for two sources.
- Remote hauler CARRY count changes with measured route distance.
- No remote creep spawns if net income is negative or defense is unavailable.
- Creep replacement spawns before the predecessor dies.
