# Community Efficiency And Algorithms

Non-official. Treat as proven community heuristics, not rules.

Sources:

- https://wiki.screepspl.us/CPU/
- https://wiki.screepspl.us/Pathfinding/
- https://wiki.screepspl.us/Static_Harvesting/
- https://wiki.screepspl.us/Remote_Harvesting/
- https://wiki.screepspl.us/Great_Filters/
- https://github.com/bonzaiferroni/Traveler
- https://github.com/bencbartlett/Overmind

## CPU Heuristics

Community notes:

- Absolute CPU numbers vary by environment; compare relative improvement, not raw private-server numbers.
- Intent calls cost CPU even if later blocked in intent resolution.
- Avoid repeated invalid or useless intents:
  - `move` into wall/blocked tile can return `OK` but fail later.
  - many towers over-repairing the same structure can waste intents.
  - action methods on impossible targets still run checks.
- `moveTo` default path cache is per-creep only; it does not share paths or CostMatrices.

Implementation:

- Precheck cheap invariants before expensive/intent calls.
- Use one tower repairer or cap tower repair by expected missing hits.
- Gate visual/debug/log code.
- Record per-manager CPU deltas, not every action.

## Movement Algorithms

Community patterns:

- `Creep.moveTo` is acceptable early but becomes a CPU focus at scale.
- Traveler-style movement improves over raw `moveTo` by:
  - stronger path caching,
  - hostile-room avoidance,
  - long-range path support,
  - ignoring creeps by default to reduce PathFinder churn,
  - stuck detection and path invalidation.
- `ignoreCreeps` reduces path recalculation if roads are not commonly blocked by immobile creeps.
- Use `range` aggressively for sources/controllers/minerals/structures; pathing to exact unwalkable targets wastes CPU.

Recommended algorithm:

1. If creep has cached path and not stuck, follow it.
2. If stuck threshold exceeded, clear path and repath.
3. If target/room is stable, use shared route/path cache keyed by origin area, target, range, and movement policy.
4. Build or fetch room CostMatrix once per room per TTL.
5. Add roads as low cost, walls/hostile ramparts as 255, dangerous tiles as high cost.
6. For long paths, first use `Game.map.findRoute` to choose allowed rooms, then `PathFinder.search` constrained by those rooms.

## Path Cache Storage

Tradeoffs:

| Storage | Pros | Cons | Use |
|---|---|---|---|
| Creep memory path | simple, survives reset | repeated per creep, Memory parse cost | short routes |
| Global path cache | fast, preserves `RoomPosition` objects | lost on reset | hot same-tick/recent paths |
| Memory serialized path | persistent | parse/deserialize cost, stale paths | stable highways/remotes |
| RawMemory segment | large storage | async activation complexity | map intel / route DB |

Rules:

- Cache metadata with route version, TTL, target id/pos, range, room status.
- In visible rooms, shorten TTL when construction/hostiles changed.
- In invisible rooms, allow stale path reuse if risk is acceptable.

## Static Mining

Community patterns:

- Static miner uses fewer `MOVE` parts because it only travels once.
- Dedicated haulers/couriers move energy instead of every worker walking to sources.
- Drop mining can work early but dropped resources decay.
- Container mining cuts drop-mining loss and enables clean hauler pickup.
- Container miner should have at least 1 `CARRY` if it repairs its own container.
- Miner must stand on the assigned container before harvesting, or container value is lost.

Algorithm:

1. Assign source slot/container/link.
2. Spawn miner with enough `WORK` to saturate source.
3. Move miner to exact mining tile.
4. Harvest every tick.
5. If container mining, repair container below threshold.
6. Haulers withdraw/pickup using source throughput formula.

## Link Mining

Community patterns:

- Links reduce hauler movement intents and CPU.
- 3% loss must be compared against hauler body cost, spawn time, road maintenance, and CPU.
- Link cooldown equals distance; very long link transfer may bottleneck.
- Intermediate links reduce cooldown but compound loss: two 3% transfers retain `0.97 * 0.97 = 94.09%`, loss 5.91%.

Use links when:

- source is far from storage/controller,
- haulers are CPU-heavy,
- link count is available,
- destination link is emptied reliably.

## Remote Mining Economics

Community model:

