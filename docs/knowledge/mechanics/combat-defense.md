# Combat And Defense

Use this for combat bodies, damage math, tower decisions, and siege checks.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/defense.html
- https://docs.screeps.com/invaders.html

## Creep Combat Constants

| Action | Part | Power |
|---|---|---:|
| Melee attack | `ATTACK` | 30 damage/tick |
| Ranged attack | `RANGED_ATTACK` | 10 damage/tick |
| Ranged mass attack | `RANGED_ATTACK` | range-dependent AoE within 3 |
| Heal adjacent/self | `HEAL` | 12 hits/tick |
| Heal ranged | `HEAL` | 4 hits/tick |
| Dismantle | `WORK` | 50 hits/tick |
| Repair | `WORK` | 100 hits/tick |

Damage/body:

- Each body part has 100 hits.
- Damage applies to body parts in body order.
- Destroyed parts stop contributing.
- `TOUGH` has no active effect but is cheap hit padding.

## Combat Boosts

| Part | Boost family | Effect |
|---|---|---|
| `ATTACK` | `UH/UH2O/XUH2O` | x2/x3/x4 attack |
| `RANGED_ATTACK` | `KO/KHO2/XKHO2` | x2/x3/x4 ranged attack |
| `HEAL` | `LO/LHO2/XLHO2` | x2/x3/x4 heal |
| `TOUGH` | `GO/GHO2/XGHO2` | damage taken x0.7/x0.5/x0.3 |
| `MOVE` | `ZO/ZHO2/XZHO2` | fatigue reduction x2/x3/x4 |
| `WORK` | `ZH/ZH2O/XZH2O` | dismantle x2/x3/x4 |

Boost targeting:

- `TOUGH` boosts are applied left-to-right.
- Other boosts are applied right-to-left.

## Tower Damage

Official:

- Tower action cost: 10 energy.
- Attack: 600 hits at range <=5, 150 hits at range >=20.
- Heal: 400 hits at range <=5, 100 hits at range >=20.
- Repair: 800 hits at range <=5, 200 hits at range >=20.
- Effect linearly falls between range 5 and 20.

Derived linear formulas for range `r`:

```text
attack = r <= 5 ? 600 : r >= 20 ? 150 : 600 - (r - 5) * 30
heal   = r <= 5 ? 400 : r >= 20 ? 100 : 400 - (r - 5) * 20
repair = r <= 5 ? 800 : r >= 20 ? 200 : 800 - (r - 5) * 40
```

Design:

- Tower placement near exits and ramparts matters.
- Multiple close towers can delete unboosted creeps; distant towers are much weaker.
- Tower repair is convenient and CPU-light, but energy-inefficient versus creep repair.
- Creep repair: `REPAIR_POWER = 100`, `REPAIR_COST = 0.01` => 100 hits/energy.
- Tower repair range <=5: 800 hits / 10 energy => 80 hits/energy.
- Tower repair range 15: 400 hits / 10 energy => 40 hits/energy.
- Tower repair range >=20: 200 hits / 10 energy => 20 hits/energy.
- Use towers for emergencies, defense-adjacent repairs, or small local maintenance with surplus energy. Use creeps for planned roads/containers/ramparts/walls, especially distant targets.

## Safe Mode And Ramparts

- Ramparts block hostiles and protect objects/creeps on same tile.
- Your creeps can stand on your ramparts and attack while protected.
- Ramparts decay by 300 hits per 100 ticks.
- Safe mode lasts 20000 ticks and can only be active in one room per shard.

## Power Banks

- 2000000 hits.
- Return damage: 50% of damage dealt to attacker.
- Contains 500-10000 power.
- Decays in 5000 ticks.

Design:

- Requires coordinated attackers, healers, and haulers.
- Return damage makes raw DPS insufficient without healing.

## Nukes

- Range: 10 rooms.
- Launch cost: 300000 energy + 5000 ghodium.
- Cooldown: 100000 ticks.
- Landing time: 50000 ticks.
- Damage: 10000000 at target tile, 5000000 in 5x5 area.
- Removes creeps, construction sites, and dropped resources in room, even inside ramparts.
