# Role Catalog And Bodies

## Target

CPU-efficient role model for a solo, passive bot. Roles are phase-gated and spawned by measured demand, not static counts.

## Sources

- https://docs.screeps.com/creeps.html
- https://docs.screeps.com/api/
- https://docs.screeps.com/control.html
- https://wiki.screepspl.us/Creep_body_setup_strategies/
- https://wiki.screepspl.us/Static_Harvesting/
- https://wiki.screepspl.us/Remote_Harvesting/

## Hard Rules

- Max body size: 50 parts.
- Spawn time: 3 ticks per body part.
- Normal creep lifetime: 1500 ticks.
- Claim creep lifetime: 600 ticks.
- Source output: owned/reserved 10 e/t, unreserved 5 e/t.
- `WORK` harvest: 2 e/t.
- `CARRY` capacity: 50.
- Road movement: 1 `MOVE` per 2 loaded non-`MOVE` parts.
- Plain movement: 1 `MOVE` per loaded non-`MOVE` part.
- Do not spawn role classes. Spawn deficits: required `WORK`, `CARRY`, route throughput, target id, replacement timing.

## Current Roles

| Role | Current use | Keep | Main issue |
|---|---|---:|---|
| `Worker` | cold boot/generalist | yes | should only be emergency/bootstrap |
| `Miner` | local source miner | yes | body has too much fixed `MOVE` once static |
| `Transporter` | generic hauling | yes | should split by route/source demand |
| `Filler` | spawn/extension refill | yes | should also cover tower refill in RCL3+ |
| `Upgrader` | controller progress | yes | must scale by surplus and RCL8 cap |
| `Builder` | construction | yes | inactive when no useful sites |
| `WallBuilder` | walls/ramparts | yes | surplus-only, never early default |
| `RemoteHarvester` | generic remote worker | temporary | phase out after static remote mining |
| `RemoteMiner` | remote source miner | yes | cap `WORK` by source output, not 20 |
| `Claimer` | claim/reserve | split | claiming and reserving need different policy |
| `Scout` | vision | yes | run by stale intel, not permanent count |

## Role Matrix

| Role | Phase | Body rule | Active when | Disable when |
|---|---|---|---|---|
| EmergencyWorker | 1+ | `[WORK,CARRY,MOVE]` | no viable economy creep | any miner+hauler loop exists |
| BootstrapWorker | 1-2 | `[WORK,CARRY,MOVE]` or `[WORK,WORK,CARRY,MOVE]` | before containers/static mining | source miners active |
| Miner | 2+ | `WORK = min(ceil(ept/2), 5)`, `MOVE=1`, optional `CARRY=1` | local source has container/link | no container/link/position |
| SourceHauler | 2-5 | `CARRY = ceil(ept * roundTrip / 50)` | source container not link-fed | source link online |
| Filler | 2+ | `[CARRY,CARRY,MOVE]` repeat | spawn/extensions need refill | no refill targets |
| TowerFiller | 3+ | same as Filler | tower below reserve | no tower or towers full |
| Upgrader | 1+ | `WORK` by energy surplus; RCL8 max 15 unboosted | controller needs progress | storage low, RCL8 cap reached |
| Builder | 2+ | `[WORK,CARRY,MOVE]` repeat | high-priority construction exists | no sites or CPU low |
| Repairer | 3+ | builder body | roads/containers/ramparts below threshold | tower emergency handles it |
| WallBuilder | 4+ | builder body, larger carry if far | storage surplus and rampart target active | storage low or threat active |
| Scout | 2+ | `[MOVE]` | intel stale or expansion scan queued | intel fresh |
| RemoteMiner | 5+ | unreserved `3WORK`; reserved `5WORK`; add `CARRY=1`, route `MOVE` | remote ROI positive | player threat, invader core, negative ROI |
| RemoteHauler | 5+ | hauler formula per source route | remote container has income | route unsafe or source disabled |
| Reserver | 5+ | `[CLAIM,MOVE]` close, `[CLAIM,CLAIM,MOVE,MOVE]` high ROI | remote reservation below threshold | route unsafe or unreserved ROI better |
| Claimer | expansion | `[CLAIM,MOVE]` | selected settlement target ready | after claim succeeds |
| InvaderCleaner | 5+ | combat body, NPC only | profitable remote blocked by NPC invader/core | player hostile present |
| MineralMiner | 6+ | `WORK` heavy, small `CARRY`, enough `MOVE` for route | extractor+terminal/storage ready | storage low or CPU low |
| LabOperator | 6+ | `[CARRY,CARRY,MOVE]` repeat | labs need mineral logistics | no active lab plan |
| CoreDistributor | 6+ | `[CARRY,CARRY,MOVE]` repeat | terminal/storage/lab/power logistics | no transfer demand |
| EndgameUpgrader | 8 | up to 15 unboosted `WORK`, link-fed | GCL farming and surplus | energy below reserve |
| NukeDismantler | 8 | `[WORK,CARRY,MOVE]` repeat | own structures inside nuke radius must move | no incoming nuke |
| NukeRebuilder | 8 | builder body | rebuild plan outside nuke radius | mitigation complete |

## Body Templates

### EmergencyWorker

```text
300e: [WORK,CARRY,MOVE]
```

Purpose: recover from zero economy. Must be independent of normal spawn demand.

### Miner

```text
owned/reserved source: [WORK,WORK,WORK,WORK,WORK,MOVE]
with self-repair:      [WORK,WORK,WORK,WORK,WORK,CARRY,MOVE]
unreserved source:     [WORK,WORK,WORK,CARRY,MOVE]
```

Notes:

