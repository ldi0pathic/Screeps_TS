# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # Compile TypeScript via rollup (no upload)
npm run push-main          # Compile and push to main Screeps server
npm run push-sim           # Compile and push to simulator
npm run watch-main         # Watch mode, auto-push on changes
npm run test               # Run unit tests (Mocha)
npm run lint               # ESLint with TypeScript rules
```

Push destinations (`DEST` env var): `main`, `pserver`, `season`, `sim`. Credentials live in `screeps.json` (not in repo).

To run a single test file: `npx mocha --require ts-node/register test/unit/yourfile.test.ts`

## Architecture

**Entry point:** `src/main.ts` — CPU-gated game loop that runs managers in priority order.

**Loop phases (CPU-aware):**
1. Emergency + regular spawning
2. Priority/critical jobs (`JobsManager`)
3. Tower defense
4. Room management + link routing
5. Normal jobs
6. Cleanup + low-priority jobs
7. Layout construction planning

### Ant (Role) System

Every creep type is an "Ant" class under `src/roles/`. The hierarchy:

```
Ant (base)
├── HarvesterAnt — harvest from containers/storage/dropped/tombstones/sources
│   ├── WorkerAnt, UpgraderAnt, BuilderAnt, WallBuilderAnt
│   ├── TransporterAnt, FillerAnt
│   ├── RemoteHarvesterAnt, RemoteMinerAnt, ScoutAnt
│   └── EndgameUpgraderAnt
└── StationaryAnt — holds position
    ├── MinerAnt
    └── ClaimerAnt
```

Each Ant implements `run()` which drives a two-state machine: `eJobState.harvest` → gather resources, `eJobState.work` → perform job.

**Round-robin scheduling:** Creeps sharing a job/room get staggered execution via `(Game.time + roundRobinOffset) % roundRobin === 0` to spread CPU cost.

### Key Files

| File | Purpose |
|------|---------|
| `src/global.ts` | All enums (`eJobType`, `eJobState`) and memory interfaces |
| `src/config.ts` | Per-room creep counts (edit to tune colony composition) |
| `src/records/Jobs.ts` | Maps `eJobType` → Ant class + priority bucket |
| `src/roles/AntFactory.ts` | Caching factory; creates Ant instances per creep |
| `src/manager/SpawnManager.ts` | Spawn queue with priority; `findNeededCreeps()` drives what gets spawned |
| `src/manager/JobsManager.ts` | Buckets jobs into critical/normal/low; calls `ant.run()` |
| `src/manager/CPUManager.ts` | Tracks bucket history; gates loop phases when CPU is low |
| `src/utils/Movement.ts` | Path caching in creep memory, stuck detection |
| `src/extensions/RoomExtension.ts` | Prototype extensions on `Room` (cached finders for sources, links, containers) |

### Adding a New Role

1. Create `src/roles/YourAnt.ts` extending `Ant` or `HarvesterAnt`
2. Add entry to `eJobType` in `src/global.ts`
3. Register in `src/records/Jobs.ts` with priority bucket
4. Add memory interface to `src/global.ts` if needed
5. Add desired count to `src/config.ts` per room
6. `SpawnManager.findNeededCreeps()` will auto-pick it up

### Memory Interfaces

Creep memory is typed. Base `CreepMemory` has: `job`, `state`, `spawn`, `workRoom`, `spawnRoom`, `roundRobin`, `roundRobinOffset`, movement fields (`moving`, `targetPos`, `path`, `dontMove`).

Specialized interfaces (e.g. `HarvesterCreepMemory`, `MinerMemory`) extend base with cached target IDs. Always cast with `creep.memory as YourMemoryType` before accessing role-specific fields.
