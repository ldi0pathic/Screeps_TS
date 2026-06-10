# Old Codebase Takeaways

Source reviewed: `C:\GIT\github\screep_old\screeps.com\prod`.

Goal: keep useful ideas, not old implementation style.

## Adopt

### Staggered Controller Timing

Old files:

- `controller.timing.js`
- `controller.memory.js`

Useful ideas:

- Run spawn every 5 ticks, defense scan every 7 ticks, status every 11 ticks.
- Run large memory refreshes rarely.
- Use prime-ish intervals to avoid same-tick spikes.

Current mapping:

- Fold into `CPUManager.shouldRunEvery(room, task, interval)`.
- Use per-room offset, not global same-tick loops.
- Keep defense attack every tick; only deep scans are staggered.

### Cached Structure Id Refresh

Old files:

- `controller.memory.js`

Useful ideas:

- Cache towers, containers, roads, walls/ramparts, terminals by id.
- Refresh expensive structure lists on long cadence.
- Rebuild missing road construction sites from saved road positions.

Current mapping:

- Extend `IntelManager` / `RoomExtension`.
- Store ids with `lastScan` and version.
- Rebuild roads only in low CPU tier and with construction-site budget.

### Priority Build And Repair Tables

Old files:

- `config.js`
- `creep.builder.js`
- `creep.reparier.js`
- `creep.wallbuilder.js`

Useful ideas:

- Structure-type priority tables for build/repair.
- Hit thresholds by structure type.
- Builder count based on construction-site count.
- Wall/rampart workers only when storage has surplus.
- Wall target cache: continue same wall until done/invalid.

Current mapping:

- Add `BuildPriorityPolicy`.
- Add `RepairPriorityPolicy`.
- Use phase-specific thresholds:
  - roads/containers: maintenance threshold,
  - ramparts: minimum defense threshold,
  - walls: surplus-only.
- Do not sort all structures every tick; cache target ids.

### Emergency Spawn Escalation

Old files:

- `creep.miner.js`
- `creep.debitor.js`
- `controller.spawn.js`

Useful ideas:

- Track blocked priority spawn state.
- If full body cannot spawn for too long, spawn minimal emergency body.
- Emergency creeps redirect work to spawn/tower fill.

Current mapping:

- Keep `SpawnManager.processEmergencySpawns()`.
- Add blocked-request age and fallback body.
- For miners: fallback `[WORK,CARRY,MOVE]`.
- For haulers/fillers: fallback `[CARRY,CARRY,MOVE]`.
- Never let optional roles block emergency economy.

### Remote Hauler Size Learning

Old files:

- `creep.debitor.js`

Useful ideas:

- Measure remote round-trip distance from live haulers.
- Derive needed `CARRY` from observed trip length.
- Split into multiple haulers when body cap/energy cap cannot fit.

Current mapping:

- Add `RemoteIntel.routes[room].observedRoundTrip`.
- Formula: `CARRY = ceil(roundTripTicks / 5)` for one reserved source.
- Use observed distance after bootstrap, estimated path length before bootstrap.

### Nuke Detection

Old files:

- `controller.defence.js`
- `main.js`

Useful ideas:

- Scan `FIND_NUKES`.
- Store nuke positions and landing ticks.
- Notify once.
- Visualize blast radius only behind debug flag.

Current mapping:

- Add to `DefenseManager.scanRoom()`.
- Store `RoomMemory.nukes`.
- `Game.notify` with dedupe and grouping.
- No always-on visuals.

### Link Logistics Patterns

Old files:

- `creep.miner.js`
- `creep.upgrader.js`
- `config.js`

Useful ideas:

- Miner deposits to adjacent link.
- Source link sends to controller/storage link.
- Upgrader prefers controller link at RCL5+.
- Storage fullness changes link target priority.

Current mapping:

- Keep `LinkManager`.
- Add storage-energy-aware target scoring.
- Add controller-link feeder policy for RCL5+.
- Keep link use phase-gated.

### Scavenge Priority

Old files:

- `creep.base.js`
- `creep.debitor.js`
- `creep.transfer.js`

Useful ideas:

- Harvest ruins, tombstones, drops before normal harvesting.
- Use minimum amount thresholds.
- Store target id until empty/invalid.

Current mapping:

- Current `HarvesterAnt` already handles drops/tombstones.
- Add ruins.
- Make thresholds phase/role-specific.
- Avoid `findClosestByPath` every tick; use cached target id and range search first.

### Market Throttling

Old files:

- `prototype.terminal.market.js`
- `controller.timing.js`

Useful ideas:

- Terminal buy/sell only when cooldown and energy allow.
- Rotate terminals across ticks.
- Check transaction energy cost before deal.

Current mapping:

- Future `MarketManager` low tier only.
- Use `Game.market.calcTransactionCost`.
- Cache order scans; do not scan market every tick.

## Do Not Adopt

- Global static `global.room` as source of truth.
- Prototype overrides for core methods like `Creep.move`, `withdraw`, `harvest`.
- Always-on `RoomVisual` path drawing.
- Pixel generation on full bucket by default.
- Static remote room lists as primary decision logic.
- Player-room destroy lists.
- Large synchronous daily scans without CPU budget.
- Unbounded console logging inside spawn/job loops.

## Implementation Order

1. Add timing/stagger utility to `CPUManager`.
2. Add build/repair priority policies.
3. Add emergency blocked-request fallback.
4. Add remote hauler observed-distance metrics.
5. Add nuke detection.
6. Add ruins to scavenging.
7. Add market/link improvements later.

## Acceptance

- Plans stay passive/defensive.
- No old code is copied directly.
- Each adopted idea has a phase gate and CPU gate.
- Static config becomes override/seed only, not primary behavior.
