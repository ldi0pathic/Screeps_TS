# Game Phases Best Practices

Non-official synthesis using official RCL unlocks plus community phase patterns.

Sources:

- https://docs.screeps.com/control.html
- https://docs.screeps.com/api/
- https://wiki.screepspl.us/Great_Filters/
- https://wiki.screepspl.us/Static_Harvesting/
- https://wiki.screepspl.us/Remote_Harvesting/
- https://wiki.screepspl.us/CPU/
- https://wiki.screepspl.us/Pathfinding/
- https://github.com/bonzaiferroni/Traveler
- https://github.com/bencbartlett/Overmind

## Phase Map

| Phase | RCL | Primary objective | Main unlock |
|---|---:|---|---|
| Bootstrap | 1 | survive, harvest, spawn reliably | 1 spawn |
| Early Economy | 2 | extensions, roads, walls/ramparts basics | 5 extensions |
| Basic Defense | 3 | tower defense, stable static mining | 1 tower |
| Storage Transition | 4 | storage-centered logistics | storage |
| Remote Scaling | 5 | links, serious remote mining | 2 links |
| Industry Start | 6 | terminal, minerals, labs | terminal, extractor, 3 labs |
| Multi-Spawn Scaling | 7 | factory, second spawn, larger economy | 2 spawns, 6 labs |
| Endgame Room | 8 | max throughput, boosts, power, ops | 3 spawns, 6 towers, observer, nuker, power spawn |

## Global Phase Priorities

Across all phases:

- Never allow spawn/filler/harvester cold-boot failure.
- Saturate local sources before chasing remotes.
- Keep controller downgrade safe.
- Spend CPU on decisions that change outcomes; cache the rest.
- Prefer throughput/part-count targets over fixed creep counts.
- Build automation in this order: spawn -> economy -> defense -> remotes -> labs/market -> offense.

## RCL1 Bootstrap

Goal:

- Keep spawn alive, create first reusable economy loop.

Best practices:

- Use small flexible creeps: `[WORK,CARRY,MOVE]` or variants.
- Prioritize harvest -> spawn/extensions -> controller.
- Avoid overbuilding roads/sites; 300 spawn energy is fragile.
- Keep logic simple and deterministic.
- Add cold-boot fallback: if no workers, spawn cheapest worker.

Avoid:

- Specialized roles that cannot recover if one role dies.
- Expensive pathfinding every tick.
- Construction spam before energy flow is stable.

Exit criteria:

- At least one creep can refill spawn.
- Controller reaches RCL2.

## RCL2 Early Economy

Goal:

- Build 5 extensions, begin static harvesting, start roads only where useful.

Best practices:

- Move toward source assignment.
- Start container/drop mining near sources.
- Build extensions close enough to refill cheaply.
- Use roads on repeated high-traffic paths, not decorative full networks.
- Add basic wall/rampart planning, but do not sink all energy into walls.

Economy:

- Local source saturation matters more than remote expansion.
- A source with 5 `WORK` drains 3000 energy per 300 ticks.

Exit criteria:

- Extensions are reliably filled.
- Static source logistics are in place or planned.

## RCL3 Basic Defense

Goal:

- Use first tower for invaders and emergency repairs.

Best practices:

- Build tower early and keep it filled.
- Add hostile detection before remote mining becomes serious.
- Use tower for defense first, repairs second.
- Keep roads/containers repaired by creeps when possible.
- Add spawn queue priority for emergency defenders.

Avoid:

- Tower over-repairing every damaged road.
- Ignoring invaders until they kill haulers/miners.

Exit criteria:

- Invader response is automatic.
- Source mining and extension filling are stable.

## RCL4 Storage Transition

Goal:

- Convert logistics to storage-centered economy.

Best practices:

- Build storage and route haulers/fillers around it.
- Separate source hauling from spawn/extension filling.
- Centralize surplus energy decisions: build, repair, upgrade.
- Start tracking room metrics: stored energy, source income, spawn load.
- Use larger bodies only when spawn energy and CPU support them.

Architecture:

- This is the right time to make task generation more data-driven.
- Use room-level demand: needed carry, needed work, needed repair.

Exit criteria:

- Storage receives source surplus.
- Fillers can keep spawn/extensions/tower supplied.

## RCL5 Remote Scaling

Goal:

- Add links and profitable remotes.

Best practices:

- Use links for far local sources/controller/storage flows.
- Evaluate remotes by source count, distance, reservation, danger.
- Reserve remotes when possible: 5 e/t -> 10 e/t per source.
- Use container mining in remotes, but account for 5x unowned container decay.
- Spawn remote defenders or guard logic before remotes become critical.
- Precompute/cached remote paths and CostMatrices.

Remote decision:

