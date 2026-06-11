# Structures, RCL, Decay

Use this for construction planning, repairs, tower/link logic, and RCL unlock checks.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/control.html
- https://docs.screeps.com/defense.html

## RCL Unlocks

| RCL | Energy to next | Spawns | Extensions | Towers | Links | Other |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 200 | 1 | 0 | 0 | 0 | roads, 5 containers |
| 2 | 45000 | 1 | 5 x 50 | 0 | 0 | walls, ramparts |
| 3 | 135000 | 1 | 10 x 50 | 1 | 0 |  |
| 4 | 405000 | 1 | 20 x 50 | 1 | 0 | storage |
| 5 | 1215000 | 1 | 30 x 50 | 2 | 2 |  |
| 6 | 3645000 | 1 | 40 x 50 | 2 | 3 | extractor, 3 labs, terminal |
| 7 | 10935000 | 2 | 50 x 100 | 3 | 4 | 6 labs, factory |
| 8 | max | 3 | 60 x 200 | 6 | 6 | 10 labs, observer, power spawn, nuker |

## Decay And Maintenance

| Structure | Decay |
|---|---|
| Road plain | -100 hits / 1000 ticks |
| Road swamp | -500 hits / 1000 ticks |
| Road wall | -15000 hits / 1000 ticks |
| Container owned room | -5000 hits / 500 ticks |
| Container unowned room | -5000 hits / 100 ticks |
| Rampart | -300 hits / 100 ticks |

Derived passive repair energy:

| Structure | Energy/tick to offset passive decay |
|---|---:|
| Road plain | 0.001 |
| Road swamp | 0.005 |
| Road wall | 0.15 |
| Container owned | 0.1 |
| Container unowned | 0.5 |
| Rampart | 0.03 |

Formula:

```text
repair_energy_per_tick = decay_hits_per_tick * REPAIR_COST
REPAIR_COST = 0.01 energy/hit
```

Traffic raises road maintenance: every creep step reduces road decay timer by 1 tick per body part.

## Roads

Official:

- Road movement cost is 1.
- Roads can be built on terrain walls.
- Cost: plain 300, swamp 1500, wall 45000.
- Hits: plain 5000, swamp 25000, wall 750000.

Design:

- Roads are strongest on swamp routes because they reduce fatigue from 10 per non-`MOVE` part to 1.
- Heavy traffic increases decay; large creeps on roads cost more maintenance.

## Containers

Official:

- Walkable.
- Dropped resources on same tile automatically go into container.
- Capacity 2000.
- Limit 5 per room.

Design:

- Source-adjacent container enables static miners.
- Remote containers in unowned rooms cost 0.5 energy/tick passive maintenance each before traffic/opportunity cost.

## Ramparts And Walls

Official:

- Walls and ramparts start with 1 hit.
- Wall max: 300M.
- Rampart max depends on RCL, up to 300M at RCL8.
- Ramparts protect creeps/structures on same tile and block hostiles.
- Ramparts decay.

Design:

- Keep minimum rampart threshold separate from wall-building targets.
- Ramparts are recurring maintenance; walls are not.

## Towers

Official:

- 10 energy/action.
- Attack: 600 hits at range <=5, 150 hits at range >=20.
- Heal: 400 hits at range <=5, 100 hits at range >=20.
- Repair: 800 hits at range <=5, 200 hits at range >=20.
- Effect falls linearly by range.

Design:

- Place towers by combined combat and refill score, not by damage range alone.
- First tower should stay close to spawn/extension core and planned storage/filler route.
- Later towers may move toward likely breach zones only if they stay road-connected and refillable.
- In peacetime, tower repair is convenient but energy-inefficient for distant targets compared with creep repair if logistics exist.
- In combat, focus fire and range matter more than raw tower count.
- Empty tower = 0 DPS; refill path length is part of defensive strength.

## Links

Official:

- Capacity 800.
- Same-room transfer only.
- Cooldown is 1 tick per tile linear distance.
- Energy loss is 3%.

Design:

- Source link -> controller/storage link reduces hauler CPU/path load.
- Link loss is fixed percentage; use for throughput or CPU savings, not perfect energy efficiency.
- Cooldown scales with distance, so central receiver placement matters.

## Spawns And Extensions

Official:

- Spawn capacity 300.
- Spawn time 3 ticks per body part.
- Spawn auto-regens 1 energy/tick while room energy in spawns/extensions is below 300.
- Initial spawn starts with 300 energy and safe mode.
- Safe mode after initial spawn lasts 20000 ticks.
- Respawn has a 180 second timeout.
- GCL survives respawn.
- `spawnCreep` can use explicit `energyStructures` order.
- `dryRun` checks possible spawn without spawning.

Design:

- Use `dryRun` for spawn queue validation.
- Explicit `directions` prevents spawn blocking.
- Replacement scheduling must account for body size * 3 spawn ticks and travel time.

## Observer

Official:

- RCL8 only, one per room.
- Range 10 rooms.
- `observeRoom(roomName)` provides visibility next tick.
- `OPERATE_OBSERVER` can grant unlimited range temporarily.

Design:

- Observer scouting is asynchronous; schedule targets and consume results on following tick.
- Pair with `Game.map.getRoomStatus` and cached intel.

## Nuker

Official:

- RCL8 only, one per room.
- Range 10 rooms.
- Launch cost: 300000 energy + 5000 ghodium.
- Cooldown: 100000 ticks.
- Landing time: 50000 ticks.
- Damage: 10000000 hits at target tile, 5000000 hits in 5x5 area.
- Cannot launch into invalid/protected start-area positions.

Design:

- Nuke planning is strategic, not tactical.
- Account for rampart hit thresholds and long landing time.
