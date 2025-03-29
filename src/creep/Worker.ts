import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class Worker extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);

        if (creep.memory.state == eJobState.harvest) {
            let source = creep.room.find(FIND_SOURCES);
            if (creep.harvest(source[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source[0]);
            }
        } else {
            let spawn = Game.spawns[creep.memory.spawn];
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount;
    }

    protected getJob(): eJobType {
        return eJobType.worker;
    }

    protected shouldSpawn(spawn: StructureSpawn): boolean {
        return true;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

}