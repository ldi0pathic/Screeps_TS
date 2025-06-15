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
        const priority = this.getDynamicPriority(jobType, room);
        const cpuUsage = Game.cpu.getUsed() / Game.cpu.limit;
        const tickTime = Game.cpu.tickLimit;

        // Kritische Jobs: Immer ausführen
        if (priority >= 25) {
            creep.memory.roundRobin = 1;
            return;
        }

        // Adaptive Frequenz basierend auf CPU-Last und Priorität
        let frequency = 2;

        if (priority >= 20) {
            frequency = cpuUsage > 0.8 ? 3 : 2;
        } else if (priority >= 15) {
            frequency = cpuUsage > 0.8 ? 4 : 3;
        } else if (priority >= 10) {
            frequency = cpuUsage > 0.8 ? 6 : 4;
        } else {
            frequency = cpuUsage > 0.8 ? 10 : 6;
        }

        // Zusätzliche Anpassung für niedrige Tick-Zeit
        if (tickTime < 100) {
            frequency = Math.min(frequency * 2, 10);
        }

        creep.memory.roundRobin = frequency;
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
    
    static shouldSkipCreep(creep: Creep): boolean {

        if (creep.fatigue > 0) return true;
        if (creep.spawning) return true;
        if (creep.ticksToLive !== undefined && creep.ticksToLive < 5) return true;

        return false;
    }

    
    static redistributeJobsOnHighCPU(): void {
        const cpuUsage = Game.cpu.getUsed() / Game.cpu.limit;

        if (cpuUsage > 0.85) {
            // Reduziere Round-Robin Frequenz für alle nicht-kritischen Jobs
            for (const name in Game.creeps) {
                const creep = Game.creeps[name];
                const priority = this.getDynamicPriority(creep.memory.job, creep.room);

                if (priority < 20 && creep.memory.roundRobin) {
                    creep.memory.roundRobin = Math.min(creep.memory.roundRobin * 2, 10);
                }
            }
        }
    }
    
    static doPrioJobs() {
        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;

        const creepCount = Object.keys(Game.creeps).length;
        if (creepCount === 0) return;

        // Dynamisches CPU-Budget basierend auf verfügbarer Zeit
        const availableCPU = Game.cpu.limit - Game.cpu.getUsed();
        const cpuBudget = Math.min(availableCPU * 0.9, Game.cpu.limit * 0.8);
        const startCpu = Game.cpu.getUsed();

        // Sortiere Creeps nach Priorität für bessere Abarbeitung
        const creepEntries = Object.entries(Game.creeps).sort(([, a], [, b]) => {
            const prioA = this.getDynamicPriority(a.memory.job, a.room);
            const prioB = this.getDynamicPriority(b.memory.job, b.room);
            return prioB - prioA;
        });

        let processedCount = 0;
        let skippedCount = 0;

        for (const [name, creep] of creepEntries) {

            const currentCpuUsed = Game.cpu.getUsed() - startCpu;
            const estimatedCpuForNextCreep = currentCpuUsed / Math.max(processedCount, 1);

            if (currentCpuUsed + estimatedCpuForNextCreep > cpuBudget) {
                skippedCount = creepEntries.length - processedCount;
                console.log(`⚠️ CPU-Budget überschritten, ${skippedCount} Creeps übersprungen`);
                break;
            }

            if (this.shouldSkipCreep(creep)) {
                continue;
            }

            const def = Jobs.jobs[creep.memory.job];
            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            // Adaptive Round-Robin alle 50 Ticks neu berechnen
            if (Game.time % 50 === 0 || creep.memory.roundRobin === undefined) {
                this.assignRoundRobin(creep, creep.room);
            }

            // Round-Robin Check
            if (!creep.memory.moving && creep.memory.roundRobin && creep.memory.roundRobin > 1) {
                if (Game.time % creep.memory.roundRobin !== 0) {
                    creep.say(`⏸️${creep.memory.roundRobin}`);
                    continue;
                }
            }

            const ant = Jobs.createAnt(creep.memory.job, creep);
            if (!ant) {
                console.log(`⚠️ Konnte keine Ant-Instanz für Job ${creep.memory.job} erstellen`);
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            const dynamicPrio = this.getDynamicPriority(creep.memory.job, creep.room);

            // Erweiterte Prioritätsstufen
            if (dynamicPrio >= 25) {
                ant.doJob(); // Kritisch - sofort ausführen
            } else if (dynamicPrio >= 20) {
                this.bucketNorm.unshift({creep, ant}); // Hoch - am Anfang der Norm-Queue
            } else if (dynamicPrio >= 11) {
                this.bucketNorm.push({creep, ant}); // Normal
            } else {
                this.bucketLow.push({creep, ant}); // Niedrig
            }

            processedCount++;
        }

        // Logging nur bei signifikanten Änderungen
        if (skippedCount > 0 || Game.time % 100 === 0) {
            console.log(`🔄 Jobs: Verarbeitet=${processedCount}, Übersprungen=${skippedCount}, CPU=${(Game.cpu.getUsed() - startCpu).toFixed(2)}`);
        }

        // Adaptive Umverteilung bei hoher CPU-Last
        if (Game.cpu.getUsed() / Game.cpu.limit > 0.8) {
            this.redistributeJobsOnHighCPU();
        }
    }
    
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
    
    static getPerformanceMetrics(): any {
        return {
            totalCreeps: Object.keys(Game.creeps).length,
            bucketsSize: {
                normal: this.bucketNorm.length,
                low: this.bucketLow.length
            },
            cpuUsage: Game.cpu.getUsed(),
            cpuLimit: Game.cpu.limit,
            cpuPercent: (Game.cpu.getUsed() / Game.cpu.limit * 100).toFixed(1)
        };
    }
    
    static logJobDistribution(): void {
        if (Game.time % 50 !== 0) return; // Nur alle 50 Ticks

        const stats = this.getJobStats();
        const metrics = this.getPerformanceMetrics();

        console.log(`📊 === Job System Status (Tick ${Game.time}) ===`);
        console.log(`⚡ CPU: ${metrics.cpuPercent}% (${metrics.cpuUsage.toFixed(1)}/${metrics.cpuLimit})`);
        console.log(`👥 Creeps: ${metrics.totalCreeps} (Buckets: N=${metrics.bucketsSize.normal}, L=${metrics.bucketsSize.low})`);

        console.log(`🎯 Prioritäten:`);
        Object.entries(stats)
            .sort(([, a], [, b]) => b.priority - a.priority)
            .forEach(([jobType, data]) => {
                const bar = '█'.repeat(Math.floor(data.count / 2)) + '░'.repeat(Math.max(0, 5 - Math.floor(data.count / 2)));
                console.log(`  ${jobType.padEnd(12)}: ${data.count.toString().padStart(2)} [${bar}] P:${data.priority}`);
            });
    }
}