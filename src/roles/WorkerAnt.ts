import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class WorkerAnt extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);

        if (creep.memory.state == eJobState.harvest) {
            let sourceId = creep.memory.energySourceId;

            if (!sourceId) {
                let source = creep.room.find(FIND_SOURCES);
                if (source.length > 0) {
                    sourceId = source[0].id;
                    creep.memory.energySourceId = sourceId
                } else {
                    return;
                }
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
            if (spawn) {
                if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn);
                }
            } else {
                const nearestSpawn = creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                if (nearestSpawn && creep.transfer(nearestSpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestSpawn);
                }
            }

        }
    }

    public getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.worker;
    }

    protected onSpawnAction(workroom: Room): void {

    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state <= eRoomState.phase1;

    }

}