import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class WorkerAnt extends HarvesterAnt<HarvesterCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES);
        if (todos.length > 0) {
            this.creep.say('🪚');
            if (this.creep.build(todos[0]) === ERR_NOT_IN_RANGE) {
                this.moveTo(todos[0]);
            }
            return true;
        }

        const nearestSpawn = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS);
        if (nearestSpawn && this.creep.transfer(nearestSpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(nearestSpawn);
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

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {
        return workroom.memory.state <= eRoomState.phase1;

    }

}