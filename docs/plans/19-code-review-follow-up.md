# Code Review Follow-up Plan

## Review Scope

This review re-checks the current implementation against the plan set in `docs/plans/done/` and the open gap plan. The focus is on:

- role implementations under `src/roles/`, especially harvest/work state handling, remote roles, spawning, and CPU scheduling,
- plan implementation gaps around spawn demand, remotes, scouting, expansion, and late-game systems,
- storage/cache abstractions (`RoomStorage`, `CreepStorage`, `LinkStorage`) and whether the same pattern should be generalized.

## Executive Summary

The bot has moved in the planned direction: CPU-tiered loop phases exist, spawn demand has a throughput-oriented manager, rooms have phase profiles, hostile scans are centralized, remotes are ROI-scored, and construction/layout work is CPU-gated. The main remaining risk is that new plan-driven systems run in parallel with older static-config and role-local logic instead of replacing it. That creates duplicate spawn paths, conflicting role decisions, and several edge cases where planned behavior exists but is not actually the active source of truth.

Highest-priority fixes:

1. Make `SpawnDemandManager` the only normal economy/remote spawn source and downgrade `roomConfig` to allow/deny + layout seed data.
2. Replace role-local target scans with shared room-intel/storage services where practical.
3. Fix remote role integration: dynamic remote candidates are queued by `SpawnDemandManager`, but some remote role spawn-memory paths still assume static `roomConfig` and room visibility.
4. Turn `RoomStorage` from a small passive id bag into a real room-logistics cache with invalidation, typed categories, energy thresholds, and reusable selectors.
5. Add missing late-game managers only as disabled, phase-gated low-tier systems until explicit economy plans exist.

## Plan Implementation Status

| Area | Status | Notes |
| --- | --- | --- |
| CPU tiering and loop order | Mostly implemented | Critical, normal, and low tiers are present. Low systems are bucket-gated. |
| Spawn demand and bodies | Partially implemented | `SpawnDemandManager` exists, but `SpawnManager.findNeededCreeps()` still sweeps static `roomConfig` and invokes role-local spawn logic. |
| Role catalog | Partially implemented | Most planned roles exist, but `towerFiller` and `repairer` enum entries are not registered in `Jobs`, and repair behavior remains embedded in builder/wall-builder style roles. |
| Remotes | Partially implemented | ROI candidates exist, but activation/reservation/scout feedback are not fully closed-loop. Dynamic demand can queue remote creeps, while remote role memory creation can still depend on visible rooms/static config. |
| Expansion | Not implemented end-to-end | `ScoutPlanner.getBestExpansionTarget()` exists, but no expansion lifecycle manager consumes it to reserve, claim, and bootstrap a room. |
| Scouting and settlement scoring | Partially implemented | Scoring is useful but still heuristic: mineral type, terrain/perimeter quality, route risk, and remote-ring scoring are not fully represented in intel. |
| Endgame | Partially implemented | Endgame upgrader and skip behavior exist, but observer/market/labs/factory managers are absent. |
| Storage/logistics | Needs redesign | Link and creep caches are useful, but room storage is too static and cannot yet serve as a reusable logistics API. |

## Role Review Findings

### Base `Ant` and `HarvesterAnt`

Strengths:

- The common two-state `harvest`/`work` transition is simple and consistent.
- Movement is centralized through `Movement.moveByMemory()`, which is good for CPU.
- `HarvesterAnt` already prioritizes dropped resources, tombstones, storage, containers, and then direct source harvesting.

Issues and improvements:

- Add ruins to the scavenging chain before storage/container fallback. This was explicitly called out in the old-codebase takeaways and is still missing.
- `HarvesterAnt` uses generic nearest scans during runtime. For owned rooms, prefer shared room-logistics selectors so builders, upgraders, workers, and haulers do not repeat equivalent scans.
- The `spawnPrioBlock` fallback is embedded in `HarvesterAnt`. It works as an emergency behavior, but it mixes spawn starvation policy into every harvester role. Move it into a small emergency logistics policy/helper to make it testable and reusable.

### Stationary miners and endgame upgrader

Strengths:

- Stationary positioning is clear and keeps miner/upgrader code compact.
- Miner and endgame upgrader are aligned with the low-creep endgame direction.

Issues and improvements:

- Miner round-robin is assigned for all miners based on source count. The design rule says miner round-robin should only be used in endgame surplus mode; before that it can directly cut income.
- Endgame upgrader spawning and link/container selection should be driven by a controller-logistics cache rather than scanning around the controller at spawn-memory creation time.
- `EndgameUpgraderAnt.getProfil()` reads storage energy but does not use it; either remove the unused read or scale body/enablement using the same threshold policy used in demand calculation.

