import {roomConfig} from "../config";
import {LinkManager} from "./LinkManager";
import {TowerManager} from "./TowerManager";
import {DefenseManager} from "./DefenseManager";

export class RoomManager {

    static run() {
        const time = Game.time;
        const skip = time % 10 !== 0;

        for (let name in roomConfig) {
            const room = Game.rooms[name];
            if (room && room.controller?.my) {
                if (Memory.rooms[name] && Memory.rooms[name].state >= eRoomState.phase5 && Memory.rooms[name].state <= eRoomState.phase8) {
                    new LinkManager(name).run();
                }
            }
            this.checkRoom(name, time);
        }

    }

    static checkRoom(name: string, time: number) {
        if (!Memory.rooms[name]) {
            Memory.rooms[name] = {
                energySources: [],
                mineralSources: [],
                storage: undefined,
                state: eRoomState.neutral,
                invaderCore: false,
                needDefence: false,
                towers: [],
                repairTarget: undefined,
            };
        }

        if ((time + 10) > (Memory.rooms[name].invaderCoreEndTick || 0)) {
            Memory.rooms[name].invaderCore = false;
        }
        if ((time + 10) > (Memory.rooms[name].needDefenceEndTick || 0)) {
            Memory.rooms[name].needDefence = false;
        }

        const room = Game.rooms[name];

        if (!room)
            return;

        // Threat data is maintained by DefenseManager.runCritical; just refresh towers here
        const info = DefenseManager.getHostileInfo(room);
    }
}