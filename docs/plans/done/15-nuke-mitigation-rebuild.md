# Nuke Mitigation Rebuild

## Target

When a nuke is detected, turn the 50000 tick warning into a controlled relocation plan.

Goal:

- move resources out of impact area,
- dismantle/recycle threatened structures where useful,
- rebuild critical infrastructure outside blast radius before impact,
- keep room economy/defense alive during the transition.

## Policy

This is defensive only.

- React to incoming nukes.
- Do not retaliate automatically.
- Do not attack the launch room.
- Notify once, then execute mitigation if enabled.

## Nuke Area

Use impact radius:

```text
danger tile = range <= 2 from nuke.pos
safe tile = range >= 3 from every incoming nuke.pos
```

Damage reference:

- target tile: 10000000 damage
- 5x5 area: 5000000 damage
- landing time: 50000 ticks

## Strategy Choice

For each threatened structure choose one:

| Strategy | Use when |
|---|---|
| Tank with rampart | structure is irreplaceable/central and rampart can reach required hits in time |
| Relocate | structure can be rebuilt elsewhere and room can survive transition |
| Abandon | low-value roads/walls/extensions where rebuild after impact is cheaper |

Default for CPU-limited solo bot:

- relocate economy structures,
- tank only if already close to required rampart hits,
- abandon cheap roads/walls.

## Structure Priority

Evacuate/rebuild order:

1. Spawn path: at least one safe spawn must exist or be planned first.
2. Storage/terminal resources.
3. Towers needed for defense.
4. Extensions needed for emergency bodies.
5. Links used by source/controller logistics.
6. Labs/factory/power spawn/nuker.
7. Containers and roads.
8. Walls/ramparts.

Do not dismantle the last functional spawn before a safe replacement is online unless the room has parent-room support.

## Memory Model

Add room memory:

```ts
interface NukeMitigationPlan {
  active: boolean;
  detectedAt: number;
  landAt: number;
  nukes: Array<{ x: number; y: number; roomName: string; landAt: number }>;
  phase: 'scan' | 'evacuate' | 'rebuild' | 'dismantle' | 'survive' | 'recover' | 'done';
  affectedStructureIds: Id<Structure>[];
  safePlan: Array<{ type: StructureConstant; x: number; y: number; priority: number }>;
  resourceEvacuationDone: boolean;
}
```

## Detection

In `DefenseManager`:

- scan `FIND_NUKES` in owned rooms on staggered cadence,
- update `RoomMemory.nukes`,
- call `Game.notify` once per unique nuke,
- create mitigation plan if enabled.

Scan cadence:

- owned rooms: every 50 ticks,
- if active nuke plan: every 10 ticks,
- visual debug only behind flag.

## Planning

On detection:

1. Collect all structures in danger tiles.
2. Classify by type and value.
3. Find safe positions from room layout or fallback planner.
4. Check controller structure limits.
5. Create safe construction queue.
6. Create dismantle queue.
7. Create resource evacuation targets.

Safe-position rules:

- range >= 3 from every nuke,
- not wall terrain,
- not blocking source/controller/mineral access,
- not in known enemy attack path if avoidable,
- compatible with future layout.

## Resource Evacuation

Before dismantling:

- move terminal/storage/lab/factory resources to safe storage/terminal/container,
- if no safe local storage exists, send high-value resources to another owned room,
- prioritize boosts, power, ghodium, minerals, then energy.

Resource priority:

1. boosts and tier-3 compounds
2. power, ghodium
3. rare minerals and commodities
4. energy needed for rebuild
5. excess energy

## Rebuild Queue

Respect construction-site budget from plan 12.

Limits:

- max 3 nuke-mitigation sites per room per 50 ticks,
- reserve 10 global sites for emergency/remote/bootstrap,
- never block critical spawn/defense sites.

Priority:

1. safe spawn if current spawn is threatened
2. safe tower
3. safe storage/terminal path
4. extensions
5. links
6. labs/factory/power spawn
7. roads

## Dismantle Queue

Use WORK creeps to dismantle threatened structures only after replacements/resources are handled.

Dismantle priority:

1. structures blocking replacement limit
2. high-cost structures that cannot survive
3. damaged structures near impact
4. roads/containers only if creep time is available

Do not dismantle:

- last spawn without replacement,
- last tower while hostile risk is active,
- storage/terminal before resources are evacuated,
- controller container/link if upgraders still depend on it and no alternative exists.

## Creep Roles

Reuse existing roles if possible:

- builders build safe replacements,
- transporters evacuate resources,
- workers/wallbuilders can dismantle if a `DismantleTask` exists.

Future optional role:

- `EvacuationAnt`: CARRY-heavy resource mover.
- `DismantlerAnt`: WORK-heavy structure recycler.

Do not add these roles first; start with task overlays for existing workers.

## CPU Rules

Critical every tick:

- keep spawn/tower/filler economy alive,
- resource evacuation if landing is near.

Normal:

- build safe replacement sites.

Low:

- full affected-structure scan,
- safe-layout planning,
- visual blast radius,
- noncritical dismantle.

Urgency:

| Ticks to land | Behavior |
|---:|---|
| > 30000 | slow rebuild, normal CPU limits |
| 10000-30000 | prioritize replacements and resource evacuation |
| 3000-10000 | stop optional jobs, spawn builders/transporters |
| < 3000 | only critical evacuation/survival |

## Acceptance

- Incoming nuke creates one room mitigation plan.
- Bot does not auto-attack another player.
- Critical resources are moved before storage/terminal dismantle.
- Safe replacement sites are outside range 2 of all nukes.
- Last spawn/tower is not dismantled without replacement or parent support.
- Construction-site budget is respected.
- After impact, recovery phase clears invalid ids and rebuilds missing essentials.
