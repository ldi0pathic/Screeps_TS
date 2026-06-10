# Gap Closure Plan

## Review Result

Most core plans are implemented: CPU tiers, phase model, hostile scan sharing, spawn demand, basic remote ROI, construction-site caps, body formulas, nuke detection, and endgame skip paths.

Remaining gaps are integration and late-game systems.

## Gaps

### 1. Static Config Still Drives Spawn Sweep

`SpawnManager.findNeededCreeps()` still loops `roomConfig` and calls role-local spawn logic.

Target:

- keep `roomConfig` only for manual allow/deny and fixed layout seeds,
- make `SpawnDemandManager` the primary spawn source,
- remove duplicated role spawn paths once parity is tested.

Acceptance:

- no remote/economy creep spawns from static config alone,
- all normal spawn reasons are visible in queued demand data.

### 2. Expansion Selection Is Not Connected To Claim/Bootstrap

`ScoutPlanner.getBestExpansionTarget()` exists, but no manager consumes it to queue claimers/builders and mark an expansion lifecycle.

Target:

- persist candidate lifecycle in Memory,
- add expansion manager or fold into spawn demand,
- reserve one active expansion at a time,
- queue claimer and bootstrap workers from the support room.

Acceptance:

- a shortlisted room can become `reserved` and then owned without manual config,
- parent room keeps bootstrap reserve and avoids active defense emergencies.

### 3. Settlement Scoring Is Still Heuristic

Plan 14 asked for terrain/perimeter, mineral deficit, route-risk, and remote-ring scoring. Current scoring mostly uses exit count, source slots, and known adjacent intel.

Target:

- add mineral type to `RoomIntel`,
- estimate source/controller/anchor distances,
- count exit groups instead of raw exits,
- score candidate remote ring from cached intel.

Acceptance:

- candidate score includes mineral, defense perimeter, economy, remotes, logistics.

### 4. Observer, Market, Labs, Factory Are Missing

Plans mention late-game observer scouting and future low-tier economy systems, but managers are absent.

Target:

- `ObserverManager`: one observation per room/tick, feeds `IntelManager`,
- `MarketManager`: terminal-only, low-tier, cached order scans,
- `LabManager`: disabled until explicit boost/compound plan exists,
- `FactoryManager`: disabled until commodity plan exists.

Acceptance:

- all are CPU-gated and phase-gated,
- none run by default before RCL/stock prerequisites.

### 5. Old-Codebase Takeaways Partially Applied

Missing: build/repair priority policies, emergency blocked-request fallback, observed remote hauler sizing, ruins scavenging.

Target:

- add `BuildPriorityPolicy` and `RepairPriorityPolicy`,
- track blocked spawn request age and downgrade emergency bodies,
- record remote hauler round-trip samples,
- add ruins to `HarvesterAnt` scavenging.

Acceptance:

- optional roles cannot block emergency economy,
- remote hauler sizing improves after live measurements,
- repair/build target sorting is cached or throttled.
