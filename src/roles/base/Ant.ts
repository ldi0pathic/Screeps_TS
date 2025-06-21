import _ from "lodash";
import {SpawnManager} from "../../manager/SpawnManager";
import {Movement} from "../../utils/Movement";

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

        const dynamicPriority = SpawnManager.getSpawnPriority(job, workroom);
        SpawnManager.addToJobQueue(job, workroom, this.getProfil(), dynamicPriority);

        return false;
    }

    public abstract getProfil(): BodyPartConstant[];

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): CreepMemory {
        const job = this.getJob();
        return {
            job: job,
            state: eJobState.harvest,
            spawn: spawn.name,
            workroom: workroom,
            minTicksToLive: 100,
            roundRobin: 1,
            moving: false,
        } as CreepMemory;
    }

    public abstract getJob(): eJobType;

    protected abstract getMaxCreeps(workroom: Room): number;

    protected abstract shouldSpawn(workroom: Room): boolean;

    protected moveTo(target: RoomPosition | _HasRoomPosition, opts?: MoveToOpts): ScreepsReturnCode {
        return Movement.moveTo(this.creep, target, opts);
    }


}