```text
gross = sources * (reserved ? 10 : 5)
cost = miners + haulers + reservers + roads + containers + defense + downtime
accept if gross - cost is clearly positive
```

Avoid:

- Single-source long-distance remotes unless there is strategic value.
- Roading every remote before confirming profitability.

Exit criteria:

- Remotes produce net positive energy.
- Link routing saves hauler CPU/body cost.

## RCL6 Industry Start

Goal:

- Add terminal, minerals, basic labs.

Best practices:

- Build terminal and extractor.
- Mine local mineral only when energy economy can spare worker/hauler time.
- Start minimal lab automation: reagent labs -> output lab.
- Use market for missing minerals or first credits.
- Create resource accounting: desired stockpile per mineral/boost.
- Keep lab logic low-frequency; not every tick.

Boost priorities:

- Economy: `XUHO2` harvest, `XKH2O` carry, `XGH2O` upgrade.
- Defense/offense: `XGHO2` tough, `XLHO2` heal, `XUH2O` attack, `XKHO2` ranged.

Avoid:

- Running labs without clear product demand.
- Mining minerals while energy economy is still weak.

Exit criteria:

- Terminal is stocked with energy buffer.
- Mineral/compound plan exists.

## RCL7 Multi-Spawn Scaling

Goal:

- Use second spawn and factory without exploding CPU.

Best practices:

- Recalculate spawn load; replacement scheduling changes with 2 spawns.
- Increase role sizes to reduce creep count where CPU is constrained.
- Use part-count balancing instead of headcount.
- Add factory only after resource logistics can feed it.
- Expand remote set carefully; CPU usually becomes a limiter.
- Improve room planner: staged construction by RCL and storage reserves.

Factory:

- Basic commodities can be useful, but production chains are logistics-heavy.
- Do not set permanent factory level without plan.

Exit criteria:

- Two spawns are used intentionally, not just opportunistically.
- CPU and Memory stay stable as creep count grows.

## RCL8 Endgame Room

Goal:

- Maximize useful surplus: GCL/GPL, boosts, power, market, military.

Best practices:

- Use 3 spawns for replacement timing, emergency response, and boosted ops.
- Keep controller upgrade cap in mind: 15 e/t unless `OPERATE_CONTROLLER`.
- Use observer for highway/SK/hostile intel.
- Process power only when energy surplus supports 50 e/t.
- Maintain boost production based on real demand.
- Use nuker as strategic pressure; landing time is 50000 ticks.
- Consider fewer, larger creeps to reduce CPU if spawn time permits.

Endgame loops:

- Observer scan queue.
- Market balancing.
- Lab boost pipeline.
- Power creep ops.
- Highway deposit/power missions.
- Rampart maintenance and war readiness.

Avoid:

- Dumping all surplus into walls without strategic thresholds.
- Running every endgame system every tick.
- Generating pixels if bucket is needed for planning/combat bursts.

## Expansion Phase

Trigger:

- Spare GCL and enough economy to support builders/claimer.

Best practices:

- Scout candidate rooms first.
- Prefer two-source rooms with good exits and remote potential.
- Claimer TTL is 600; route distance matters.
- New room needs imported builders until first spawn is complete.
- Parent room should send larger builders than the child can spawn.
- Use a room bootstrap state machine:
  1. reserve/claim,
  2. place spawn,
  3. import builders,
  4. protect/upgrade controller,
  5. local source mining,
  6. local spawn online,
  7. transition to normal room manager.

Avoid:

- Claiming rooms you cannot defend or bootstrap.
- Starting expansion during active remote/economy instability.

## Defense Phase Progression

Early:

- Tower + safe mode + basic hostile detection.

Mid:

- Rampart-covered defenders, remote guards, hostile body analysis.

Late:

- Boosted defenders, tower damage/heal math, observer intel, active counterattacks.

Rules:

- Invader defense is economy protection, not optional.
- Tower firing should account for hostile heal/tough.
- Repair spam is an energy sink; use only when stalling matters.

## Automation Phase Progression

Stage 1:

- Fixed roles and counts.

Stage 2:

- Spawn queue with priorities.

Stage 3:

- Part-count demand and throughput targets.

Stage 4:

- Room/colony state machine.

Stage 5:

- Multi-room empire manager with intel, market, labs, observer, military.

## Repo-Specific Mapping

Current repo already has:

- CPU-gated loop.
- Spawn queue.
- Ant role hierarchy.
- Round-robin execution.
- Movement cache.
- Room extension cached finders.

Good next improvements by phase:

- RCL1-3: harden cold boot and tower target rules.
- RCL4: storage-centric filler/hauler split.
- RCL5: remote profitability model and route cache.
- RCL6: terminal/mineral/lab manager.
- RCL7: part-count spawn demand.
- RCL8: observer queue, boosts, power/market automation.
