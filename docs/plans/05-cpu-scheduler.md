# CPU Scheduler

## Target

Keep the bot alive on 20 CPU by budgeting work per phase and manager.

## Current Code

- `CPUManager.getAdaptiveCPUBudget()` uses bucket/history.
- `main.ts` has critical, normal, low gates.
- Pixel generation runs when bucket is full.

## Problems

- Managers do not have explicit budgets.
- Debug logs/visuals run when bucket > 500 — far too low a threshold on a 20 CPU server.
- Low-priority managers can still do large scans before a gate.
- **Pixel generation wastes the bucket.** On a 20 CPU server, the bucket is the only safety reserve. Pixel generation is a cosmetic luxury that should be permanently disabled unless manually enabled via config.

## CPU Cost Reference (from docs/knowledge/efficiency/cpu-pathfinding.md)

Approximate costs per operation:

| Operation | CPU estimate |
|---|---|
| `PathFinder.search` (2000 ops) | ~2.0 CPU |
| `creep.moveTo` without cache | ~2.0 CPU |
| `creep.moveTo` with cached path | ~0.2 CPU |
| `Room.find(type)` (native, no filter) | ~0.1–0.3 CPU |
| `Room.find` with filter function | ~0.2–0.5 CPU |
| `Game.getObjectById` | ~0.01 CPU |
| `creep.harvest/transfer/build` | ~0.2 CPU |

**Critical implication:** 5 creeps moving without path cache = ~10 CPU = 50% of the entire budget.
At 10 rooms with ~5 active creeps each = 50 creeps pathfinding fresh = **not possible on 20 CPU.**
Every creep must use a cached path on most ticks.

## Budget Allocation (20 CPU/tick, N owned + M remote rooms)

Room count is not fixed — see plan 03 for the dynamic scaling model.
The tiers below are designed so that critical work always completes regardless of room count.

| Tier | Budget | Runs |
|---|---|---|
| critical | ≤ 8 CPU | emergency spawn, tower targeting, miners/fillers, hostile scan |
| normal | ≤ 8 CPU | local economy, spawn demand, links, builders, upgraders |
| low | remaining | layout, remote planning, market, labs, visuals, stats |
| reserve | 2–4 CPU | buffer for pathfinding spikes |

Per-manager rough estimate at normal colony state (scales with room count N):

| Manager | Estimated CPU | Scales with |
|---|---|---|
| DefenseManager (hostile scan, all owned rooms) | ~0.1 × N | owned rooms |
| SpawnManager (emergency + queue) | ~0.5 | fixed |
| SpawnDemandManager | ~0.05 × N | owned rooms |
| JobsManager critical (miners + fillers) | ~0.15 × N | rooms × 2 miners |
| TowerManager | ~0.1 × N | owned rooms |
| JobsManager normal (cached paths) | ~0.3 × N | creeps per room |
| LinkManager | ~0.05 × N | rooms with links |
| CleanUpManager | ~0.2 | mostly fixed |
| LayoutManager (staggered, 1 room/tick) | ~0.05 | fixed (staggered) |
| **Total base** | **~2–3 CPU** + **~0.85 × N** | |

Example: 10 owned rooms → ~2.5 + 8.5 = ~11 CPU amortized. Headroom for ~8 remote sources.
Example: 15 owned rooms → ~2.5 + 12.75 = ~15.25 CPU amortized. Tight but feasible if rooms are optimized.

Spike ticks (path recalculation, room scan) can reach 17–19 CPU — bucket absorbs the difference.
If measured `Memory.cpuStats.total` consistently exceeds 16, stop expanding and optimize existing rooms first.

## Add

Per-manager CPU budget API:

```ts
CPUManager.canRun('layout', roomName)
CPUManager.runWithBudget('tower', 1.5, () => TowerManager.runTowers())
CPUManager.shouldRunEvery(roomName, 'repairScan', 25)
```

## Budget Tiers

| Tier | Run |
|---|---|
| critical | emergency spawn, tower attack, miners/fillers, cleanup of invalid creeps |
| normal | local economy, spawn demand, links, builders, upgraders |
| low | layout, market, labs, remote planning, visuals, stats |

## Steps

1. Add `Memory.cpuStats.manager[name]` to track rolling average per manager.
2. Wrap each manager in `CPUManager.measure(name, fn)`.
3. Add per-manager skip intervals when bucket < 3000:
   - layout: skip entirely
   - remote planner: skip entirely
   - market: skip entirely
   - labs: skip entirely
4. **Permanently disable `Game.cpu.generatePixel()`** unless `Memory.config.enablePixels === true`. This flag must default to false. Never auto-enable based on bucket level.
5. Gate movement visuals behind `Memory.debug.visuals === true`. Current bucket > 500 threshold is far too low; raise minimum to bucket > 7000 if ever enabled.
6. Log CPU summary every 500 ticks to `Memory.cpuStats`, not to console.
7. Add `CPUManager.shouldRunEvery(key, interval)` with jitter to spread staggered tasks across ticks, not all on the same tick.

## Stagger Intervals

| Manager | Normal interval | Low-bucket interval |
|---|---|---|
| SpawnDemand (full scan) | every 3 ticks | every 5 ticks |
| RoomPhaseManager.update | every 10 ticks | every 20 ticks |
| RemotePlanner | every 200 ticks | skip |
| LayoutManager | every 50 ticks | skip |
| CleanUpManager | every 5 ticks | every 10 ticks |
| MarketManager | every 100 ticks | skip |
| LabManager | every 50 ticks | skip |
| IntelManager.scanRoom | every 20 ticks per room | every 50 ticks |

Use `(Game.time + roomIndex) % interval === 0` to spread rooms across ticks.

## Acceptance

- On 20 CPU, critical path stays below 8 CPU in normal colony state.
- Pixel generation never runs unless manually enabled.
- No visuals or log spam unless `Memory.debug` enables it.
- Bucket recovers after expensive ticks within 10–20 ticks.
- Layout/market/labs never starve defense or spawning.
- CPU stats are inspectable in Memory for tuning.
