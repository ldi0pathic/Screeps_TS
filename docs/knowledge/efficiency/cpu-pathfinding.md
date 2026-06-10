# CPU And Pathfinding Efficiency

Use this for CPU gates, movement caching, room scans, and profiling choices.

Sources:

- https://docs.screeps.com/cpu-limit.html
- https://docs.screeps.com/game-loop.html
- https://docs.screeps.com/api/

## CPU Model

Official:

- CPU limit is milliseconds per tick.
- Without CPU unlock, official server limit is fixed at 20.
- With CPU unlock, CPU limit depends on GCL: 10 CPU per GCL, capped at 300.
- Bucket stores unused CPU up to 10000.
- Scripts can burst above limit using bucket, up to 500 CPU/tick.
- `Game.cpu.tickLimit` is current spendable CPU and never lower than `Game.cpu.limit`.

Implementation rules:

- Gate expensive jobs on bucket and `tickLimit - getUsed()`.
- Schedule noncritical work over many ticks.
- Keep emergency spawn/defense before CPU-heavy pathfinding.

## Game Loop Semantics

Official:

- Game state is fixed during your `main` execution.
- Effects of commands appear next tick.
- Multiple commands are accumulated and resolved at tick end.

Implications:

- Do not expect `creep.pos` to update after `move` in same tick.
- Avoid same-tick logic that depends on a command's side effect.
- Use previous tick `room.getEventLog()` for actual outcomes.

## PathFinder

Official:

- `PathFinder` is native C++ and supports custom costs and multi-room paths.
- `maxOps` default is 2000.
- CPU estimate: 1 op ~= 0.001 CPU.
- `maxRooms` default 16, max 64.
- `maxCost` can halt impossible/too-expensive searches early.
- Return value includes `path`, `ops`, `cost`, `incomplete`.
- `incomplete` means partial path to closest found point; do not blindly follow forever.
- If target is not walkable, set `range >= 1`; otherwise CPU is wasted searching for an impossible tile.
- `roomCallback` is called once per room per search.
- Cache `CostMatrix` if running multiple searches in same room/tick.

Path rules:

```ts
PathFinder.search(origin, { pos: target.pos, range: 1 }, {
  plainCost: 1,
  swampCost: 5,
  maxOps: 1000,
  roomCallback(roomName) { /* cached matrix */ }
});
```

Prefer low terrain costs:

- Official docs note `{ plainCost: 1, swampCost: 5 }` is faster than `{ plainCost: 2, swampCost: 10 }` for equivalent paths.

CostMatrix:

- Costs range 0-255.
- `255` means unwalkable.
- Road-favoring matrix commonly sets road to 1 and obstacles to 255.
- Serialize/deserialize matrices for expensive room intel caches.

Room path APIs:

- `Room.findPath`, `RoomPosition.findPathTo`, `findClosestByPath`, and `Creep.moveTo` use PathFinder by default.
- `Room.findPath` supports `ignoreCreeps`, `ignoreRoads`, `ignoreDestructibleStructures`, `costCallback`, `maxOps`, `maxRooms`, `range`, `plainCost`, `swampCost`.
- `ignoreRoads: true` can speed search when road preference is irrelevant.
- `findExitTo` is not required for inter-room movement; `moveTo(new RoomPosition(...))` can handle it.

## Creep.moveTo

Official:

- `moveTo` is shorthand for pathfinding plus `move`.
- `reusePath` default is 5 ticks.
- Larger `reusePath` saves CPU but reacts slower.
- `noPathFinding: true` returns `ERR_NOT_FOUND` if no cached path, saving CPU.
- Paths are stored in creep memory `_move` when reused.

Pattern:

```ts
// Cheap phase
creep.moveTo(target, { noPathFinding: true });

// Expensive phase only if CPU allows
if (Game.cpu.tickLimit - Game.cpu.getUsed() > 20) {
  creep.moveTo(target, { reusePath: 20 });
}
```

## Room.find And Lookups

Official:

- `Room.find(type)` results are cached automatically per room/type until end of tick, before custom filters.
- Custom filters still run each call.
- `Game.getObjectById` retrieves visible objects by ID.
- `Room.getTerrain()` gives fast static terrain access for any room.

Rules:

- Cache IDs in memory for stable targets.
- Cache filtered results yourself if reused in same tick.
- Prefer `findClosestByRange` when path distance is not required.
- Use `findClosestByPath` only when path cost changes the decision.

## Event Log

Official:

- `room.getEventLog()` returns previous tick events.
- Parsed access has CPU cost on first access; raw JSON avoids parsing.

Use:

- Audit real repair/build/harvest/upgrade results.
- Avoid scanning all objects when event-driven updates are enough.

## CPU Anti-Patterns

- Calling `moveTo` with fresh pathfinding for every creep every tick.
- Pathing to non-walkable goals without `range`.
- Rebuilding CostMatrix for every creep.
- Repeated `Room.find(..., filter)` where the same filtered list is reused.
- Sorting large target lists every tick when threshold/bucket selection is enough.
