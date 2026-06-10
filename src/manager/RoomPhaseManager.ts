import {CPUManager} from "./CPUManager";
import {PassivePolicy} from "../policy/PassivePolicy";

const PHASE_UPDATE_INTERVAL = 10;
const PHASE_UPDATE_INTERVAL_LOW = 20;

export class RoomPhaseManager {

    /** Update one owned room's phase profile per call (staggered by room index) */
    static updateStaggered(ownedRooms: string[]): void {
        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            const interval = Game.cpu.bucket < 3000 ? PHASE_UPDATE_INTERVAL_LOW : PHASE_UPDATE_INTERVAL;
            if (!CPUManager.shouldRunEvery(`phase_${roomName}`, interval, i)) continue;

            const room = Game.rooms[roomName];
            if (!room?.controller?.my) continue;
            if (room.memory.state === eRoomState.phase8) continue; // final phase, skip forever

            this.updateRoom(room);
        }
    }

    static updateRoom(room: Room): void {
        const phase = room.memory.state;
        const profile = this.buildProfile(room, phase);
        room.memory.phaseProfile = profile;

        const next = this.getNextPhase(room, phase, profile);
        if (next !== null && next !== phase) {
            console.log(`[Phase] ${room.name}: ${phase} -> ${next}`);
            room.memory.state = next;
            room.memory.phaseTransitionTick = Game.time;
            room.memory.energySources = [];
            room.memory.storage = undefined;
            room.memory.targetLinkIds = undefined;
        }
    }

    static getProfile(roomName: string): RoomPhaseProfile | undefined {
        return Memory.rooms[roomName]?.phaseProfile;
    }

    private static buildProfile(room: Room, phase: eRoomState): RoomPhaseProfile {
        const storage = room.storage;
        const storageEnergy = storage?.store.energy ?? 0;
        const hasStorage = storage !== undefined;
        const hasLinks = (room.memory.targetLinkIds?.length ?? 0) > 0;
        const passiveSafe = PassivePolicy.isExpansionTargetSafe(room.name);

        const fastGrowthActive = hasStorage && storageEnergy > 20000;

        const cpuTier: 'critical' | 'normal' | 'low' = Game.cpu.bucket < 2000 ? 'critical'
            : Game.cpu.bucket < 5000 ? 'normal'
            : 'low';

        return {
            phase,
            canUseStaticMining: phase >= eRoomState.phase2,
            canUseStorageLogistics: phase >= eRoomState.phase4 && hasStorage,
            canUseLinks: phase >= eRoomState.phase5 && hasLinks,
            canUseRemoteMining: phase >= eRoomState.phase5 && passiveSafe && storageEnergy > 50000,
            canUseIndustry: phase >= eRoomState.phase6,
            canUseEndgame: phase >= eRoomState.phase8,
            cpuTier,
            fastGrowthActive,
            passiveSafe,
        };
    }

    /** Returns the next phase if exit criteria are met, or null if staying */
    private static getNextPhase(room: Room, phase: eRoomState, profile: RoomPhaseProfile): eRoomState | null {
        const rcl = room.controller?.level ?? 0;
        const storage = room.storage;
        const storageEnergy = storage?.store.energy ?? 0;

        switch (phase) {
            case eRoomState.phase1: {
                if (rcl >= 2) {
                    const containers = room.find(FIND_STRUCTURES, {
                        filter: s => s.structureType === STRUCTURE_CONTAINER
                    });
                    if (containers.length >= 1) return eRoomState.phase2;
                }
                break;
            }
            case eRoomState.phase2: {
                const sources = room.find(FIND_SOURCES);
                const containers = room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                });
                const towers = room.find(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_TOWER
                });
                if (containers.length >= sources.length && towers.length >= 1) {
                    return eRoomState.phase3;
                }
                break;
            }
            case eRoomState.phase3: {
                if (storage && storageEnergy >= 0) {
                    // storage placed and actively filling
                    if (rcl >= 4) return eRoomState.phase4;
                }
                break;
            }
            case eRoomState.phase4: {
                if (storageEnergy >= 50000) {
                    const spawns = room.find(FIND_MY_SPAWNS);
                    const spawnUtil = spawns.some(s => s.spawning !== null) ? 1 : 0;
                    const noThreat = !room.memory.needDefence;
                    if (noThreat && spawnUtil < 0.7) return eRoomState.phase5;
                }
                break;
            }
            case eRoomState.phase5: {
                const terminal = room.terminal;
                const extractor = room.find(FIND_MY_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_EXTRACTOR
                });
                if (terminal && extractor.length > 0 && storageEnergy >= 100000) {
                    return eRoomState.phase6;
                }
                break;
            }
            case eRoomState.phase6: {
                if (rcl >= 7) return eRoomState.phase7;
                break;
            }
            case eRoomState.phase7: {
                if (rcl >= 8) return eRoomState.phase8;
                break;
            }
        }
        return null;
    }
}
