# Creep Mechanics And Actions

Use this for method ranges, body requirements, conflicts, and action design.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/creeps.html
- https://docs.screeps.com/simultaneous-actions.html
- https://docs.screeps.com/game-loop.html

## Body Order And Damage

Official:

- Creeps have up to 50 body parts.
- Each part has 100 hits.
- Damage is applied to body parts in spawn order.
- Fully damaged parts stop working.

Design:

- Put `TOUGH` first for damage soak.
- Put key active parts later if they should survive longer.
- Boosted `TOUGH` is counted left-to-right by `boostCreep`; other boosted parts right-to-left.

## Movement

Official:

- `MOVE` reduces fatigue by 2/tick.
- Non-`MOVE` parts generate fatigue on movement: road 1, plain 2, swamp 10.
- Empty `CARRY` parts do not generate fatigue.
- Creep cannot move with fatigue > 0.
- `move`, `moveByPath`, `moveTo` return `ERR_TIRED` when fatigue is non-zero.

## Action Ranges

| Method | Parts | Range |
|---|---|---:|
| `harvest` | `WORK` | 1 |
| `build` | `WORK`, `CARRY` | 3 |
| `repair` | `WORK`, `CARRY` | 3 |
| `upgradeController` | `WORK`, `CARRY` | 3 |
| `transfer` | `CARRY` | 1 |
| `withdraw` | `CARRY` | 1 |
| `pickup` | `CARRY` | 0 or 1 |
| `claimController` | `CLAIM` | 1 |
| `reserveController` | `CLAIM` | 1 |
| `attackController` | `CLAIM` | 1 |
| `heal` | `HEAL` | 1 |
| `rangedHeal` | `HEAL` | 3 |
| `attack` | `ATTACK` | 1 |
| `rangedAttack` | `RANGED_ATTACK` | 3 |
| `dismantle` | `WORK` | 1 |

## Simultaneous Actions

Official:

- Commands are scheduled during `main` and resolved later.
- Some creep methods are mutually exclusive in action pipelines.
- If multiple dependent methods are scheduled, priority decides; same method uses last call.
- Methods from different pipelines can run in same tick.
- `moveTo`, `rangedMassAttack`, `heal`, `transfer`, `drop`, `pickup`, `claimController` can be combined if resources and pipelines allow.
- If energy is insufficient for all scheduled energy-using operations, conflict resolution applies.

Implementation:

- One movement command per creep per tick; last `move`/`moveTo` wins.
- Avoid issuing `repair` on full structures: it can return `OK` and block other useful work in its pipeline.
- Check target state before scheduling expensive/competing actions.

## Harvest

Official:

- Requires `WORK`.
- Adjacent target.
- If no empty `CARRY`, harvested resource drops to ground.
- Mineral harvest requires extractor.
- Deposits/extractors can return `ERR_TIRED` due cooldown.

Design:

- Static miner can omit `CARRY` only if standing on container/link or dropping intentionally.
- Mineral miners need extractor and should handle 5 tick extractor cooldown.

## Build, Repair, Upgrade

Official:

- Build and repair range is 3.
- Upgrade range is 3.
- `WORK` scales action amount.
- Repair consumes 1 energy per 100 hits.
- Build progress is 5 per `WORK` per tick.
- Upgrade is 1 control point per `WORK` per tick.

Design:

- Builder/upgrader positioning can use range 3, not adjacency.
- Repair threshold logic saves CPU and energy logistics.

## Reserve And Claim

Official:

- Claim uses `CLAIM`, adjacent.
- Reserve increases reservation by 1 tick per `CLAIM` part per tick.
- Reservation max is 5000.
- Reserving neutral room restores sources to full capacity.

Design:

- Reserve remotes to double source yield from 1500 to 3000 per regen.
- Claim creeps have 600 tick lifetime; route distance matters heavily.

## Pull

Official pattern:

- Puller calls `pull(target)`.
- Pulled creep calls `move(puller)`.
- Puller also moves.

Use for:

- Low- or zero-`MOVE` creeps.
- Siege/body transport where active parts matter more than speed.
