# Energy Economy Efficiency

Use this for harvester, hauler, upgrader, and spawn sizing.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/creeps.html
- https://docs.screeps.com/control.html
- https://docs.screeps.com/resources.html

## Source Throughput

Official:

- `HARVEST_POWER = 2` energy per active `WORK` per tick.
- Source regen time is 300 ticks.
- Owned/reserved source capacity is 3000.
- Unreserved source capacity is 1500.
- Keeper/center source capacity is 4000.

Derived:

| Source | Energy/tick | Minimum `WORK` to drain continuously |
|---|---:|---:|
| Owned/reserved | 10 | 5 |
| Unreserved | 5 | 3 |
| Keeper/center | 13.33 | 7 |

Implications:

- Static miner on owned source wants 5 `WORK` before more harvest `WORK`.
- Extra `WORK` on a saturated source only helps catch up after downtime.
- Remote unreserved mining is half source yield unless controller is reserved.

## Miner Bodies

Derived baseline bodies:

| Energy | Body | Use |
|---:|---|---|
| 300 | `[WORK, WORK, CARRY, MOVE]` | early miner/worker, 4 e/t harvest |
| 550 | `[WORK x5, MOVE]` | static miner into container/link, saturates owned source |
| 650 | `[WORK x5, CARRY, MOVE]` | miner that needs small carry buffer |
| 750 | `[WORK x5, CARRY, MOVE, MOVE, MOVE]` | miner with better repositioning |

If miner stands on source-adjacent container/link and does not haul, prefer `WORK` saturation over `CARRY`.

## Carry Throughput

Official:

- `CARRY_CAPACITY = 50`.
- Empty `CARRY` parts do not generate fatigue.
- Loaded non-`MOVE` parts generate fatigue on movement.

Derived carry formula:

```text
required CARRY = ceil((energy_per_tick * round_trip_ticks) / 50)
```

For one owned source:

```text
required CARRY = ceil((10 * round_trip_ticks) / 50)
               = ceil(round_trip_ticks / 5)
```

Examples:

| Round trip | Needed carry | Capacity |
|---:|---:|---:|
| 10 ticks | 2 | 100 |
| 20 ticks | 4 | 200 |
| 30 ticks | 6 | 300 |
| 50 ticks | 10 | 500 |

Round trip includes travel both ways plus pickup/withdraw/transfer overhead.

## Movement Efficiency

Official fatigue:

- Each non-`MOVE` part generates fatigue when moving: road 1, plain 2, swamp 10.
- Each `MOVE` part reduces fatigue by 2 per tick.
- Empty `CARRY` parts do not generate fatigue.
- Max speed 1 tile/tick needs `MOVE` count >= all other fatigue-generating parts on plains.

Derived ratios for loaded creeps:

| Terrain | 1 tile/tick ratio |
|---|---|
| Road | 1 `MOVE` per 2 loaded non-`MOVE` parts |
| Plain | 1 `MOVE` per 1 loaded non-`MOVE` part |
| Swamp | 5 `MOVE` per 1 loaded non-`MOVE` part |

Design rule:

- Use roads for haulers. Road travel halves `MOVE` need versus plains and massively beats swamps.
- For remote routes, road maintenance cost must be compared to saved body cost and faster round trips.

## Spawn Throughput

Official:

- Spawn time is 3 ticks per body part.
- Creep life is 1500 ticks.

Derived:

```text
spawn_load_per_creep = body_parts * 3 / 1500
```

Examples:

| Body size | Spawn time | Continuous spawn load |
|---:|---:|---:|
| 3 | 9 | 0.6% |
| 6 | 18 | 1.2% |
| 12 | 36 | 2.4% |
| 25 | 75 | 5.0% |
| 50 | 150 | 10.0% |

One spawn can sustain at most 10 full 50-part creeps over normal lifetime if spawning continuously.

## Upgrade Efficiency

Official:

- `UPGRADE_CONTROLLER_POWER = 1` control point per active `WORK` per tick.
- RCL8 max upgrade per tick is 15.
- `GH/GH2O/XGH2O` boost upgrade by 1.5/1.8/2 without increasing energy cost.

Derived:

- Below RCL8, upgrader throughput is `WORK` parts * boosts, limited by energy delivery.
- At RCL8, more than 15 unboosted `WORK` equivalent wastes upgrade potential for that tick.
- Boosted RCL8 target can hit cap with fewer body parts: `ceil(15 / 2) = 8 XGH2O WORK`.

## Build/Repair Efficiency

Official:

- `BUILD_POWER = 5`.
- `REPAIR_POWER = 100`.
- `REPAIR_COST = 0.01`, so 1 energy repairs 100 hits.
- `LH/LH2O/XLH2O` boost build/repair by 1.5/1.8/2 without increasing energy cost.

Derived:

- Repair is energy-cheap but CPU/path/logistics-heavy if done too often.
- Prefer threshold repairs for roads/ramparts/containers instead of every tick.
- `XLH2O` doubles build/repair throughput for same energy, useful for large rampart pushes.

## Remote Mining Break-Even

Derived checklist:

- Reserve controller if possible: source output doubles from 5 to 10 e/t.
- Hauler cost grows with route length: use `required CARRY` formula.
- Road cost matters: roads decay by terrain and by traffic.
- Remote miner replacement cost: body energy / 1500 ticks.
- Keeper/center source has higher yield but needs combat overhead.

Minimal income model:

```text
gross = source_energy_per_tick
creep_replacement = sum(body_costs_per_role) / 1500
maintenance = road_repair_energy_per_tick + container_repair_energy_per_tick
net = gross - creep_replacement - maintenance
```
