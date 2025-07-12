import {SpawnManager} from "../../manager/SpawnManager";
import {Movement} from "../../utils/Movement";
import {CreepStorage} from "../../storage/CreepStorage";

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

    abstract doJob(): boolean;

    checkHarvest(): void {

        if (this.memory.state !== eJobState.harvest && this.creep.store.getUsedCapacity() === 0) {
            this.memory.state = eJobState.harvest;
        }

        if (this.memory.state === eJobState.harvest && this.creep.store.getFreeCapacity() === 0) {
            this.memory.state = eJobState.work;
        }
    }

    spawn(spawnRoom: Room, workroom: string): boolean {

        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();

        const creepStorage = CreepStorage.getInstance();
        const countOfAnts = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        if (countOfAnts >= max) {
            return false;
        }

        if (!this.shouldSpawn(workroom)) {
            return false;
        }

        const dynamicPriority = SpawnManager.getSpawnPriority(job, workroom);
        SpawnManager.addToJobQueue(job, spawnRoom, workroom, this.getProfil(spawnRoom), dynamicPriority);

        return false;
    }

    public abstract getProfil(workroom: Room): BodyPartConstant[];

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): CreepMemory {
        const job = this.getJob();
        return {
            job: job,
            state: eJobState.harvest,
            spawn: spawn.name,
            workRoom: workroom,
            spawnRoom: spawn.room.name,
            roundRobin: 1,
            roundRobinOffset: 0,
            moving: false,
        } as CreepMemory;
    }

    public abstract getJob(): eJobType;

    public abstract getMaxCreeps(workroom: string): number;

    protected abstract shouldSpawn(workroom: string): boolean;

    protected moveTo(target: RoomPosition | _HasRoomPosition, opts?: MoveToOpts): ScreepsReturnCode {
        return Movement.moveTo(this.creep, target, opts);
    }


}