# Automatic Scouting And Settlement Selection

## Target

Automatically scout surrounding rooms and choose the best next owned room.

Must-have filters:

- exactly 2 energy sources,
- claimable controller,
- not adjacent to already used rooms,
- good mineral/material,
- defensible terrain with low wall/rampart perimeter,
- no aggressive behavior toward players.

Sources:

- https://docs.screeps.com/api/
- https://docs.screeps.com/control.html
- https://wiki.screepspl.us/Remote_Harvesting/

## Definitions

`used room`:

- owned room,
- reserved/remote-mined room,
- room in active expansion/bootstrap,
- room manually protected by config.

`adjacent`:

- direct map exit from one room to another via `Game.map.describeExits(roomName)`.
- candidate is rejected if it is adjacent to any used room.

`candidate range`:

- not adjacent, but reachable from a support room.
- practical route distance: 2-6 rooms from nearest owned room on 20 CPU.

## Scout Pipeline

### 1. Discover

Every owned room contributes frontier rooms.

Algorithm:

1. Start from owned rooms.
2. BFS through exits up to depth 6.
3. Skip rooms already known and fresh.
4. Skip unavailable rooms via `Game.map.getRoomStatus`.
5. Queue scout targets by unknown score.

Priority:

1. rooms at distance 2-4 from owned room,
2. rooms in same sector but outside used-room adjacency,
3. rooms with likely good remote cluster,
4. older stale intel refresh.

### 2. Scout

Early game:

- one `[MOVE]` scout per empire or per support room,
- scout moves room-center to room-center,
- one room scan, then next target,
- no combat; flee hostile player rooms.

RCL8:

- observer replaces most creep scouting,
- observer queue scans candidate and adjacent remote ring,
- creep scout only confirms pathability if needed.

### 3. Record Intel

Store compact room intel:

```ts
interface RoomIntel {
  roomName: string;
  lastSeen: number;
  status: 'normal' | 'closed' | 'novice' | 'respawn';
  owner?: string;
  reservation?: string;
  controller?: { id: Id<StructureController>; x: number; y: number; level?: number };
  sources: Array<{ id: Id<Source>; x: number; y: number }>;
  mineral?: { id: Id<Mineral>; x: number; y: number; type: MineralConstant };
  exits: ExitSummary;
  terrain: TerrainSummary;
  threats: ThreatSummary;
  settlementScore?: SettlementScore;
}
```

Do not store full terrain arrays in normal Memory.
Use compact summaries or RawMemory segments later.

## Hard Filters

Reject if:

- source count is not 2,
- no controller,
- controller owned/reserved by another player,
- room is adjacent to any used room,
- room status is `closed`,
- hostile player structures are present,
- active invader core blocks controller,
- route from support room is unavailable,
- candidate is Source Keeper or highway room for settlement.

Soft reject:

- novice/respawn area if expiration/policy is unknown,
- too far for bootstrap support,
- known hostile traffic nearby,
- mineral already abundant and low value.

## Settlement Score

Only score rooms that pass hard filters.

Recommended weights:

| Category | Weight |
|---|---:|
| Defense/perimeter | 35 |
| Economy/local layout | 25 |
| Mineral/material | 15 |
| Remote potential | 15 |
| Logistics distance | 10 |

Maximum: 100.

## Defense Score

Goal: few wall/rampart tiles needed.

Fast heuristic:

1. Count exit groups, not exit tiles.
2. Compute open perimeter candidates around base anchor.
3. Penalize many disconnected entrances.
4. Penalize controller/source positions near exits.
5. Bonus for natural walls and compact bunker area.

Exit group calculation:

- For each edge, collect passable exit tiles.
- Merge contiguous exit tiles into one group.
- Fewer groups is better.

Scoring:

| Feature | Score |
|---|---:|
| 1-2 exit groups | +15 |
| 3-4 exit groups | +8 |
| 5+ exit groups | -10 |
| natural choke points near exits | +10 |
| base anchor can be enclosed by <= 25 ramparts | +10 |
| controller/source exposed near multiple exits | -10 |

Better later:

- implement min-cut / flood-fill perimeter planner.
- score by required rampart count to protect planned base and key paths.

## Economy/Layout Score

Measure:

- source-to-anchor distance,
- source-to-controller distance,
- controller-to-anchor distance,
- number of usable source slots,
- space for spawn/storage/extensions/towers,
- road burden.

Scoring:

| Feature | Score |
|---|---:|
| both sources within practical haul range | +8 |
| controller not far from anchor | +5 |
| storage anchor has enough open terrain | +5 |
| sources have container slots | +4 |
| excessive swamp on core paths | -5 |
| one source isolated behind swamp/exits | -8 |

