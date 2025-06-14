import _ from "lodash";
import {SpawnController} from "../../controller/SpawnController";

export abstract class Ant<TMemory extends CreepMemory> {
    protected creep: Creep;

    constructor(creep: Creep) {
        this.creep = creep;
    }

    protected get memory(): TMemory {
        return this.creep.memory as TMemory;
    }

    protected set memory(value: TMemory) {
        this.creep.memory = value
    }

    abstract doJob(): void;

    checkHarvest(): void {

        if (this.memory.state !== eJobState.harvest && this.creep.store.getUsedCapacity() === 0) {
            this.memory.state = eJobState.harvest;
        }

        if (this.memory.state === eJobState.harvest && this.creep.store.getFreeCapacity() === 0) {
            this.memory.state = eJobState.work;
        }
    }

    spawn(workroom: Room): boolean {

        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();

        const existingCreeps = _.filter(Game.creeps, c =>
            c.memory.job == job &&
            c.memory.workroom == workroom.name
        );

        const countOfAnts = _.filter(existingCreeps, (c) =>
            ((c.ticksToLive != undefined && c.ticksToLive > c.memory.minTicksToLive) || c.spawning)
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

    public abstract createSpawnMemory(spawn: StructureSpawn, workroom: string): TMemory;

    public abstract getJob(): eJobType;

    protected abstract getMaxCreeps(workroom: Room): number;

    protected abstract shouldSpawn(workroom: Room): boolean;


}