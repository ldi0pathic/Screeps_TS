import _ from "lodash";
import {SpawnController} from "../controller/SpawnController";

export abstract class Ant {

    abstract doJob(creep: Creep): void;

    checkHarvest(creep: Creep): void {

        if (creep.memory.state !== eJobState.harvest && creep.store.getUsedCapacity() === 0) {
            creep.memory.state = eJobState.harvest;
        }

        if (creep.memory.state === eJobState.harvest && creep.store.getFreeCapacity() === 0) {
            creep.memory.state = eJobState.work;
        }
    }

    spawn(workroom: Room): boolean {

        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();

        const existingCreeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        const countOfAnts = _.filter(existingCreeps, (creep) =>
            ((creep.ticksToLive != undefined && creep.ticksToLive > creep.memory.minTicksToLive) || creep.spawning)
        ).length;

        if (countOfAnts >= max) {
            return false;
        }

        if (!this.shouldSpawn(workroom)) {
            return false;
        }

        const dynamicPriority = SpawnController.getSpawnPriority(this, workroom);
        SpawnController.addToJobQueue(job, workroom, dynamicPriority);

        return false;
    }

    public abstract getProfil(): BodyPartConstant[];

    public getSpawnMemory(spawn: StructureSpawn, workroom: string): CreepMemory {
        const job = this.getJob();

        return {
            job: job,
            minTicksToLive: 100,
            ticktToPos: 1,
            spawn: spawn.name,
            state: eJobState.harvest,
            workroom: workroom,
            energySourceId: undefined,
            onPosition: undefined,
            finalLocation: undefined,
            containerId: undefined,
            linkId: undefined,
            buildId: undefined,
            roundRobin: undefined,
        }
    }

    public abstract getJob(): eJobType;

    protected abstract getMaxCreeps(workroom: Room): number;

    protected abstract shouldSpawn(workroom: Room): boolean;


}