Anchor selection:

1. Generate possible anchors from terrain distance transform.
2. Reject positions too close to exits.
3. Prefer low total path cost to sources/controller/mineral.
4. Prefer compact defense perimeter.

## Mineral/Material Score

Mineral value depends on current empire stock.

Base preference:

| Mineral | Default value |
|---|---:|
| `X` | 15 |
| deficit mineral | 12 |
| `K`, `U`, `L`, `Z` | 8 |
| `O`, `H` | 6 |
| already abundant | 2 |

Rules:

- Score minerals by shortage, not static value only.
- Good material means it fills boost chain gaps.
- `X` is high value because tier-3 boosts need catalyst.

Example:

```text
mineralScore = baseMineralValue + shortageBonus - abundancePenalty
```

## Remote Potential Score

A good owned room should have good remotes around it.

Scan candidate's ring:

- adjacent rooms,
- distance 2 rooms if CPU allows,
- source count,
- controller availability,
- player ownership/reservation,
- invader core / stronghold risk,
- route length.

Score:

| Feature | Score |
|---|---:|
| 2+ safe remote sources nearby | +8 |
| nearby two-source remote room | +5 |
| remotes avoid player rooms | +4 |
| remotes have many exits/hostile risk | -6 |
| only one-source poor remotes | -6 |

Important:

- Candidate itself must not be adjacent to used rooms.
- Candidate's future remotes also must not overlap existing used-room remotes unless explicitly allowed.

## Logistics Distance Score

Measure from nearest support room:

- `Game.map.findRoute` room count,
- path cost if scouted,
- bootstrap travel time for claimers/builders,
- hauler/defender support feasibility.

Scoring:

| Route | Score |
|---|---:|
| 2-3 rooms | +10 |
| 4 rooms | +7 |
| 5-6 rooms | +3 |
| >6 rooms | reject unless manual |

Penalties:

- route passes player-owned room,
- route passes active stronghold,
- route passes hostile-heavy highway/SK room early.

## Candidate Lifecycle

```text
unknown -> queued -> scouted -> scored -> shortlisted -> reserved_for_expansion -> bootstrap -> owned -> used
```

States:

- `unknown`: discovered by map BFS.
- `queued`: needs scout/observer.
- `scouted`: basic data collected.
- `scored`: all hard filters and score computed.
- `shortlisted`: high score, periodic refresh.
- `reserved_for_expansion`: claim target selected.
- `bootstrap`: claimer/builders active.
- `owned`: controller claimed.
- `used`: active room or remote footprint.

## Selection Rule

Claim only if:

```text
hardFiltersPass
score >= 75
nearestSupportRoom.storageEnergy >= bootstrapReserve
home CPU bucket >= expansionBucketMin
spawnLoadAvailable
no active defense emergency
```

Suggested thresholds:

- `bootstrapReserve`: 50000 energy at RCL4+, 100000+ if route > 3 rooms.
- `expansionBucketMin`: 5000.
- refresh shortlisted intel every 1000-3000 ticks.

## Scout Cadence

CPU-limited server:

| Task | Cadence |
|---|---:|
| discover frontier | every 500 ticks |
| move scout | every tick for scout creep |
| scan visible scout room | on room entry only |
| refresh shortlisted candidate | every 1000 ticks |
| remote ring scoring | low tier, staggered |
| full defense/perimeter score | once per candidate unless terrain changes |

## Passive Player Policy

Reject/avoid:

- owned player rooms,
- reserved player rooms,
- rooms with player structures,
- routes through player rooms.

If hostile player creeps are seen:

- mark room `danger`,
- scout leaves,
- no attack unless in owned/reserved economic room.

## Implementation Steps

1. Add `RoomIntel` memory schema.
2. Add `ScoutPlanner` with BFS discovery and target queue.
3. Extend `ScoutAnt` to consume queue and record intel.
4. Add hard filters.
5. Add scoring modules:
   - defense,
   - economy/layout,
   - mineral,
   - remotes,
   - logistics.
6. Add shortlist with periodic refresh.
7. Add expansion decision gate.
8. Connect selected target to claimer/bootstrap flow.

## Acceptance

- Bot can produce ranked settlement candidates without manual room config.
- Every chosen room has 2 sources.
- Candidate is not adjacent to any used room.
- Candidate has a claimable controller.
- Candidate mineral is scored against empire deficits.
- Defense score estimates required perimeter before claiming.
- Player rooms are avoided.
- Scouting is staggered and CPU-gated.
