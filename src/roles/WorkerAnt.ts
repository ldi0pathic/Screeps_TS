import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class WorkerAnt extends Ant {
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

            let spawn = Game.spawns[creep.memory.spawn];
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }

    public getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    protected onSpawnAction(workroom: Room): void {

    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount;
    }

    protected getJob(): eJobType {
        return eJobType.worker;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state <= eRoomState.phase1;

    }

}