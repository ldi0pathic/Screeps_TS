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
        const minLiveTicks = this.getMinLiveTicks();

        const existingCreeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        const antsInWorkroom = _.filter(existingCreeps, (creep) =>
            ((creep.ticksToLive != undefined && creep.ticksToLive > minLiveTicks) || creep.spawning)
        ).length;

        if (antsInWorkroom >= max) {
            return false;
        }

        if (!this.shouldSpawn(spawn)) {
            return false;
        }

        const profil = this.getProfil();
        let count = 0;
        let name = `${job}@${workroom.name}#${count}`;

        while (Game.creeps[name]) {
            count++;
            name = `${job}@${workroom.name}#${count}`;
        }

        switch (spawn.spawnCreep(profil, name, {dryRun: true})) {
            case OK: {
                spawn.spawnCreep(profil, name, {
                    memory: {
                        job: job,
                        spawn: spawn.name,
                        state: eJobState.harvest,
                        workroom: workroom.name,
                    }
                });

            }
                break;
        }


        return false;
    }

    protected abstract getMaxCreeps(workroom: Room): number;

    protected abstract getJob(): eJobType;

    protected abstract shouldSpawn(spawn: StructureSpawn): boolean;

    protected abstract getProfil(): BodyPartConstant[];

    protected getMinLiveTicks(): number {
        return 150;
    }
}