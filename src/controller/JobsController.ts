import {Ant} from "../roles/base/Ant";
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

    static doJobs() {
        for (const {creep, ant} of this.bucketNorm) {
            ant.doJob();
        }
    }

    static doLowJobs() {
        for (const {creep, ant} of this.bucketLow) {
            ant.doJob();
        }
    }

    // NEUE HILFSMETHODEN für bessere Performance und Debugging

    /**
     * Gibt Statistiken über die aktuelle Job-Verteilung zurück
     */
    static getJobStats(): Record<string, { count: number; priority: number }> {
        const stats: Record<string, { count: number; priority: number }> = {};

        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const jobType = creep.memory.job;

            if (!stats[jobType]) {
                stats[jobType] = {
                    count: 0,
                    priority: this.getDynamicPriority(jobType, creep.room)
                };
            }
            stats[jobType].count++;
        }

        return stats;
    }

    /**
     * CPU-Optimierung: Überspringe Creeps die zu weit entfernt sind
     */
    static shouldSkipCreep(creep: Creep): boolean {
        // Überspringe Creeps die gerade bewegen und weit von ihrem Ziel entfernt sind
        if (creep.fatigue > 0) return true;

        // Weitere Optimierungen können hier hinzugefügt werden
        return false;
    }

    /**
     * Erweiterte doPrioJobs mit CPU-Optimierungen
     */
    static doPrioJobs() {
        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;

        const creepCount = Object.keys(Game.creeps).length;
        if (creepCount === 0) {
            return;
        }

        // CPU-Budget für diesen Tick
        const cpuBudget = Game.cpu.limit * 0.8; // 80% des Limits für Jobs
        const startCpu = Game.cpu.getUsed();

        for (const name in Game.creeps) {
            // CPU-Check: Stoppe wenn Budget überschritten
            if (Game.cpu.getUsed() - startCpu > cpuBudget) {
                console.log(`⚠️ CPU-Budget überschritten, ${Object.keys(Game.creeps).length - Object.keys(Game.creeps).indexOf(name)} Creeps übersprungen`);
                break;
            }

            const creep = Game.creeps[name];

            if (creep.spawning || this.shouldSkipCreep(creep)) {
                continue;
            }

            const def = Jobs.jobs[creep.memory.job];

            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            // Round-Robin Check
            if (creep.memory.roundRobin === undefined || Game.time % 100 === 0) {
                this.assignRoundRobin(creep, creep.room);
            }

            if (creep.memory.roundRobin != undefined) {
                if (Game.time % creep.memory.roundRobin != 0) {
                    creep.say("⏸️");
                    continue;
                }
            }

            // Ant-Instanz erstellen
            const ant = Jobs.createAnt(creep.memory.job, creep);
            if (!ant) {
                console.log(`⚠️ Konnte keine Ant-Instanz für Job ${creep.memory.job} erstellen`);
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            // Priorität und Bucketing
            const dynamicPrio = this.getDynamicPriority(creep.memory.job, creep.room);

            if (dynamicPrio >= 21) {
                ant.doJob();
            } else if (dynamicPrio >= 11) {
                this.bucketNorm.push({creep, ant});
            } else {
                this.bucketLow.push({creep, ant});
            }
        }
    }

    /**
     * Debug-Ausgabe für Job-Verteilung
     */
    static logJobDistribution(): void {
        const stats = this.getJobStats();
        console.log("📊 Job Distribution:");

        for (const [jobType, data] of Object.entries(stats)) {
            console.log(`  ${jobType}: ${data.count} Creeps (Prio: ${data.priority})`);
        }

        console.log(`  Buckets: Normal=${this.bucketNorm.length}, Low=${this.bucketLow.length}`);
    }
}