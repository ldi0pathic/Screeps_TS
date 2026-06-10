import {CPUManager} from "./CPUManager";
import {PassivePolicy} from "../policy/PassivePolicy";

const NUKE_SCAN_INTERVAL = 50;
const NUKE_ACTIVE_INTERVAL = 10;

interface ThreatInfo {
    threat: ThreatLevel;
    hostiles: Creep[];
    expires: number;
}

export class DefenseManager {

    private static hostilesCache: Map<string, { info: ThreatInfo; tick: number }> = new Map();
    private static readonly CACHE_TTL = 3;

    /** Single hostile scan for all owned rooms — critical tier, always runs */
    static runCritical(ownedRooms: string[]): void {
        for (const roomName of ownedRooms) {
            const room = Game.rooms[roomName];
            if (!room?.controller?.my) continue;
            const info = this.getHostileInfo(room);
            this.publishThreat(room, info);
        }
    }

    static getHostileInfo(room: Room): ThreatInfo {
        const cached = this.hostilesCache.get(room.name);
        if (cached && Game.time - cached.tick < this.CACHE_TTL) return cached.info;

        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        let threat: ThreatLevel = 'none';
        let expires = 0;

        if (hostiles.length > 0) {
            const isPlayer = hostiles.some(h => h.owner.username !== 'Invader');
            threat = isPlayer ? 'player' : 'npc';
            expires = Game.time + Math.max(...hostiles.map(h => h.ticksToLive ?? 0));
        }

        const info: ThreatInfo = { threat, hostiles, expires };
        this.hostilesCache.set(room.name, { info, tick: Game.time });
        return info;
    }

    private static publishThreat(room: Room, info: ThreatInfo): void {
        room.memory.needDefence = info.hostiles.length > 0;
        room.memory.threat = info.threat;
        if (info.threat !== 'none') {
            room.memory.threatExpires = info.expires;
            room.memory.needDefenceEndTick = info.expires;
        } else if ((room.memory.threatExpires ?? 0) <= Game.time) {
            room.memory.threat = 'none';
            room.memory.needDefence = false;
        }

        // Check invader cores
        if (CPUManager.shouldRunEvery(`core_${room.name}`, 20, 0)) {
            const cores = room.find(FIND_HOSTILE_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_INVADER_CORE
            });
            room.memory.invaderCore = cores.length > 0;
            if (cores.length > 0) {
                const maxTicks = Math.max(...cores.map(c => {
                    const eff = (c as StructureInvaderCore).effects ?? [];
                    return eff.length > 0 ? Math.max(...eff.map(e => e.ticksRemaining)) : 0;
                }));
                room.memory.invaderCoreEndTick = Game.time + maxTicks;
            } else {
                room.memory.invaderCore = false;
            }
        } else if ((room.memory.invaderCoreEndTick ?? 0) <= Game.time) {
            room.memory.invaderCore = false;
        }
    }

    /** Choose best tower target by killability scoring */
    static chooseTowerTarget(room: Room, hostiles: Creep[]): Creep | null {
        if (hostiles.length === 0) return null;

        // Score each hostile: prefer easily killable, deprioritize well-healed
        let bestScore = -Infinity;
        let bestTarget: Creep | null = null;

        for (const hostile of hostiles) {
            let score = 0;
            const body = hostile.body;
            const healParts = body.filter(p => p.type === HEAL && p.hits > 0).length;
            const toughParts = body.filter(p => p.type === TOUGH && p.hits > 0).length;

            // Dismantlers near structures are high priority
            const dismantleParts = body.filter(p => p.type === WORK && p.hits > 0).length;
            if (dismantleParts > 0) score += 30;

            // Healers first — stop regeneration chain
            if (healParts > 0 && hostiles.length > 1) score += 20;

            // High heal = hard to kill, deprioritize
            score -= healParts * 5;
            score -= toughParts * 2;

            // Prefer closer targets to controller
            const range = room.controller!.pos.getRangeTo(hostile);
            score -= range;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = hostile;
            }
        }

        return bestTarget;
    }

    /** Scan nukes in owned rooms (staggered) */
    static scanNukesStaggered(ownedRooms: string[]): void {
        for (let i = 0; i < ownedRooms.length; i++) {
            const roomName = ownedRooms[i];
            const hasActivePlan = Memory.rooms[roomName]?.nukePlan?.active;
            const interval = hasActivePlan ? NUKE_ACTIVE_INTERVAL : NUKE_SCAN_INTERVAL;
            if (!CPUManager.shouldRunEvery(`nuke_${roomName}`, interval, i)) continue;

            const room = Game.rooms[roomName];
            if (!room?.controller?.my) continue;

            const nukes = room.find(FIND_NUKES);
            if (nukes.length > 0) {
                for (const nuke of nukes) {
                    const key = `${roomName}_${nuke.pos.x}_${nuke.pos.y}`;
                    if (!Memory.debug) Memory.debug = {};
                    if (!Memory.debug.policyViolations) Memory.debug.policyViolations = [];
                    const alreadyNotified = Memory.debug.policyViolations.some(v => v.includes(key));
                    if (!alreadyNotified) {
                        Game.notify(`[Nuke] Incoming nuke at ${roomName} (${nuke.pos.x},${nuke.pos.y}) lands at tick ~${nuke.timeToLand + Game.time}`, 60);
                        PassivePolicy.logViolation(`NUKE: ${key} lands ~${nuke.timeToLand + Game.time}`);
                    }

                    if (!room.memory.nukePlan?.active) {
                        room.memory.nukePlan = {
                            active: true,
                            detectedAt: Game.time,
                            landAt: Game.time + nuke.timeToLand,
                            nukes: nukes.map(n => ({ x: n.pos.x, y: n.pos.y, roomName, landAt: Game.time + n.timeToLand })),
                            phase: 'scan',
                            affectedStructureIds: [],
                            safePlan: [],
                            resourceEvacuationDone: false,
                        };
                    }
                }
            } else if (room.memory.nukePlan?.active && room.memory.nukePlan.landAt <= Game.time) {
                room.memory.nukePlan.active = false;
                room.memory.nukePlan.phase = 'recover';
            }
        }
    }

    /** Get cached hostiles for a room (used by TowerManager) */
    static getHostiles(room: Room): Creep[] {
        return this.getHostileInfo(room).hostiles;
    }
}
