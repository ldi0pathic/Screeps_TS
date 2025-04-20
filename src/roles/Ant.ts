import _ from "lodash";


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

    spawn(spawn: StructureSpawn, workroom: Room): boolean {

        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();
        const minLiveTicks = this.getMinLiveTicks(spawn, workroom);

        const existingCreeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        const countOfAnts = _.filter(existingCreeps, (creep) =>
            ((creep.ticksToLive != undefined && creep.ticksToLive > minLiveTicks) || creep.spawning)
        ).length;

        if (countOfAnts >= max) {
            return false;
        }

        if (!this.shouldSpawn(spawn, workroom, existingCreeps)) {
            return false;
        }

        const profil = this.getProfil();
        const name = this.getName(workroom);
        const options = this.getSpawnOptions(spawn, workroom, existingCreeps);

        switch (spawn.spawnCreep(profil, name, {dryRun: true})) {
            case OK: {
                if (spawn.spawnCreep(profil, name, options) === OK) {
                    this.onSpawnAction(workroom);
                    return true;
                }
            }
                break;
        }


        return false;
    }

    protected abstract onSpawnAction(workroom: Room): void;

    protected abstract getMaxCreeps(workroom: Room): number;

    protected abstract getJob(): eJobType;

    protected abstract shouldSpawn(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): boolean;

    protected abstract getProfil(): BodyPartConstant[];

    protected getSpawnOptions(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): SpawnOptions {
        const job = this.getJob();

        return {
            memory: {
                job: job,
                spawn: spawn.name,
                state: eJobState.harvest,
                workroom: workroom.name,
                energySourceId: undefined,
                onPosition: undefined,
                finalLocation: undefined,
                containerId: undefined,
                linkId: undefined,
                buildId: undefined,
                roundRobin: undefined,
            }
        }
    }

    protected getMinLiveTicks(spawn: StructureSpawn, workroom: Room): number {
        return 150;
    }

    protected getName(workroom: Room) {
        const job = this.getJob();
        let count = 0;
        let name = `${job}@${workroom.name}#${count}`;

        while (Game.creeps[name]) {
            count++;
            name = `${job}@${workroom.name}#${count}`;
        }

        return name;
    }


}