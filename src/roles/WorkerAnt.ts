import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class WorkerAnt extends HarvesterAnt<HarvesterCreepMemory> {

    doJob(): void {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            this.doHarvest(RESOURCE_ENERGY);
        } else {
            const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES);
            if (todos.length > 0) {
                this.creep.say('🪚');
                if (this.creep.build(todos[0]) === ERR_NOT_IN_RANGE) {
                    this.moveTo(todos[0]);
                }
                return;
            }

            const nearestSpawn = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS);
            if (nearestSpawn && this.creep.transfer(nearestSpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                this.moveTo(nearestSpawn);
            }
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): HarvesterCreepMemory {
        return super.createSpawnMemory(spawn, workroom);

    }

    public getProfil(): BodyPartConstant[] {
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