### Builders, upgraders, workers, and wall builders

Strengths:

- The roles are straightforward and fit the shared harvester state model.
- Construction and repair roles are intentionally low priority, matching the CPU-first plan.

Issues and improvements:

- Build and repair target selection is still role-local and scan-heavy. The missing `BuildPriorityPolicy` and `RepairPriorityPolicy` should own target scoring, throttling, and caching.
- Builder demand only checks whether construction sites exist, not whether the sites are useful/owned/prioritized. This should be coupled to the construction-site budget and priority policy.
- `repairer` exists in the enum but does not have a registered job class. Either implement it or remove the enum entry until it is real.

### Transporter and filler logistics

Strengths:

- The transporter already uses `getOrFindRoomStorage()` to prefer storage/spawn/controller containers.
- Link awareness exists through `LinkStorage`.

Issues and improvements:

- Transport/fill decisions still combine emergency filling, tower filling, storage filling, link draining, and container balancing in role code. This should become a logistics target provider with priorities.
- `RoomStorage` only stores ids and does not encode role-specific intent: source container, controller container, spawn buffer, storage, terminal, dropped/tombstone/ruin priorities, or minimum/maximum energy thresholds.
- The current storage abstraction is meaningful as a seed, but too small to be reused broadly without becoming stale or forcing callers to interpret raw ids themselves.

### Remote miner, hauler, reserver, scout, and claimer

Strengths:

- Remote ROI planning exists and is passive-player aware.
- Remote hauler behavior is simple: collect from remote, deliver home, flee on danger.
- Reserver avoids offensive controller attacks against player-owned rooms.

Issues and improvements:

- Dynamic remote demand can queue `remoteMiner` and `remoteHauler`, but `RemoteMinerAnt.createSpawnMemory()` assumes the target room is visible. Dynamic remotes often are not visible at spawn time, so the spawn request can fail or crash before the scout/miner reaches the room.
- `RemoteMinerAnt.shouldSpawn()` still depends on `roomConfig[workroom]`, which is incompatible with dynamic `Memory.remoteIntel` candidates.
- `RemotePlanner.activateCandidate()` exists, but there is no clear manager loop that activates candidates when miner/container/hauler prerequisites are met.
- `ReserverAnt` is registered and has spawn logic, but `SpawnDemandManager.demandRemotes()` does not queue reservers. Reserved ROI is therefore evaluated but not actively achieved.
- There are two scouting systems: the older `ScoutAnt` writes `Memory.rooms`, while the newer `IntelManager`/`ScoutPlanner` use `Memory.intel` and candidates. Merge them so scouting produces one source of truth.

## Storage Review

### What is good

- `CreepStorage` reduces repeated `Game.creeps` filtering and has explicit invalidation hooks for spawning, spawned, and dead creeps.
- `LinkStorage` categorizes links into source, upgrader, storage, and remote buckets and has separate quick-count and full-category caches.
- `RoomStorage` gives the code a place to remember stable storage/container ids in room memory.

### What should be improved

`RoomStorage` should not stay as a two-field record. It should become a room-logistics cache/service with typed categories and explicit invalidation:

- `sourceContainers`: containers adjacent to sources, keyed by source id,
- `controllerContainer` and `controllerLink`: upgrade logistics targets,
- `spawnBuffers`: containers/links near spawn/filler positions,
- `mainStorage`, `terminal`, and future `factory` store endpoints,
- `energySources`: ordered energy withdrawal candidates with thresholds,
- `energySinks`: ordered delivery targets with thresholds,
- `lastScan`, `ttl`, and `invalidatedAt` fields.

Recommended API shape:

```ts
RoomLogistics.getEnergyWithdrawTargets(room, purpose: 'builder' | 'upgrader' | 'hauler' | 'filler')
RoomLogistics.getEnergyDepositTargets(room, purpose: 'spawn' | 'tower' | 'storage' | 'terminal')
RoomLogistics.invalidate(roomName, reason)
RoomLogistics.getSourceContainer(room, sourceId)
RoomLogistics.getControllerLogistics(room)
```

This pattern is reusable for other systems, but it should be generalized carefully:

- Use it for stable/semistable structures and priorities: containers, storage, links, terminal, labs, factory, nuker, power spawn.
- Do not use it as a long-lived cache for highly volatile objects unless TTLs are short: dropped resources, tombstones, ruins, hostile creeps, construction sites.
- Keep dynamic object lists separated by TTL and purpose so a stale construction-site cache cannot poison emergency spawn/fill behavior.

