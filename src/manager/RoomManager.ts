import {roomConfig} from "../config";
import {LinkManager} from "./LinkManager";

export class RoomManager {

    static run() {
        const time = Game.time;
        const skip = time % 10 !== 0;

        for (let name in roomConfig) {
            if (Memory.rooms[name].state >= eRoomState.phase5 && Memory.rooms[name].state <= eRoomState.phase8) {
                console.log("run " + name);
                new LinkManager(name).run();
            }
            if (!skip) {
                this.checkRoom(name, time);
            }
        }

    }

    static checkRoom(name: string, time: number) {
        if ((time + 10) > (Memory.rooms[name].invaderCoreEndTick || 0)) {
            Memory.rooms[name].invaderCore = false;
        }
        if ((time + 10) > (Memory.rooms[name].needDefenceEndTick || 0)) {
            Memory.rooms[name].needDefence = false;
        }

        const room = Game.rooms[name];

        if (!room)
            return;

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