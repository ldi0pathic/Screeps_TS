# Improvement Plans

Goal: CPU-efficient solo Screeps bot for a 20 CPU-limited server. Passive play — avoid player conflict, grow fast, operate invisibly. Room count is not fixed — the bot manages as many rooms as the CPU budget allows (see plan 03).

## Assumptions

- 20 CPU/tick base limit (no unlock).
- Room count is dynamic: gated by measured CPU per room, not a hardcoded cap. Target is to minimize CPU per room so more rooms fit.
- Defensive only — no raiding, no harassing players.
- Other players are avoided unless they attack owned/reserved rooms.
- Code executes different logic per room phase.
- Stagger all room scans across ticks — never scan all rooms in the same tick.
- CPU exhaustion silently drops all remaining actions — critical work must always be early in the loop.

## Plan Order (Recommended Implementation Sequence)

| # | Plan | Purpose |
|---|---|---|
| 01 | [Passive player policy](done/01-passive-player-policy.md) | Non-aggression rules, room avoidance, flee policy |
| 02 | [Throughput reference](done/02-throughput-reference.md) | Core formulas: miner, hauler, link, upgrade, repair |
| 03 | [Minimal room footprint](done/03-minimal-room-footprint.md) | Minimize CPU/room so more rooms fit in 20 CPU |
| 04 | [Phase execution model](done/04-phase-execution-model.md) | Phase profiles, fast-growth signal, player-safety flag |
| 05 | [CPU scheduler](done/05-cpu-scheduler.md) | Per-manager budgets, stagger intervals, pixel disable |
| 06 | [Phase-specific managers](done/06-phase-specific-managers.md) | Proposed loop order, stagger table, phase8 skip |
| 07 | [Movement and intel cache](done/07-movement-and-intel-cache.md) | PathFinder.search, shared CostMatrix, IntelManager |
| 08 | [Defense baseline](done/08-defense-baseline.md) | Single hostile scan, tower scoring, flee policy |
| 09 | [Role catalog and bodies](done/09-role-catalog-and-bodies.md) | Phase-gated roles, body templates, missing role proposals |
| 10 | [Spawn demand and bodies](done/10-spawn-demand-and-bodies.md) | Dynamic demand, exact body formulas, replacement timing |
| 11 | [Bootstrap fast path](done/11-bootstrap-fast-path.md) | RCL1->4 fastest sequence, body sizing per stage |
| 12 | [Construction site budget](done/12-construction-site-budget.md) | Global 100-slot management, per-room limits, priority queue |
| 13 | [Remotes and expansion](done/13-remotes-and-expansion.md) | ROI formula with maintenance, SK/player avoidance |
| 14 | [Automatic scouting and settlement](done/14-automatic-scouting-and-settlement.md) | Scout nearby rooms and rank best next claim target |
| 15 | [Nuke mitigation rebuild](done/15-nuke-mitigation-rebuild.md) | Evacuate, dismantle, and rebuild threatened structures |
| 16 | [Endgame efficiency](done/16-endgame-efficiency.md) | Pull mechanic, fewer large creeps, link logistics, skip list |
| 17 | [Old codebase takeaways](done/17-old-codebase-takeaways.md) | Useful old patterns to adopt, old anti-patterns to avoid |
| 18 | [Gap closure plan](18-gap-closure-plan.md) | Remaining gaps after implementation review |
| 19 | [Code review follow-up plan](19-code-review-follow-up.md) | Role/storage review and follow-up implementation plan |

## Key Design Rules

1. **Stagger room scans**: Use `(Game.time + roomIndex) % interval === 0`. Never scan all rooms at once.
2. **CPU order = survival order**: Critical actions (defense, spawn, miners) always run first. Low-tier work is the first to be dropped.
3. **Phase8 rooms skip everything**: No phase checks, no layout, no bootstrap logic once a room is final.
4. **Miner round-robin = 2 only in endgame**: Only when storage consistently full. During growth phases always run every tick — halving frequency means 50% income loss.
5. **Pixel generation off by default**: Never auto-enable on a 20 CPU server.
6. **No static config for remotes**: All remote decisions use ROI formula + intel, not hardcoded lists.
7. **100 construction site limit**: LayoutManager never places more than 5 sites per room per call.

## Current Code Strengths

- `src/main.ts` already gates normal/low work by CPU.
- `JobsManager` already buckets jobs.
- `SpawnManager` has priority queue and emergency spawn path.
- `Movement` has path memory and stuck detection.
- `RoomExtension` caches some stable room ids.

## Main Problems (Pre-Implementation)

- `roomConfig` is static and headcount-driven.
- Phase behavior exists only indirectly via `room.memory.state`.
- Spawn demand is per role count, not throughput/part deficit.
- Movement cache is per creep, not shared by room/route.
- Defense scan runs in both `TowerManager` and `RoomManager`.
- Many scans run inside roles/managers without stagger.
- Miners run every tick even in endgame surplus mode.
- LayoutManager places too many construction sites at once.
- Pixel generation runs automatically when bucket is full.
