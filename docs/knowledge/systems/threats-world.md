# Threats And World Rules

Use this for invader logic, safe mode, start-area rules, and expansion risk.

Sources:

- https://docs.screeps.com/invaders.html
- https://docs.screeps.com/defense.html
- https://docs.screeps.com/start-areas.html
- https://docs.screeps.com/api/

## NPC Invaders

Official:

- Rooms have an internal counter around 100000 mined energy plus randomness.
- When triggered, an invader appears at an exit and hunts creeps.
- Invaders mostly ignore structures unless blocked.
- Invaders can use `attack`, `rangedAttack`, and `dismantle`.
- They cannot move between rooms.
- They appear only at exits to neutral rooms.
- If exits are to controlled/reserved rooms, invaders cannot appear from those exits.
- No email notifications for NPC invaders.

Raids:

- 10% chance for 2-5 invaders instead of one.
- Roles include melee, ranged, healer.
- Some can be boosted.

Design:

- Reserve remote rooms to restore source capacity and reduce invader spawn routes.
- Remote miners/haulers need flee/defense behavior even if no player threat.
- Detect hostiles every tick in active remote rooms or stagger if CPU-limited.

## Strongholds

Official:

- Sector strongholds spawn invaders.
- Destroying a stronghold gives invader-free time until next stronghold.
- `StructureInvaderCore.level` estimates difficulty.
- Active strongholds can spawn lesser cores in neutral/reserved rooms every few thousand ticks.
- Lesser cores reserve controllers and block harvesting until destroyed.
- Strongholds contain loot in containers and ruins.
- Invader Core hits: 100000.
- Deploy stage: 5000 ticks and invulnerable.
- Active stage: 75000 ticks with 10% random variation.
- Lesser core spawn interval by stronghold level: L1 4000, L2 3500, L3 3000, L4 2500, L5 2000.
- One active core can spawn up to 42 lesser cores.

Implementation:

- Remote mining should handle hostile reservation by invader core.
- Scout intelligence should record invader cores and collapse timers.

## Safe Mode

Official:

- New rooms start with safe mode active.
- Safe mode lasts 20000 ticks.
- Only one room per shard can have safe mode active at once.
- Controllers gain one safe mode activation per new level.
- Extra activations can be generated with ghodium.
- Safe mode is last resort; normal defense uses walls, ramparts, towers, defender creeps.

Design:

- Keep emergency safe-mode trigger conservative.
- Do not assume safe mode protects remote rooms.

## Respawn

Official:

- Initial spawn placement should prefer neutral controller rooms with two sources.
- Initial spawn has 300 energy.
- Spawn auto-refills 1 energy/tick until total spawn/extension room energy reaches 300.
- Respawn timeout is 180 seconds.
- GCL remains after respawn.

Design:

- Early bootstrapping can rely on spawn trickle if all creeps die.
- Long-term code should still handle full wipe/recovery from 300 energy.

## Novice And Respawn Areas

Official:

- Novice areas are isolated by indestructible walls until timer expires.
- Only GCL <=3 can start in novice areas.
- Novice rooms: max 3 claimed rooms, unlimited reservation, no safe-mode cooldown, nukers prohibited.
- Respawn areas allow any GCL and only restrict nukers.
- Planned novice/respawn areas are signed by system user.

Constants:

- `SYSTEM_USERNAME`
- `SIGN_NOVICE_AREA`
- `SIGN_RESPAWN_AREA`

Map API:

- `Game.map.getRoomStatus(roomName)` returns `normal`, `closed`, `novice`, or `respawn`.
- Status includes expiration timestamp when temporary.
- Use `continuous: true` in `Game.map.getRoomLinearDistance` for trade/terminal cost estimates.

Implementation:

- Expansion/scouting can read controller signs to avoid future area conversion.
- Reserving important free rooms can prevent area conversion.
