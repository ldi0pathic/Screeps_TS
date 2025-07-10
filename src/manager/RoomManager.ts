import {roomConfig} from "../config";

export class RoomManager {

    static checkRooms() {
        const time = Game.time;
        if (time % 10 !== 0) return;
        for (let name in roomConfig) {

            if ((time + 10) > (Memory.rooms[name].invaderCoreEndTick || 0)) {
                Memory.rooms[name].invaderCore = false;
            }
            if ((time + 10) > (Memory.rooms[name].needDefenceEndTick || 0)) {
                Memory.rooms[name].needDefence = false;
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
                Memory.rooms[name].invaderCoreEndTick = time + timeRemaining;
            }

            if (hostiles.length > 0) {
                let timeRemaining = 0;
                for (let hostile of hostiles) {
                    let remainingTicks = hostile.ticksToLive || 0;
                    if (remainingTicks > timeRemaining) {
                        timeRemaining = remainingTicks;
                    }
                }
                Memory.rooms[name].needDefenceEndTick = time + timeRemaining;
            }
        }
    }
}