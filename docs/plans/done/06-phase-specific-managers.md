# Phase-Specific Managers

## Target

Managers run only when useful for the room phase and CPU tier.

## Current Loop

`main.ts` order:

1. CPU history
2. spawn emergency
3. spawn queue
4. spawn demand
5. jobs critical/normal/low
6. towers
7. room manager
8. cleanup
9. layout

## Core Constraint: CPU Termination

**When the CPU budget is exhausted mid-tick, all remaining actions are cancelled silently.**
Order matters. Items later in the loop are the first to be dropped.
- Critical survival actions (defense, emergency spawn, miners) must always be early.
- Expensive scans and planning must always be last.
- Never assume a low-priority action will execute — it may be cut off every tick.

## Staggered Room Scans

**Never run all room scans in the same tick.** With N owned rooms, scanning all N rooms at once could exhaust the CPU budget entirely in one tick — the more rooms, the more critical this rule becomes.

Use per-room offsets to spread work:

```ts
// Owned rooms: stagger by room index
const roomIndex = ownedRooms.indexOf(roomName);
if ((Game.time + roomIndex) % scanInterval === 0) {
  manager.scan(roomName);
}
```

With `scanInterval = 10` and N rooms: each room scans once every 10 ticks, cost amortized. The CPU spike for any single tick is `scanCost × 1` (one room) regardless of how many rooms exist total.

This is the key property that allows the room count to scale: doubling the rooms does **not** double the per-tick CPU of staggered scans.

## Phase-Final Optimization

**A room in phase 8 (RCL8) does not need phase transition checks.**

Once a room reaches `eRoomState.phase8`, skip:
- `RoomPhaseManager.getProfile()` (phase is final, no more transitions)
- `LayoutManager` (all structures built)
- Phase exit criteria evaluation
- Source slot discovery (already stable)

Only re-run phase checks if memory is explicitly invalidated (e.g., manually triggered).

## Proposed Loop

```ts
// --- CRITICAL (always runs, must complete) ---
CPUManager.updateHistory();
DefenseManager.runCritical();          // hostile scan for all owned rooms
SpawnManager.processEmergencySpawns();
SpawnManager.processSpawns();
JobsManager.doCriticalJobs();          // miners, fillers only

// --- NORMAL (skipped when CPU is low) ---
if (CPUManager.canRunTier('normal')) {
  RoomPhaseManager.updateStaggered();  // 1 room per tick, skip phase8
  SpawnDemandManager.run();
  RoomEconomyManager.run();
  JobsManager.doJobs();
  LinkManager.runByPhase();
}

// --- LOW (first to be dropped under pressure) ---
if (CPUManager.canRunTier('low')) {
  IntelManager.scanStaggered();        // 1 room per tick
  RemotePlanner.runStaggered();        // 1 room per tick, every 200+ ticks
  LayoutManager.runStaggered();        // 1 room per tick, skip phase8
  MarketManager.runStaggered();
  LabManager.runStaggered();
  JobsManager.doLowJobs();
  CleanUpManager.runAllCleanup();
}
```

## Manager Stagger Table

| Manager | Rooms scanned per tick | Interval per room | Skip condition |
|---|---|---|---|
| DefenseManager | all owned (critical) | every tick | never skip |
| RoomPhaseManager | 1 owned room | every 10 ticks | skip phase8 rooms |
| SpawnDemandManager | all owned | every 3–5 ticks | — |
| IntelManager.scanRoom | 1 room | every 20 ticks (owned), 30 (remote) | — |
| RemotePlanner | 1 remote room | every 200 ticks | bucket < 3000 |
| LayoutManager | 1 owned room | every 50 ticks | skip phase8 rooms |
| MarketManager | all terminal rooms | every 100 ticks | bucket < 3000 |
| LabManager | 1 lab room | every 50 ticks | bucket < 3000 |
| CleanUpManager | all | every 5 ticks | — |

Apply `(Game.time + roomIndex) % interval === 0` for all per-room staggered managers.

## Manager Phase Matrix

| Manager | Min Phase | CPU Tier |
|---|---:|---|
| DefenseManager critical | 1 | critical |
| Emergency spawn | 1 | critical |
| Miners/fillers (JobsManager critical) | 1 | critical |
| TowerManager | 3 | normal |
| SpawnDemandManager | 2 | normal |
| Storage logistics | 4 | normal |
| Links | 5 | normal |
| Remote planner | 5 | low |
| IntelManager | 1 | low |
| LayoutManager | 2 | low (skip phase8) |
| Mineral/terminal | 6 | low |
| Labs | 6 | low |
| Factory | 7 | low |
| Observer/Power/Nuker | 8 | low |

## Steps

1. Add phase profile and CPU tier APIs first (plans 04 and 05).
2. Split managers into `critical`, `normal`, `low` entry points where needed.
3. Make each manager accept a `roomName` + `profile` parameter instead of scanning all rooms internally.
4. Add `CPUManager.shouldRunEvery(key, interval, jitter?)` to manage stagger counters.
5. Add phase-final short-circuit: if `room.memory.state === eRoomState.phase8`, skip layout and phase checks.
6. Log CPU summary to `Memory.cpuStats` every 500 ticks — not to console.

## Acceptance

- RCL1 room never executes RCL5+ logic.
- A low bucket skips the entire low tier without affecting survival.
- Managers do not each rediscover the same room facts independently.
- Room scans are spread across ticks — never more than 1–2 room scans per tick total.
- Phase8 rooms skip all phase-transition and layout logic permanently.
- If CPU runs out mid-tick, only low-tier work is lost — not miners or towers.