### Should `CreepStorage` pattern be reused?

Yes, but with stronger typing and safer keys:

- Replace string-concatenated keys like `${job}_${workRoom}` with structured key helpers to avoid accidental collisions.
- Track hit/miss counters if CPU tuning is needed.
- Keep TTL short because creep sets change often.
- Prefer one shared selector layer for creep counts used by spawn demand, jobs, and emergency checks.

### Should `LinkStorage` pattern be reused?

Yes. `LinkStorage` is closest to the right pattern: categorize once, expose typed selectors, and invalidate by room. A future `RoomLogistics` service should either absorb it or use it internally so transporters/fillers/endgame upgraders do not each decide link semantics independently.

## New Follow-up Plan

### Phase 1: Make demand the source of truth

Tasks:

- Stop calling `SpawnManager.findNeededCreeps()` for normal operation after parity checks pass.
- Keep only emergency spawning in `SpawnManager` and demand generation in `SpawnDemandManager`.
- Add `reason` and optional `sourceId`/`targetId` metadata to queued spawn requests or preserve the richer `SpawnDemand` interface through the queue.
- Convert static `roomConfig` into allow/deny configuration: owned rooms, remote allowlist/blocklist, layout flags.

Acceptance:

- No regular economy or remote creep is spawned only because a static `roomConfig` count says so.
- Every queued normal spawn has a demand reason visible in memory/log output.
- Static remote rooms can still be manually allowed, but dynamic `Memory.remoteIntel` works without `roomConfig[remoteName]`.

### Phase 2: Room logistics/storage service

Tasks:

- Replace `RoomStorage` with `RoomLogistics` or expand it into typed logistics data.
- Include source, controller, spawn, storage, terminal, and link categories.
- Add TTL + invalidation on RCL change, construction completion, structure destruction, and manual reset.
- Move transporter/filler/upgrader/builder withdrawal/deposit target selection to this service.

Acceptance:

- Transporter and filler no longer run independent full-room target-selection scans every tick.
- Controller link/container selection is shared by upgrader and endgame upgrader.
- Storage thresholds are explicit per purpose rather than hardcoded in roles.

### Phase 3: Remote closed loop

Tasks:

- Make remote roles consume `Memory.remoteIntel` rather than `roomConfig`.
- Allow remote spawn memory to be created from intel when the remote room is not visible.
- Queue reservers when a candidate remote is profitable but not reserved and the controller is safe.
- Activate candidates as `mining` only after scout intel is fresh and the home room has budget.
- Add observed hauler round-trip samples to refine hauler body sizing.

Acceptance:

- A newly discovered candidate remote can progress from `unknown` → `candidate` → `mining` without manual config.
- Remote miner spawn-memory creation never requires current room visibility.
- Remote hauler sizing improves from observed travel data after live operation.

### Phase 4: Unified scouting and expansion lifecycle

Tasks:

- Merge legacy `ScoutAnt` memory writes with `IntelManager`/`ScoutPlanner` output.
- Persist one active expansion lifecycle: `candidate`, `reserved`, `claiming`, `bootstrapping`, `owned`, `aborted`.
- Have a manager consume `ScoutPlanner.getBestExpansionTarget()` and queue claimer/bootstrap support only when the parent room has reserve energy and no emergency.
- Enrich `RoomIntel` with mineral type, source/controller/anchor distance estimates, exit-group count, and remote-ring score.

Acceptance:

- Expansion can happen from intel and memory state alone.
- Candidate scoring includes mineral, defense perimeter, economy, remotes, and logistics.
- Only one active expansion consumes spawn/energy budget at a time.

### Phase 5: Late-game disabled managers

Tasks:

- Add stubbed, disabled-by-default managers for observer, market, labs, and factory.
- Gate each by RCL/structure availability, CPU bucket, and explicit memory flag.
- Document missing economy plans before enabling labs/factory/market automation.

Acceptance:

- The codebase has safe integration points for late-game systems.
- None of these managers consume CPU before prerequisites and explicit enable flags are present.

## Priority Bug/Risk List

1. **Remote dynamic spawning can conflict with `roomConfig` and visibility assumptions.** Fix before relying on automatic remotes.
2. **Miner round-robin can reduce income before endgame surplus.** Restrict it to the documented endgame condition.
3. **Dual spawn systems can enqueue duplicate or contradictory creeps.** Make demand authoritative.
4. **Room storage cache is too under-specified.** Expand it before adding terminal/lab/factory logistics.
5. **Scouting has two memories.** Merge around `Memory.intel` to avoid stale expansion/remotes decisions.