- Remote mining has costs: miner, hauler, reserver, guard, repair, container, road decay, travel time.
- Hauler cost is often the dominant variable.
- Reservation doubles source regen from 1500 to 3000 but requires claim-body energy and reserve intents.
- Road maintenance is nontrivial under hauler traffic.

Useful formulas from community analysis:

```text
hauler CARRY parts for one owned/reserved source ~= ceil(round_trip_ticks / 5)
reserved source gross = 10 e/t
unreserved source gross = 5 e/t
```

Distance caveat:

- Community remote tables show efficiency dropping hard with distance.
- Around 200+ one-way tile distance, remote value can become marginal unless multiple sources, roads, links, boosts, or strategic reasons apply.

Decision checklist:

- Count sources per remote room.
- Check reservation feasibility.
- Estimate hauler CARRY and spawn load.
- Add container and road maintenance.
- Add invader/stronghold downtime risk.
- Prefer two-source rooms over one-source rooms at similar distance.

## Spawn Algorithms

Community patterns:

- Headcount spawning is simple but weak at scale.
- Part-count balancing is better: satisfy required `WORK`, `CARRY`, `ATTACK`, etc. per task, then split into spawnable creeps.
- Queue-based spawning with priority handles emergency and planned roles.
- Cold-boot logic is mandatory: when energy is low and creeps are dead, spawn small flexible recovery creeps.

Algorithm:

1. Compute deficits by room/task in body parts, not just creep count.
2. Convert deficits to bodies based on available energy and role constraints.
3. Prioritize:
   - emergency harvester/filler,
   - defense,
   - source miners,
   - haulers,
   - reservers,
   - builders/upgraders,
   - optional/economy.
4. Validate with `spawnCreep(..., { dryRun: true })`.
5. Reserve spawn time for replacements: `body.length * 3 + travel_time`.

## Task Architecture

Community patterns:

- Fixed roles are easy but can idle when their exact task is unavailable.
- Generic task/goal assignment improves utilization but needs body compatibility checks.
- Mature bots often separate:
  - room/colony state,
  - task generation,
  - spawn demand,
  - creep execution,
  - intel/scouting.

Design for this repo:

- Keep Ant classes as execution units.
- Add task/target selection inside managers, not inside every creep.
- Track room demand as required parts/throughput where possible.

## Scouting And Intel

Community patterns:

- Creep scouts are cheap but cost move intents over time.
- Observer scouting is late-game and CPU-light: one intent, visibility next tick.
- Store consistent room intel; avoid duplicating large room dumps in creep/spawn memory.

Intel TTL examples:

| Data | TTL |
|---|---:|
| terrain | permanent |
| source/controller/mineral positions | long/permanent |
| structures in neutral/hostile rooms | medium, refresh on observer/scout |
| hostiles/invaders | very short |
| deposits/power banks | until decay or next observation |

## Defense Efficiency

Community patterns:

- Invader handling improves net energy by preventing miner/hauler downtime.
- Tower defense must avoid firing when hostile healing/tough parts negate damage.
- Rampart defenders multiply defense value by letting creeps deal damage while protected.
- Repair spam can stall attacks but burns stored energy.

Implementation:

- Estimate tower damage versus hostile heal before sustained firing.
- Spawn defenders near expected threat if tower-only damage is insufficient.
- Cache hostile body analysis for current tick.

## Room Planning Algorithms

Community patterns:

- Mature bots use bunker/stamp layouts or dynamic planning.
- Planning is expensive; run rarely and cache result.
- Use distance transform/flood fill/min-cut style searches for:
  - base anchor selection,
  - wall/rampart perimeter,
  - road network,
  - remote route evaluation.

Rules:

- Generate construction sites incrementally.
- Store plan version and RCL stage.
- Revalidate against terrain and existing structures.

## Source-Keeper And Highway Harvesting

Community patterns:

- SK rooms are high yield: 3 sources, 4000 energy each, built extractor on mineral.
- They need keeper suppression, stronger invader handling, and safe hauler timing.
- Highway targets need observer/scout detection and decay-aware missions.
- Power bank haulers often should spawn after the bank is partly damaged, not at mission start.

Use only when:

- core economy is stable,
- combat/heal logic exists,
- mission ROI beats normal remote expansion.
