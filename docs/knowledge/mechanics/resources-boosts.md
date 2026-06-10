# Resources, Minerals, Boosts

Use this for labs, boosted body planning, minerals, and factories.

Sources:

- https://docs.screeps.com/resources.html
- https://docs.screeps.com/api/

## Resource Types

Official categories:

- Energy: source-harvested, used for spawning/building/upgrading/repairs.
- Minerals: harvested from minerals with extractor, used for boosts and commodities.
- Power: from power banks, used for power creeps.
- Commodities: from deposits/factories, mostly trade/economy.

## Minerals And Labs

Official:

- Extractor required to harvest minerals.
- Extractor unlocks at RCL6.
- Extractor cooldown is 5 ticks per harvest.
- Lab unlocks at RCL6.
- Labs: RCL6 3, RCL7 6, RCL8 10.
- One reaction uses two input labs and one output lab.
- Input labs must be within range 2 of output lab.
- Lab reaction output is 5 compound units.
- Boost cost is 30 mineral compound + 20 energy per body part.

## Boost Multipliers

Important boost families:

| Body part | Compounds | Effect |
|---|---|---|
| `WORK` | `UO/UHO2/XUHO2` | harvest x3/x5/x7 |
| `WORK` | `LH/LH2O/XLH2O` | build/repair x1.5/x1.8/x2 |
| `WORK` | `ZH/ZH2O/XZH2O` | dismantle x2/x3/x4 |
| `WORK` | `GH/GH2O/XGH2O` | upgrade x1.5/x1.8/x2 |
| `CARRY` | `KH/KH2O/XKH2O` | capacity x2/x3/x4 |
| `MOVE` | `ZO/ZHO2/XZHO2` | fatigue reduction x2/x3/x4 |
| `ATTACK` | `UH/UH2O/XUH2O` | attack x2/x3/x4 |
| `RANGED_ATTACK` | `KO/KHO2/XKHO2` | ranged x2/x3/x4 |
| `HEAL` | `LO/LHO2/XLHO2` | heal x2/x3/x4 |
| `TOUGH` | `GO/GHO2/XGHO2` | damage taken x0.7/x0.5/x0.3 |

Design:

- Boosted build/repair/upgrade improve throughput without increasing energy cost.
- Boosted harvest increases extraction rate but not source capacity; useful for fewer miner parts or burst catch-up.
- Boosted carry reduces hauler body size and spawn time.
- Boosted move helps large combat or remote creeps.

## Boost Target Ordering

Official:

- `boostCreep(creep, bodyPartsCount)` counts `TOUGH` left-to-right.
- Other body parts are counted right-to-left.

Design:

- Put `TOUGH` at front if it should absorb damage and receive tough boosts.
- Put parts intended for non-TOUGH boosts near the end if partial boosting.

## Unboost

Official:

- `unboostCreep` removes boosts and drops 50% of compounds used.
- Lab cooldown equals total reaction time needed for the compounds.

Use:

- Recycle high-value combat/economy boosts when creep has enough TTL to return.

## Deposits And Factories

Official:

- Deposits are in highway rooms.
- Deposit cooldown increases as harvested.
- Deposits decay when not harvested and respawn nearby.
- Factory unlocks at RCL7.
- Factory cost is 100000, capacity 50000, hits 1000.
- Factory production cooldown depends on product.
- Basic commodities can be produced by any-level factory.
- Higher commodities require Operator `OPERATE_FACTORY`; factory level becomes fixed.

Design:

- Deposit mining must account for travel, increasing cooldown, and market value.
- Commodity chains are logistics-heavy; isolate from core energy economy.
- `factory.produce(resourceType)` requires all ingredients in factory store.
- Non-basic commodities require matching factory level from `PWR_OPERATE_FACTORY`.
- Factory level is permanent once set.

## Tombstones And Ruins

Official:

- Tombstones expose `.creep`, `.store`, `.deathTime`, `.ticksToDecay`.
- Tombstone decay is 5 ticks per body part; power creep tombstone decay is 500.
- Ruins are walkable destroyed structures.
- Ruins expose `.structure`, `.store`, `.destroyTime`, `.ticksToDecay`.
- Ruin decay is normally 500 ticks.

Design:

- Scavenge tombstones/ruins before harvesting if path cost is low.
- Prioritize own tombstones when recovering boosts or high-value carried resources.

## Power

Official:

- Power comes from `StructurePowerBank` in highway rooms.
- Power bank has 2,000,000 hits, 50% return damage, 500-10000 power, 5000 tick decay.
- Power spawn processes 1 power/tick at 50 energy per power.

Design:

- Power harvesting needs combat, heal, haul, and strict decay timing.
