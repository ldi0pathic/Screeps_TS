import {Ant} from "../roles/base/Ant";
import {CleanUpManager} from "./CleanUpManager";
import {Jobs} from "../records/Jobs";

export class JobsManager {
    private static bucketNorm: Array<{ creep: Creep; ant: Ant<any> }> = [];
    private static bucketLow: Array<{ creep: Creep; ant: Ant<any> }> = [];
    private static bucketCritical: Array<{ creep: Creep; ant: Ant<any> }> = [];

    static initializeMemory(): void {
        if (!Memory.jobOffsets) Memory.jobOffsets = {};

    }

    static getDynamicPriority(jobType: eJobType, room: Room): number {
        const baseConfig = Jobs.jobs[jobType];
        if (!baseConfig) return 11;

        switch (jobType) {
            case eJobType.miner:
                return room.energyAvailable < 300
                    ? 30
                    : 15;
            case eJobType.upgrader:
                return room.controller != null
                    ? room.controller.ticksToDowngrade < 5000
                        ? 25
                        : 10
                    : 10;
            default:
                return baseConfig.jobPrio;
        }
    }

    static isCriticalJob(jobType: eJobType, room: Room): boolean {
        return this.getDynamicPriority(jobType, room) >= 25;
    }

    static getJobOffset(creep: Creep, jobType: eJobType): number {
        if (!Memory.jobOffsets) Memory.jobOffsets = {};
        const key = `${creep.name}_${jobType}`;

        if (!Memory.jobOffsets[key]) {
            let hash = 0;
            for (let i = 0; i < key.length; i += 2) {
                hash = (hash << 5) + key.charCodeAt(i);
            }

            Memory.jobOffsets[key] = Math.abs(hash) % 10;
        }

        return Memory.jobOffsets[key];
    }


    static assignRoundRobin(creep: Creep, room: Room): void {
        const priority = this.getDynamicPriority(creep.memory.job, room);


        if (priority >= 25) {
            creep.memory.roundRobin = 1;
        } else if (priority >= 15) {
            creep.memory.roundRobin = 2;
        } else if (priority >= 10) {
            creep.memory.roundRobin = 3;
        } else {
            creep.memory.roundRobin = 5;
        }
        if (creep.memory.roundRobinOffset === undefined) {
            creep.memory.roundRobinOffset = this.getJobOffset(creep, creep.memory.job);
        }
    }

    static shouldExecuteCreep(creep: Creep): boolean {
        if (creep.memory.roundRobin === 1) return true;
        if (creep.memory.moving) return true;

        return (Game.time + (creep.memory.roundRobinOffset || 0)) % creep.memory.roundRobin === 0;
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

    static doCriticalJobs() {
        for (const {creep, ant} of this.bucketCritical) {
            ant.doJob();
        }
    }

    static shouldSkipCreep(creep: Creep): boolean {

        if (creep.spawning) return true;
        if (creep.fatigue > 0) return true;

        return creep.ticksToLive !== undefined && creep.ticksToLive < 3;
    }

    static doPrioJobs() {
        this.initializeMemory();

        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;
        this.bucketCritical.length = 0;

        for (const name in Game.creeps) {
            const creep = Game.creeps[name];

            if (this.shouldSkipCreep(creep)) continue;

            const def = Jobs.jobs[creep.memory.job];
            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            if (Game.time % 10 === 0 || creep.memory.roundRobin === undefined) {
                this.assignRoundRobin(creep, creep.room);
            }

            if (!this.shouldExecuteCreep(creep)) {
                continue;
            }

            const ant = Jobs.createAnt(creep.memory.job, creep);
            if (!ant) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            const priority = this.getDynamicPriority(creep.memory.job, creep.room);

            if (priority >= 25) {
                this.bucketCritical.push({creep, ant});
            } else if (priority >= 15) {
                this.bucketNorm.push({creep, ant});
            } else if (priority > 0) {
                this.bucketLow.push({creep, ant});
            }
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
                critical: this.bucketCritical.length,
                normal: this.bucketNorm.length,
                low: this.bucketLow.length
            },
            cpuUsage: Game.cpu.getUsed(),
            cpuLimit: Game.cpu.limit,
        };
    }

    static logJobDistribution(): void {
        if (Game.time % 100 !== 0) return;

        const stats = this.getJobStats();
        const metrics = this.getPerformanceMetrics();

        console.log(`📊 Jobs T${Game.time}: ${metrics.totalCreeps} creeps, CPU: ${(metrics.cpuUsage / metrics.cpuLimit * 100).toFixed(1)}%`);

        Object.entries(stats).forEach(([jobType, data]) => {
            console.log(`  ${jobType}: ${data.count} (P:${data.priority})`);
        });
    }
}