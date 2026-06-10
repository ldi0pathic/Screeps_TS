# Screeps Constants Quick Reference

Use this for exact numbers and formula inputs.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/creeps.html
- https://docs.screeps.com/control.html

## Body Parts

| Part | Cost | Base effect |
|---|---:|---|
| `MOVE` | 50 | Reduces fatigue by 2/tick |
| `WORK` | 100 | harvest 2 energy/tick; build 5; repair 100 hits; dismantle 50 hits; upgrade 1 |
| `CARRY` | 50 | 50 resource capacity |
| `ATTACK` | 80 | 30 melee damage |
| `RANGED_ATTACK` | 150 | 10 ranged damage, range 3 |
| `HEAL` | 250 | 12 adjacent heal; 4 ranged heal |
| `TOUGH` | 10 | 100 hits, no active effect |
| `CLAIM` | 600 | claim/reserve/attack controller |

## Creep

| Constant | Value |
|---|---:|
| `CREEP_LIFE_TIME` | 1500 ticks |
| `CREEP_CLAIM_LIFE_TIME` | 600 ticks |
| `MAX_CREEP_SIZE` | 50 parts |
| `CREEP_SPAWN_TIME` | 3 ticks per body part |
| Hits | 100 per body part |
| Tombstone decay | 5 ticks per body part |
| Recycle max energy return | 125 energy per body part |

## Sources

| Room state | Energy | Regen | Derived income |
|---|---:|---:|---:|
| Owned/reserved | 3000 | 300 ticks | 10 energy/tick |
| Unreserved | 1500 | 300 ticks | 5 energy/tick |
| Keeper/center | 4000 | 300 ticks | 13.33 energy/tick |

Derived `WORK` parts to saturate one source:

- Owned/reserved: `ceil(10 / 2) = 5 WORK`
- Unreserved: `ceil(5 / 2) = 3 WORK`
- Keeper/center: `ceil(13.33 / 2) = 7 WORK`

## Core Structure Values

| Structure | Cost | Capacity / effect | Decay / cooldown |
|---|---:|---|---|
| Spawn | 15000 | 300 energy; 3 ticks/body part | auto-regens 1 energy/tick when room energy < 300 |
| Extension | 3000 | RCL 1-6: 50, RCL7: 100, RCL8: 200 | none |
| Road plain | 300 | move cost 1 | -100 hits / 1000 ticks |
| Road swamp | 1500 | move cost 1 | -500 hits / 1000 ticks |
| Road wall | 45000 | move cost 1 over wall | -15000 hits / 1000 ticks |
| Container | 5000 | 2000 capacity | -5000 hits / 500 owned ticks; /100 unowned ticks |
| Rampart | 1 | protects tile; max by RCL | -300 hits / 100 ticks |
| Link | 5000 | 800 energy | cooldown = linear distance; 3% loss |
| Tower | 5000 | 1000 energy | 10 energy/action |
| Storage | 30000 | 1000000 capacity | none |
| Terminal | 100000 | 300000 capacity | 10 tick cooldown |
| Factory | 100000 | 50000 capacity | product-specific cooldown |
| Observer | 8000 | 10 room range | visibility next tick |
| Nuker | 100000 | 300000 energy + 5000 ghodium | 100000 tick cooldown |

Road traffic note: every creep step reduces road decay timer by 1 tick per body part.

## Controller

| RCL | Upgrade needed | Key unlocks |
|---:|---:|---|
| 1 | 200 | 1 spawn |
| 2 | 45000 | 5 extensions, walls, ramparts |
| 3 | 135000 | 10 extensions, 1 tower |
| 4 | 405000 | 20 extensions, storage |
| 5 | 1215000 | 30 extensions, 2 towers, 2 links |
| 6 | 3645000 | 40 extensions, 3 links, extractor, 3 labs, terminal |
| 7 | 10935000 | 2 spawns, 50 extensions at 100 cap, 3 towers, 4 links, 6 labs, factory |
| 8 | max | 3 spawns, 60 extensions at 200 cap, 6 towers, 6 links, 10 labs, observer, power spawn, nuker |

Controller constants:

- `CONTROLLER_MAX_UPGRADE_PER_TICK = 15`
- `CONTROLLER_RESERVE_MAX = 5000`
- Downgrade timers: RCL1 20000, RCL2 10000, RCL3 20000, RCL4 40000, RCL5 80000, RCL6 120000, RCL7 150000, RCL8 200000.

## CPU

- Base CPU limit without unlock: 20.
- With CPU unlock: 10 CPU per GCL, capped at 300.
- Bucket max: 10000 CPU.
- Max burst from bucket: up to 500 CPU/tick.
- `PathFinder` ops approximation: 1 op ~= 0.001 CPU.
- Pixel generation costs 10000 CPU from bucket.

## Stores And Loot

- Use `.store.getUsedCapacity(resource)`, `.getFreeCapacity(resource)`, `.getCapacity(resource)`.
- Legacy `.energy`, `.energyCapacity`, `.storeCapacity`, `.power`, `.ghodium` properties are deprecated aliases on many structures.
- Tombstone decay: 5 ticks per creep body part; power creep tombstone 500 ticks.
- Ruin decay: 500 ticks except special cases.
