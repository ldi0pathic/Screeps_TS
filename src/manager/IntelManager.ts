import {CPUManager} from "./CPUManager";

const OWNED_SCAN_INTERVAL = 20;
const REMOTE_SCAN_INTERVAL = 30;

export class IntelManager {

    /** Scan staggered: one owned room per tick (index-offset), one remote room per tick */
    static scanStaggered(ownedRooms: string[]): void {
        if (Game.cpu.bucket < 3000) return;

        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`intel_owned_${ownedRooms[i]}`, OWNED_SCAN_INTERVAL, i)) continue;
            const room = Game.rooms[ownedRooms[i]];
            if (room) this.scanRoom(room, true);
        }

        if (!Memory.remoteIntel) return;
        const remoteRooms = Object.keys(Memory.remoteIntel);
        for (let i = 0; i < remoteRooms.length; i++) {
            const roomName = remoteRooms[i];
            if (!CPUManager.shouldRunEvery(`intel_remote_${roomName}`, REMOTE_SCAN_INTERVAL, i + ownedRooms.length)) continue;
            const room = Game.rooms[roomName];
            if (room) this.scanRoom(room, false);
        }
    }

    static scanRoom(room: Room, isOwned: boolean): void {
        if (!Memory.intel) Memory.intel = {};

        const ctrl = room.controller;
        const sources = room.find(FIND_SOURCES);
        const links = room.find(FIND_STRUCTURES, { filter: s => s.structureType === STRUCTURE_LINK }) as StructureLink[];
        const cores = room.find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE });
        const hostiles = room.find(FIND_HOSTILE_CREEPS);

        let threat: ThreatLevel = 'none';
        let threatExpires = 0;
        let lastPlayerActivity = Memory.intel[room.name]?.lastPlayerActivity ?? 0;

        if (hostiles.length > 0) {
            const hasPlayer = hostiles.some(h => h.owner.username !== 'Invader');
            threat = hasPlayer ? 'player' : 'npc';
            threatExpires = Game.time + Math.max(...hostiles.map(h => h.ticksToLive ?? 0));
            if (hasPlayer) lastPlayerActivity = Game.time;
        }

        let status: RoomIntelStatus = 'normal';
        const roomStatus = Game.map.getRoomStatus(room.name);
        if (roomStatus.status === 'closed') status = 'closed';
        else if (roomStatus.status === 'novice') status = 'novice';
        else if (roomStatus.status === 'respawn') status = 'respawn';

        const nearest = this.findNearestOwnedDistance(room.name);

        const coreExpires = cores.length > 0
            ? Math.max(...cores.map(c => {
                  const eff = c.effects ?? [];
                  const ticks = eff.length > 0 ? Math.max(...eff.map(e => e.ticksRemaining)) : 0;
                  return Game.time + ticks;
              }))
            : 0;

        Memory.intel[room.name] = {
            scannedAt: Game.time,
            owner: ctrl?.owner?.username ?? null,
            reservation: ctrl?.reservation?.username ?? null,
            sourceIds: sources.map(s => s.id),
            sourceCount: sources.length,
            sourceSlots: sources.map(s => this.countFreeSlots(s)),
            controllerPos: ctrl ? { x: ctrl.pos.x, y: ctrl.pos.y } : undefined,
            storageId: room.storage?.id ?? null,
            linkIds: links.map(l => l.id),
            invaderCore: cores.length > 0,
            coreExpires,
            threat,
            threatExpires,
            status,
            routeDistance: nearest,
            lastPlayerActivity,
        };
    }

    private static countFreeSlots(source: Source): number {
        const terrain = source.room.getTerrain();
        let free = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (terrain.get(source.pos.x + dx, source.pos.y + dy) !== TERRAIN_MASK_WALL) {
                    free++;
                }
            }
        }
        return free;
    }

    private static findNearestOwnedDistance(roomName: string): number {
        let min = 999;
        for (const name in Game.rooms) {
            const r = Game.rooms[name];
            if (!r.controller?.my) continue;
            const route = Game.map.findRoute(roomName, name);
            if (route !== ERR_NO_PATH) min = Math.min(min, route.length);
        }
        return min;
    }

    static getIntel(roomName: string): RoomIntel | undefined {
        return Memory.intel?.[roomName];
    }
}
