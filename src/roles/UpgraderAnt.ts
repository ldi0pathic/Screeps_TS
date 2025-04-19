import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class UpgraderAnt extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);

        if (creep.memory.state == eJobState.harvest) {
            let sourceId = creep.memory.energySourceId;

            if (!sourceId) {
                let source = creep.room.find(FIND_SOURCES);
                sourceId = source[0].id;
                creep.memory.energySourceId = sourceId
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                }
            } else {
                creep.memory.energySourceId = undefined
            }
        } else {

            creep.memory.energySourceId = undefined

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

    protected shouldSpawn(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): boolean {
        return true;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }
}