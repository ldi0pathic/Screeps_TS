export const INTEL_TTL_ACTIVE_PLAYER = 200;
export const INTEL_TTL_EMPTY_ROOM = 500;
export const INTEL_TTL_HOSTILE_ROOM = 1000;
export const DANGER_COOLDOWN_TICKS = 500;
export const REMOTE_DANGER_COOLDOWN = 500;

export class PassivePolicy {

    static isRoomSafeToMine(roomName: string): boolean {
        const intel = Memory.intel?.[roomName];
        if (!intel) return false;

        if (intel.owner !== null) return false;
        if (intel.reservation !== null) return false;
        if (intel.status === 'highway' || intel.status === 'sk') return false;
        if (intel.invaderCore && intel.coreExpires > Game.time) return false;
        if (intel.threat === 'player' && intel.threatExpires > Game.time) return false;
        if (Game.time - intel.lastPlayerActivity < DANGER_COOLDOWN_TICKS) return false;

        return true;
    }

    static shouldFleeRemote(roomName: string): boolean {
        const intel = Memory.intel?.[roomName];
        const remote = Memory.remoteIntel?.[roomName];

        if (remote?.state === 'danger') return true;
        if (intel?.threat === 'player' && intel.threatExpires > Game.time) return true;

        return false;
    }

    static markRemoteDanger(roomName: string): void {
        if (!Memory.remoteIntel) Memory.remoteIntel = {};
        const entry = Memory.remoteIntel[roomName];
        if (entry) {
            entry.state = 'danger';
            entry.dangerCooldownUntil = Game.time + REMOTE_DANGER_COOLDOWN;
        }
    }

    static isExpansionTargetSafe(roomName: string): boolean {
        const intel = Memory.intel?.[roomName];
        if (!intel) return false;

        if (intel.owner !== null) return false;
        if (intel.reservation !== null) return false;
        if (intel.status === 'highway' || intel.status === 'sk') return false;
        if (intel.status === 'closed') return false;
        if (intel.threat === 'player' && intel.threatExpires > Game.time) return false;

        const exits = Game.map.describeExits(roomName);
        for (const dir in exits) {
            const neighbor = exits[dir as ExitKey];
            if (!neighbor) continue;
            const neighborIntel = Memory.intel?.[neighbor];
            if (neighborIntel?.owner !== null && neighborIntel?.owner !== undefined) return false;
        }

        return true;
    }

    static logViolation(message: string): void {
        if (!Memory.debug) Memory.debug = {};
        if (!Memory.debug.policyViolations) Memory.debug.policyViolations = [];
        const entry = `[${Game.time}] ${message}`;
        Memory.debug.policyViolations.push(entry);
        if (Memory.debug.policyViolations.length > 50) {
            Memory.debug.policyViolations.shift();
        }
    }

    static handlePlayerPresenceInRemote(roomName: string, creeps: Creep[]): void {
        this.markRemoteDanger(roomName);
        for (const creep of creeps) {
            if (creep.store.getUsedCapacity() > 0) {
                const homeRoom = creep.memory.spawnRoom;
                creep.memory.targetPos = undefined;
                creep.memory.path = undefined;
                creep.memory.workRoom = homeRoom;
            }
        }
    }
}
