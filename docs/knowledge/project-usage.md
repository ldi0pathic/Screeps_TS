# Project Usage Notes

Use this to apply the official-docs knowledge to this repository.

Repo entry points:

- `src/main.ts`: loop and CPU-gated manager order.
- `src/manager/CPUManager.ts`: bucket/history gates.
- `src/utils/Movement.ts`: path cache and stuck handling.
- `src/extensions/RoomExtension.ts`: cached room finders.
- `src/manager/SpawnManager.ts`: body/role demand and spawn queue.
- `src/records/Jobs.ts`: role to Ant mapping and priority bucket.
- `src/config.ts`: per-room role counts.

## Good Fits For This Codebase

- Keep CPU-heavy operations behind existing CPU gates.
- Keep round-robin role execution for noncritical work.
- Cache stable target IDs in creep memory.
- Prefer room-extension cached finders over raw repeated `room.find`.
- Use source throughput numbers when tuning miner/hauler/upgrader counts.
- Use RCL table when adding construction/layout logic.

## Checks Before Changing Roles

- Does the body saturate the target source?
- Is `MOVE` ratio correct for expected terrain/load?
- Does spawn replacement account for body size * 3 ticks and travel time?
- Does the creep issue only one final movement command?
- Are expensive target scans cached or staggered?

## Checks Before Changing Movement

- Path to non-walkable target uses range 1+.
- Reused path TTL matches route volatility.
- `noPathFinding` path reuse is tried before expensive pathfinding when CPU is low.
- CostMatrix is cached when multiple creeps path through same room/tick.
- `findClosestByRange` is used when exact path distance is unnecessary.
- Cached paths/cost matrices have TTL/version and tolerate global reset.

## Checks Before Changing Repairs

- Containers have different decay in owned vs unowned rooms.
- Roads decay passively and faster under traffic.
- Ramparts decay forever; walls do not.
- Repair target thresholds avoid scanning/sorting every tick.

## Checks Before Changing Resource Pickup

- Tombstones and ruins may be better than harvesting.
- Use `.store` APIs, not deprecated `.energy`/`.storeCapacity` aliases.
- Decay timers make scavenging time-sensitive.

## Official Docs To Recheck

- Constants/API: https://docs.screeps.com/api/
- CPU: https://docs.screeps.com/cpu-limit.html
- Creep movement: https://docs.screeps.com/creeps.html
- Simultaneous actions: https://docs.screeps.com/simultaneous-actions.html