- More than 5 `WORK` on owned/reserved sources is wasted except after downtime.
- More than 3 `WORK` on unreserved sources is usually wasted.
- Static miner should not carry energy to consumers.

### Hauler / Filler

```text
CARRY = ceil(energyPerTick * roundTripTicks / 50)
MOVE road = ceil(CARRY / 2)
body = [CARRY x N, MOVE x ceil(N/2)]
```

Rules:

- Split haulers if body would exceed 50 parts.
- Prefer fewer larger haulers only when replacement timing is safe.
- Filler should be short-route and high-priority; long-route hauling should be separate.

### Upgrader

```text
early:       [WORK,CARRY,MOVE]
mobile:      [WORK,CARRY,MOVE] repeat
link-fed:    [WORK x N, CARRY, MOVE] with fixed position
RCL8 cap:    N <= 15 unboosted effective WORK
```

Scale:

- storage < 20000: 1-2 `WORK`
- storage 20000-100000: moderate, do not starve builders/fillers
- storage > 100000 and CPU ok: scale up
- RCL8: never exceed 15 unboosted effective `WORK`

### Builder / Repairer / WallBuilder

```text
mobile: [WORK,CARRY,MOVE] repeat
near-storage: increase WORK before CARRY
far-from-energy: increase CARRY before WORK
```

Rules:

- Builder active only for useful sites.
- Repairer uses thresholds, not every-tick full-room scanning.
- WallBuilder is storage-surplus only.

### RemoteMiner

```text
unreserved: [WORK,WORK,WORK,CARRY,MOVE,MOVE]
reserved:   [WORK x5, CARRY, MOVE x2-3] after roads
```

Rules:

- Remote miner repairs own container if it has `CARRY`.
- Roadless remote miners need more `MOVE` or earlier pre-spawn.
- Do not use 20 `WORK`; source output caps useful harvest.

### Reserver / Claimer

```text
claim:       [CLAIM,MOVE]
reserve low: [CLAIM,MOVE]
reserve high:[CLAIM,CLAIM,MOVE,MOVE]
```

Rules:

- `CLAIM` is expensive. Spawn by reservation deficit and travel time.
- Do not reserve a room unless remote ROI stays positive after reserver cost.

### Defensive Creeps

```text
basic melee:  [TOUGH,ATTACK,ATTACK,MOVE,MOVE,MOVE]
basic ranged: [TOUGH,RANGED_ATTACK,MOVE,MOVE]
```

Rules:

- Owned-room defense is tower-first.
- Remote defense is NPC-only and only if ROI justifies it.
- Player hostile in remote room means flee/suspend, not fight.
- Put `TOUGH` first, `HEAL` last for combat bodies.

## Phase Activation

| Phase | Enabled role set |
|---|---|
| 1 | EmergencyWorker, BootstrapWorker, minimal Upgrader |
| 2 | Miner, SourceHauler, Filler, small Builder, small Upgrader |
| 3 | TowerFiller, Repairer thresholds, tower defense |
| 4 | storage-backed Filler/Hauler, larger Builder/Upgrader by surplus |
| 5 | RemoteMiner, RemoteHauler, Reserver, Scout if ROI and passive-safe |
| 6 | MineralMiner, LabOperator/CoreDistributor at low frequency |
| 7 | larger replacements, stronger rampart maintenance, optional NPC InvaderCleaner |
| 8 | EndgameUpgrader, PowerSpawn/CoreDistributor, nuke mitigation roles |

## Proposed New Roles

| New role | Why |
|---|---|
| `EmergencyWorker` | hard cold-boot recovery, independent of normal demand |
| `SourceHauler` | exact carry sizing per local source route |
| `RemoteHauler` | exact carry sizing per remote source route |
| `Reserver` | split from `Claimer`; reservation is recurring, claiming is one-shot |
| `TowerFiller` | tower refill has defense priority and should not wait behind generic hauling |
| `Repairer` | threshold maintenance separate from building and wall pushing |
| `MineralMiner` | RCL6 mineral extraction without polluting energy roles |
| `LabOperator` | low-frequency mineral/boost logistics |
| `CoreDistributor` | storage/terminal/lab/power-spawn logistics in mature rooms |
| `InvaderCleaner` | defensive NPC-only remote recovery |
| `NukeDismantler` | dismantle own threatened structures before nuke impact |
| `NukeRebuilder` | rebuild evacuated layout outside nuke radius |

## Implementation Plan

1. Create central `BodyBuilder` with body formulas above.
2. Create `RolePolicy` table: phase min/max, CPU tier, spawn priority, disable condition.
3. Replace static role counts with deficits:
   - source miner deficit by source id
   - hauler deficit by route id
   - builder deficit by construction backlog
   - upgrader deficit by surplus energy
   - remote deficit by ROI and threat state
4. Split `Claimer` policy into `Claimer` and `Reserver`.
5. Split generic hauling into local `SourceHauler`, `Filler`, `RemoteHauler`, and mature-room `CoreDistributor`.
6. Make low-priority roles skip under CPU pressure: Builder, WallBuilder, MineralMiner, LabOperator, CoreDistributor, Scout refresh.
7. Pre-spawn every non-emergency role:

```text
spawn_when = ticksToLive < body.length * 3 + routeTravel + 10
```

## Acceptance

- RCL1 recovers with only 300 energy.
- Local sources are saturated before remotes.
- No role with static count runs when its phase disables it.
- No remote role spawns unless ROI is positive and room is passive-safe.
- No miner has harvest `WORK` above source throughput cap.
- RCL8 upgraders never exceed 15 unboosted effective `WORK`.
- Hauler body size changes with measured route length.
- Tower refill is treated as defense-critical.
