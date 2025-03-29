import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class Upgrader extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);
        
        if (creep.memory.state == eJobState.harvest) {
            let source = creep.room.find(FIND_SOURCES);
            if (creep.harvest(source[0]) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source[0]);
            }
        } else {
            const controller = creep.room.controller
            if (controller) {

                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
            }
        }
    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].upgraderCount;
    }

    protected getJob(): eJobType {
        return eJobType.upgrader
    }

    protected shouldSpawn(spawn: StructureSpawn): boolean {
        return true;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }
}