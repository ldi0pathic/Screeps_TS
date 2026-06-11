# Runtime, Memory, Debugging

Use this for memory cost, persistence, diagnostics, and global-state assumptions.

Sources:

- https://docs.screeps.com/global-objects.html
- https://docs.screeps.com/scripting-basics.html
- https://docs.screeps.com/modules.html
- https://docs.screeps.com/debugging.html
- https://docs.screeps.com/api/

## Runtime Model

Official:

- Script runs every game tick.
- Commands are scheduled, not executed immediately.
- CPU limit can terminate script execution.
- Simulation mode differs: script runs in browser and CPU is effectively unlimited there.
- Game tick real-time duration varies with server load.
- Server runtime saves VM context and `require` cache across ticks when possible.
- Global/require cache is not persistent storage and can be reset.

Implementation:

- Code must be idempotent per tick.
- Keep emergency actions early in `main`.
- Never rely on a command side effect being visible in the same tick.
- Cache hot immutable data in module/global scope, but rebuild safely after reset.

## CPU Account Utilities

Official:

- `Game.cpu.generatePixel()` consumes 10000 bucket CPU for 1 pixel.
- `Game.cpu.setShardLimits(limits)` can reassign CPU per shard once per 12 hours.
- `Game.cpu.getHeapStatistics()` exposes VM heap statistics.
- `Game.cpu.halt()` resets runtime environment and heap memory.

Rules:

- Only generate pixels when bucket is full and no backlog exists.
- Treat shard-limit changes as manual/account-level automation, not normal per-tick logic.

## Game Object

Official:

- `Game` is recreated each tick.
- Mutating `Game` properties does not persist and does not affect game state.
- Use game object methods to schedule commands.

## Memory

Official:

- `Memory` persists as JSON.
- Memory limit is 2 MB.
- Do not store functions or live game objects.
- Store object IDs and recover with `Game.getObjectById`.
- `Memory` is parsed on first access using `JSON.parse`; CPU cost counts.
- Default behavior is conceptually:

```ts
Memory = JSON.parse(RawMemory.get());
RawMemory.set(JSON.stringify(Memory));
```

Implementation:

- Avoid huge nested memory scans every tick.
- Keep creep memory compact.
- Cleanup dead creep memory.
- Store stable IDs, room names, serialized positions, small state enums.

## RawMemory

Official:

- `RawMemory` allows custom serialization.
- Memory segments provide up to 10 MB additional async memory.
- 100 segments: IDs 0-99.
- Max segment size: 100 KB.
- Max active segments at once: 10.
- `setActiveSegments(ids)` makes segments available next tick.
- Subsequent `setActiveSegments` calls override previous calls.
- Foreign segment access is next-tick async and one foreign segment at a time.
- Deprecated `RawMemory.interShardSegment` is shared and not safe for concurrent shard writes.

Use:

- Large path/cost-matrix/map intelligence caches.
- Historical stats not needed every tick.
- Cross-tick async planning.

Do not use for:

- Hot per-creep state that must be synchronously available every tick.

## InterShardMemory

Official:

- Each shard has separate `Memory`.
- `InterShardMemory` provides 100 KB string data per shard.
- A shard can write only local data; remote data is read-only.

Use:

- Inter-shard creep/market/claim coordination.
- Keep data compact and versioned.

## Notifications

Official:

- `Game.notify(message, groupInterval)` sends email notifications.
- Max 20 notifications can be scheduled per tick.
- Message max length is 1000 chars.
- `groupInterval` groups notifications in minutes.

Rules:

- Group noisy alerts.
- Never notify inside per-creep loops without dedupe.

## Modules

Official:

- Scripts can use Node-like `require` and `module.exports`.
- Lodash is embedded.
- Binary modules can load as raw `Buffer`; WebAssembly is possible.
- `require` results are cached with the VM/global context.

Repo note:

- This TypeScript/Rollup repo compiles modules before upload; keep runtime bundle size and global initialization cost in mind.

## Cache Datastores

From docs/contributed caching overview:

- `Memory`: persistent, 2048 KB, JSON parse/stringify cost.
- `global` / module scope: fast and useful for hot caches, but resets.
- Require cache: reduces compilation/loading cost until reset.

Rules:

- Store durable facts in Memory with TTL/version.
- Store hot deserialized structures in global cache.
- Encode `RoomPosition` compactly instead of storing large objects.
- Clean stale Memory entries or parse cost grows over time.

## Debugging

Official:

- Action methods return `OK` or `ERR_*`.
- A returned `OK` means scheduled successfully, not guaranteed final outcome.
- Browser simulation supports `debugger`.
- Memory inspector can watch Memory values.
- PTR can safely test scripts in a parallel world.
- `Game.map.visual` has no added CPU cost besides serialization, persists one tick, and is limited to 1000 KB serialized data.
- `RoomVisual` persists one tick, has no added CPU cost besides serialization, and is limited to 500 KB per room.

Implementation:

- Log error codes at role boundaries, not inside every hot action path.
- For real outcomes, prefer `room.getEventLog()` where useful.
- Use map/room visuals for path, tower, remote, and threat diagnostics; gate verbose visuals behind flags.
