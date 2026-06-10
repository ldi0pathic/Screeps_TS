import {CPUManager} from "./CPUManager";
import {BodyBuilder} from "../utils/BodyBuilder";
import {SpawnManager} from "./SpawnManager";
import {PassivePolicy} from "../policy/PassivePolicy";

const SCAN_INTERVAL_NORMAL = 3;
const SCAN_INTERVAL_LOW = 5;

export class SpawnDemandManager {

    /** Run demand checks for all owned rooms, staggered */
    static run(ownedRooms: string[]): void {
        const interval = Game.cpu.bucket < 3000 ? SCAN_INTERVAL_LOW : SCAN_INTERVAL_NORMAL;

        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            if (!CPUManager.shouldRunEvery(`demand_${roomName}`, interval, i)) continue;

            const room = Game.rooms[roomName];
            if (!room?.controller?.my) continue;

            // Skip demand recalc if stable and recently calculated
            const lastCalc = room.memory.lastSpawnDemandTick ?? 0;
            const timeSince = Game.time - lastCalc;
            if (timeSince < interval) continue;

            this.computeDemands(room);
            room.memory.lastSpawnDemandTick = Game.time;
        }
    }

    /** Returns true when a creep should be pre-spawned (replacement timing) */
    static needsReplacement(creep: Creep, bodyLength: number, travelTicks: number = 0): boolean {
        const ticks = creep.ticksToLive ?? 1500;
        return ticks < bodyLength * 3 + travelTicks + 10;
    }

    private static computeDemands(room: Room): void {
        const phase = room.memory.state;
        const spawnRoom = room;
        const maxEnergy = room.getMaxAvailableEnergy();
        const storageEnergy = room.storage?.store.energy ?? 0;
        const rcl8 = room.controller?.level === 8;
        const rcl = room.controller?.level ?? 0;

        // Phase 8: skip bootstrap/phase checks (endgame skip list per plan 11)
        if (phase === eRoomState.phase8) {
            this.demandEndgame(room, spawnRoom, maxEnergy, storageEnergy);
            return;
        }

        // Phase 1 (RCL1): 2 workers only — no construction, only harvest+upgrade
        if (phase <= eRoomState.phase1 || rcl < 2) {
            this.demandBootstrap(room, spawnRoom, maxEnergy);
            return;
        }

        // Phase 2 (RCL2-3): add containers and static miners
        this.demandMiners(room, spawnRoom, maxEnergy);

        if (phase >= eRoomState.phase2) {
            // Only add haulers if no link network
            this.demandHaulers(room, spawnRoom, maxEnergy);
            this.demandFiller(room, spawnRoom, maxEnergy);
        }

        // Upgrader: scale by storage energy surplus
        this.demandUpgrader(room, spawnRoom, maxEnergy, storageEnergy, rcl8);

        // Builder: only when useful construction sites exist (plan 12: not during RCL1)
        if (phase >= eRoomState.phase2) {
            this.demandBuilder(room, spawnRoom, maxEnergy);
        }

        // Phase 5+: remotes (only after phase4 exit criteria met: storage > 50k)
        if (phase >= eRoomState.phase5 && storageEnergy >= 50000) {
            this.demandRemotes(room, spawnRoom, maxEnergy);
        }
    }

    private static demandBootstrap(room: Room, spawnRoom: Room, maxEnergy: number): void {
        const workers = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name
        );
        if (workers.length < 2) {
            SpawnManager.queueCreep(eJobType.worker, spawnRoom, room.name,
                BodyBuilder.bootstrapWorker(maxEnergy), 999);
        }
    }

    private static demandMiners(room: Room, spawnRoom: Room, maxEnergy: number): void {
        const sources = room.getOrFindEnergieSource();
        const minerBody = BodyBuilder.miner(true);
        const minerCost = BodyBuilder.bodyCost(minerBody);
        if (minerCost > maxEnergy) return;

        for (const src of sources) {
            if (!src.sourceId) continue;
            const existingMiner = Object.values(Game.creeps).find(c =>
                c.memory.workRoom === room.name &&
                c.memory.job === eJobType.miner &&
                (c.memory as MinerMemory).energySourceId === src.sourceId
            );

            if (!existingMiner || this.needsReplacement(existingMiner, minerBody.length)) {
                SpawnManager.queueCreep(eJobType.miner, spawnRoom, room.name, minerBody, 998);
            }
        }
    }

    private static demandHaulers(room: Room, spawnRoom: Room, maxEnergy: number): void {
        // If links are active in phase5+, skip haulers
        if (room.memory.state >= eRoomState.phase5 && (room.memory.targetLinkIds?.length ?? 0) > 0) return;

        const sources = room.getOrFindEnergieSource();
        for (const src of sources) {
            if (!src.sourceId) continue;
            const hasHauler = Object.values(Game.creeps).some(c =>
                c.memory.workRoom === room.name &&
                c.memory.job === eJobType.transporter
            );
            if (!hasHauler) {
                const body = BodyBuilder.hauler(10, 20, true);
                if (BodyBuilder.bodyCost(body) <= maxEnergy) {
                    SpawnManager.queueCreep(eJobType.transporter, spawnRoom, room.name, body, 997);
                }
            }
        }
    }

    private static demandFiller(room: Room, spawnRoom: Room, maxEnergy: number): void {
        const fillers = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.filler
        );
        if (fillers.length < 1) {
            const body = BodyBuilder.filler(2);
            SpawnManager.queueCreep(eJobType.filler, spawnRoom, room.name, body, 996);
        }
    }

    private static demandUpgrader(room: Room, spawnRoom: Room, maxEnergy: number, storageEnergy: number, rcl8: boolean): void {
        const upgraders = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.upgrader
        );
        if (upgraders.length < 1) {
            const linkFed = (room.memory.targetLinkIds?.length ?? 0) > 0;
            const body = BodyBuilder.upgrader(storageEnergy, rcl8, linkFed);
            if (BodyBuilder.bodyCost(body) <= maxEnergy) {
                SpawnManager.queueCreep(eJobType.upgrader, spawnRoom, room.name, body, 11);
            }
        }
    }

    private static demandBuilder(room: Room, spawnRoom: Room, maxEnergy: number): void {
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        if (sites.length === 0) return;

        const builders = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.builder
        );
        if (builders.length < 1) {
            const body = BodyBuilder.builder(maxEnergy);
            SpawnManager.queueCreep(eJobType.builder, spawnRoom, room.name, body, 10);
        }
    }

    private static demandEndgame(room: Room, spawnRoom: Room, maxEnergy: number, storageEnergy: number): void {
        // 4-creep endgame profile
        const miners = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.miner
        );
        const sources = room.getOrFindEnergieSource();
        if (miners.length < sources.length) {
            SpawnManager.queueCreep(eJobType.miner, spawnRoom, room.name, BodyBuilder.miner(true), 998);
        }

        const fillers = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.filler
        );
        if (fillers.length < 1) {
            SpawnManager.queueCreep(eJobType.filler, spawnRoom, room.name, BodyBuilder.filler(3), 996);
        }

        const endgameUpgraders = Object.values(Game.creeps).filter(
            c => c.memory.workRoom === room.name && c.memory.job === eJobType.endgameUpgrader
        );
        if (endgameUpgraders.length < 1 && storageEnergy > 20000) {
            const body = BodyBuilder.endgameUpgrader(maxEnergy);
            SpawnManager.queueCreep(eJobType.endgameUpgrader, spawnRoom, room.name, body, 9);
        }
    }

    private static demandRemotes(room: Room, spawnRoom: Room, maxEnergy: number): void {
        if (!Memory.remoteIntel) return;
        const passiveSafe = PassivePolicy.isExpansionTargetSafe(room.name);
        if (!passiveSafe) return;

        for (const [remoteName, remote] of Object.entries(Memory.remoteIntel)) {
            if (remote.homeRoom !== room.name) continue;
            if (remote.state !== 'mining' && remote.state !== 'reserved' && remote.state !== 'candidate') continue;
            if (remote.netIncome < 3) continue;

            const hasRemoteMiner = Object.values(Game.creeps).some(
                c => c.memory.workRoom === remoteName && c.memory.job === eJobType.remoteMiner
            );
            if (!hasRemoteMiner) {
                SpawnManager.queueCreep(eJobType.remoteMiner, spawnRoom, remoteName,
                    BodyBuilder.remoteMiner(remote.reserved), 4);
            }

            const hasHauler = Object.values(Game.creeps).some(
                c => c.memory.workRoom === remoteName && c.memory.job === eJobType.remoteHauler
            );
            if (!hasHauler) {
                const body = BodyBuilder.hauler(remote.reserved ? 10 : 5, remote.routeDistance * 3, true);
                SpawnManager.queueCreep(eJobType.remoteHauler, spawnRoom, remoteName,
                    BodyBuilder.cap50(body), 4);
            }
        }
    }
}
