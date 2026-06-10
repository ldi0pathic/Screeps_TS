# Phase Execution Model

## Target

One phase controller decides what code runs per room and per tick.

## Current Code

- `Room.setRoomState()` maps RCL to `eRoomState`.
- `main.ts` always runs the same manager order.
- `RoomManager.run()` only gates `LinkManager` for phase5+.

## Problems

- Phase is inferred from RCL only — energy economy readiness is ignored.
- Fast growth requires hitting exit criteria actively; RCL alone is a lagging indicator.
- No signal for managers to know if the room has surplus energy for fast upgrading.
- No passive-player safety flag to block expansion into contested areas.

## Add

Create `RoomPhaseManager`.

Responsibilities:

- Ensure `Memory.rooms[roomName].state` is current.
- Build a small phase profile per room, recalculated every 10 ticks.
- Expose phase flags, fast-growth signal, and player-safety flag for all managers.

```ts
interface RoomPhaseProfile {
  phase: eRoomState;
  canUseStaticMining: boolean;
  canUseStorageLogistics: boolean;
  canUseLinks: boolean;
  canUseRemoteMining: boolean;
  canUseIndustry: boolean;
  canUseEndgame: boolean;
  cpuTier: 'critical' | 'normal' | 'low';
  fastGrowthActive: boolean;   // local surplus → scale upgraders
  passiveSafe: boolean;        // no player room adjacent, no recent hostiles
}
```

## Phase Rules

| Phase | Always run | Conditional | Fast-growth focus |
|---|---|---|---|
| 1 | emergency worker, spawn refill, upgrade | no remotes, no layout spam | reach container + both sources mined ASAP |
| 2 | extensions, static mining, roads minimal | construction every 10+ ticks | saturate both sources before extra upgraders |
| 3 | tower defense, static mining | repair throttled | reach RCL4 storage unlock — do not diversify |
| 4 | storage logistics, haulers | room demand metrics | storage > 50k → enable remotes |
| 5 | links, remotes if ROI positive | remote intel/defense | add remote only if net > 3 e/t |
| 6 | terminal/minerals/labs minimal | market/labs low frequency | — |
| 7 | multi-spawn planning, factory optional | commodity chain throttled | — |
| 8 | observer, boosts, power, market | endgame jobs staggered | — |

## Phase Exit Criteria (energy-driven, not only RCL)

| Transition | Exit condition |
|---|---|
| 1 → 2 | RCL2 reached, at least one container **built** and static miner running on first source |
| 2 → 3 | static miner running on **both** sources, tower built, extensions filled reliably |
| 3 → 4 | storage placed and haulers filling it, source income > 8 e/t |
| 4 → 5 | storage > 50 000, spawn utilization < 70%, no active threat |
| 5 → 6 | terminal built, mineral extractor placed, storage > 100 000 |

These are minimum checks — do not advance until all are met.

## Fast-Growth Priority

When `fastGrowthActive` (local energy surplus detected):

- Scale upgrader body to maximum the spawn can currently afford.
- Delay builder spawning until construction is actively blocking income.
- Prioritize source saturation (both sources fully mined) over any other spawn.
- Do not spawn remote creeps until local economy exit criteria are met.

Upgrader scaling cap: RCL8 hard cap is 15 WORK of upgrade per tick (no benefit beyond). Do not over-spawn upgraders at RCL8.

## Passive Player Safety

Before enabling remotes or expansion, check `passiveSafe`:

- No player-owned or player-reserved room in the route or target.
- No hostile player creep seen in adjacent rooms in last 500 ticks.
- If `passiveSafe = false`, disable `canUseRemoteMining` and `canUseExpansion` until clear.

## Steps

1. Add `RoomPhaseManager.getProfile(room)` — recalculate every 10 ticks.
2. Replace direct phase checks in managers with profile flags.
3. In `main.ts`, run managers through phase profile.
4. Store phase transition tick in room memory for diagnostics.
5. On transition, invalidate room caches: storage, links, source slots, layout stage.
6. Feed `passiveSafe` from `IntelManager` data (plans 07 and 01).

## Acceptance

- RCL1-3 never run remotes, labs, market, or factory.
- RCL4+ uses storage logistics.
- RCL5+ runs remotes only if ROI positive and `passiveSafe`.
- RCL6+ runs minerals/terminal/labs.
- CPU-low mode still runs spawn, defense, miners, fillers.
- `fastGrowthActive` scales upgraders when local surplus is available.
