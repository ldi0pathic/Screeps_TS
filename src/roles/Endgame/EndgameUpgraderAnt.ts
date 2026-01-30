import {roomConfig} from "../../config";
import {CreepStorage} from "../../storage/CreepStorage";
import {LinkStorage} from "../../storage/LinkStorage";
import {StationaryAnt} from "../base/StationaryAnt";


export class EndgameUpgraderAnt extends StationaryAnt<EndgameUpgraderCreepMemory> {

    doJob(): boolean {

//todo
        return true;
    }


    public createSpawnMemory(spawn: StructureSpawn, workroom: string): EndgameUpgraderCreepMemory {

        return {} as EndgameUpgraderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [WORK, CARRY, MOVE];
    }

    public override getJob(): eJobType {
        return eJobType.upgrader
    }

    public override getMaxCreeps(workroom: string): number {
        return 1;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const room = Memory.rooms[workroom];

        if (room.state < eRoomState.phase5) {
            return false;
        }

        const linkStorage = LinkStorage.getInstance();
        const links = linkStorage.getLinksByType(workroom, "upgrader");

        if (links.length == 0) {
            return false;
        }

        const gameRoom = Game.rooms[workroom];

        //um energie zu sparen :)
        if (room.state == eRoomState.phase8 &&
            gameRoom?.controller && gameRoom?.controller?.ticksToDowngrade > 100000 &&
            gameRoom.storage && gameRoom.storage?.store.getUsedCapacity(RESOURCE_ENERGY) < 250000) {
            return false;
        }

        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        return this.getMaxCreeps(workroom) > countOfCreeps;
    }
}