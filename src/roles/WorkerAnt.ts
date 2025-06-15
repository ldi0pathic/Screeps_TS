import {Ant} from "./base/Ant";
import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";

export class WorkerAnt extends Ant<WorkerMemory> {

    doJob(): void {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            let sourceId = this.memory.energySourceId;

            if (!sourceId) {
                let source = this.creep.room.find(FIND_SOURCES);
                if (source.length > 0) {
                    sourceId = source[0].id;
                    this.memory.energySourceId = sourceId
                } else {
                    return;
                }
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    this.moveTo(source);
                }
            } else {
                this.memory.energySourceId = undefined
            }

        } else {

            this.memory.energySourceId = undefined

            let spawn = Game.spawns[this.memory.spawn];
            if (spawn) {
                if (this.creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    this.moveTo(spawn);
                }
            } else {
                const nearestSpawn = this.creep.pos.findClosestByRange(FIND_MY_SPAWNS);
                if (nearestSpawn && this.creep.transfer(nearestSpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    this.moveTo(nearestSpawn);
                }
            }

        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): WorkerMemory {
        return {
            job: this.getJob(),
            spawn: spawn.name,
            minTicksToLive: 100,
            state: eJobState.harvest,
            workroom: workroom,
            energySourceId: undefined,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        }
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