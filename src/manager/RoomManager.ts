import {roomConfig} from "../config";

export class RoomManager {

    static checkRooms() {
        if (Game.time % 10 !== 0) return;
        for (let name in roomConfig) {
            if ((Game.time + 10) > (Memory.rooms[name].invaderCoreEndTick || 0)) {
                Memory.rooms[name].invaderCore = false;
            }

            const room = Game.rooms[name];

            if (!room)
                continue;

            let hostiles = room.find(FIND_HOSTILE_CREEPS);
            let cores = room.find(FIND_HOSTILE_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_INVADER_CORE});

            Memory.rooms[name].needDefence = hostiles.length > 0;
            Memory.rooms[name].invaderCore = cores.length > 0;
            if (cores.length > 0) {

                let timeRemaining = 0;
                for (let core of cores) {
                    for (const effect of core.effects) {
                        let remainingTicks = effect.ticksRemaining;
                        if (remainingTicks > timeRemaining) {
                            timeRemaining = remainingTicks;
                        }
                    }
                }
                Memory.rooms[name].invaderCoreEndTick = Game.time + timeRemaining;
            }
        }
    }
}