import {Ant} from "../roles/Ant";
import {CleanUpManager} from "./CleanUpManager";
import {Jobs} from "../records/Jobs";


export class JobsController {
    private static bucketNorm: Array<{ creep: Creep; ant: Ant<any> }> = [];
    private static bucketLow: Array<{ creep: Creep; ant: Ant<any> }> = [];

    static getDynamicPriority(jobType: eJobType, room: Room): number {
        const baseConfig = Jobs.jobs[jobType];
        if (!baseConfig) return 11;

        switch (jobType) {
            case eJobType.miner:
                // Hohe Priorität bei wenig Energie
                return room.energyAvailable < room.energyCapacityAvailable * 0.3 ? 25 : 15;

            case eJobType.upgrader:
                // Kritisch wenn Controller bald downgraded
                const controller = room.controller;
                if (controller && controller.ticksToDowngrade < 5000) {
                    return 30; // Höchste Priorität!
                }
                return controller?.level === 8 ? 5 : 11; // Niedrig bei RCL8

            case eJobType.builder:
                const sites = room.find(FIND_CONSTRUCTION_SITES);
                return sites.length > 5 ? 20 : (sites.length > 0 ? 9 : 3);

            case eJobType.transporter:
                // Hoch wenn Container voll sind
                const containers = room.find(FIND_STRUCTURES, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                }) as StructureContainer[];

                if (containers.length === 0) return 11;

                const avgFillRatio = containers.reduce((sum, c) =>
                    sum + c.store.getUsedCapacity() / c.store.getCapacity(), 0) / containers.length;

                return avgFillRatio > 0.8 ? 25 : 11;

        }

        return baseConfig.jobPrio;
    }

    static assignRoundRobin(creep: Creep, room: Room): void {
        const jobType = creep.memory.job;

        // Kritische Jobs: Jeder Tick
        if (this.getDynamicPriority(jobType, room) >= 25) {
            creep.memory.roundRobin = undefined;
            return;
        }

        // Normale Jobs: Jeden 2. Tick
        if (this.getDynamicPriority(jobType, room) >= 15) {
            creep.memory.roundRobin = 2;
            return;
        }

        // Niedrige Jobs: Jeden 3-5 Tick (je nach CPU-Last)
        const cpuLoad = Game.cpu.getUsed() / Game.cpu.limit;
        creep.memory.roundRobin = cpuLoad > 0.7 ? 5 : 3;
    }

    static doPrioJobs() {
        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;

        const creepCount = Object.keys(Game.creeps).length;
        if (creepCount === 0) {
            return;
        }

        for (const name in Game.creeps) {
            const creep = Game.creeps[name];

            if (creep.spawning) {
                continue;
            }
            const def = Jobs.jobs[creep.memory.job];

            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            // Dynamische Round-Robin Zuweisung
            if (creep.memory.roundRobin === undefined || Game.time % 100 === 0) {
                this.assignRoundRobin(creep, creep.room);
            }

            if (creep.memory.roundRobin != undefined) {
                if (Game.time % creep.memory.roundRobin != 0) {
                    continue;
                }
            }

            // Dynamische Priorität berechnen
            const dynamicPrio = this.getDynamicPriority(creep.memory.job, creep.room);

            if (dynamicPrio >= 21) {
                def.ant.doJob(creep);
            } else if (dynamicPrio >= 11) {
                this.bucketNorm.push({creep, ant: def.ant});
            } else {
                this.bucketLow.push({creep, ant: def.ant});
            }
        }
    }

    static doJobs() {
        for (const {creep, ant} of this.bucketNorm) {
            ant.doJob(creep);
        }
    }

    static doLowJobs() {
        for (const {creep, ant} of this.bucketLow) {
            ant.doJob(creep);
        }
    }
}
