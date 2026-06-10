# Bootstrap Fast Path (RCL1 → RCL4)

## Target

Reach RCL4 (storage unlock) as fast as possible on a 20 CPU budget without sacrificing CPU stability.

## Why RCL4 is the Inflection Point

- RCL4 unlocks Storage: the single most important economic structure.
- Storage enables logistics separation (miners drop, haulers carry) — removes the biggest CPU waste of multipurpose workers.
- Before RCL4: every creep is a generalist and CPU usage per unit of output is at its worst.
- Fast path goal: minimize time in RCL1–3, reach storage as soon as possible.

## CPU Budget During Bootstrap

At RCL1–2: 2–4 creeps active. Each generalist creep moves every tick.
Target: ≤ 5 CPU for all creep actions during RCL1–2.
This means: even during bootstrap, path caching is mandatory.

## Phase-by-Phase Plan

### RCL1: Minimal Footprint

Goal: upgrade controller to RCL2 as fast as possible.

Spawn:
- 1 cold-boot worker: `[WORK, CARRY, MOVE]` (200 energy)
- 2nd worker as soon as spawn has 200+ energy

Actions:
- Both workers: harvest → upgrade. No construction yet.
- Do not build extensions yet — they cost construction time with no immediate income benefit.
- Do not spawn a third worker — too many creeps = too much CPU.

Exit to RCL2: controller reaches RCL2.

### RCL2: Add Container, Start Extensions

Goal: place source container, spawn first static miner candidate.

Order:
1. Build extension (5 available at RCL2) — start with closest to spawn.
2. Place container adjacent to nearest source — construction site immediately.
3. Once container is built: spawn static miner `[WORK x5, MOVE]` (550 energy).
4. Workers transition: one upgrades, one hauls from source to spawn/controller.

CPU note: container mining removes harvest→carry→deposit trip for the miner. The worker becomes a pure transporter or upgrader. Fewer role switches = less CPU.

Exit to RCL3: all 5 extensions built, container mined by static miner.

### RCL3: Second Source, Tower

Goal: saturate both sources, build tower.

Order:
1. Second container at second source → second static miner.
2. Build tower immediately once unlocked (RCL3 requirement for phase3).
3. Workers: one hauls from each container, one upgrades.
4. Build remaining 10 extensions (15 total at RCL3).
5. Start first roads: source → spawn, spawn → controller.

Body upgrades:
- Hauler: `[CARRY x3, MOVE x3]` (once 450 energy available) — sized for route.
- Workers: keep `[WORK, CARRY, MOVE]` until storage logistics are online.

CPU budget check: 2 miners (stationary, near zero movement CPU) + 2 haulers (cached paths) + 1 upgrader = ~4 CPU. Safe.

Exit to RCL3+: sources fully saturated, tower built, extensions filled by filler.

### RCL4: Storage Priority

Goal: place and fill storage immediately on RCL4 unlock.

Order:
1. Place storage construction site on RCL4 unlock — this is the only priority.
2. Assign all available builder capacity to storage construction (5000 build progress).
3. Do not start roads or other construction until storage is built.
4. Once storage is online: spawn dedicated filler and transporter to storage.
5. Transition from worker-based economy to miner + hauler + filler split.

## Construction Site Budget

There are 100 global construction sites allowed. During bootstrap, keep sites to a minimum:
- Never place more than 3–5 sites at once in RCL1–3.
- Reserve at least 10 slots for remote rooms (containers, roads).
- LayoutManager must check total site count before placing new sites.

See plan 12 (Construction Site Budget) for the global management strategy.

## Creep Count During Bootstrap

| RCL | Creeps | Body composition |
|---|---|---|
| 1 | 2 workers | `[WORK, CARRY, MOVE]` each |
| 2 | 1 miner + 1 hauler + 1 upgrader | miner 550e, rest minimal |
| 3 | 2 miners + 2 haulers + 1 filler + 1 upgrader | haulers sized to route |
| 4 | 2 miners + 2 haulers + 1 filler + 1 builder + upgraders | upgraders scale with surplus |

## Acceptance

- RCL1 → RCL2 completes within 3000–5000 ticks (2 workers, max upgrade).
- RCL2 → RCL3 completes within 5000–8000 ticks.
- RCL3 → RCL4 completes within 8000–15000 ticks.
- CPU usage stays below 8 during RCL1–2, below 12 during RCL3.
- Storage is placed and built within 100 ticks of RCL4 unlock.
- Global construction site count never exceeds 50 during bootstrap.
