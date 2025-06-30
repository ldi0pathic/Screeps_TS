import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class WorkerAnt extends HarvesterAnt<HarvesterCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target && this.creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
        
        return true
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): HarvesterCreepMemory {
        return super.createSpawnMemory(spawn, workroom);

    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.worker;
    }

    public override getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {
        return workroom.memory.state <= eRoomState.phase1;

    }

}