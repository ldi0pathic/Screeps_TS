import {Ant} from "../roles/base/Ant";
import {CleanUpManager} from "./CleanUpManager";
import {Jobs} from "../records/Jobs";

export class JobsManager {
    private static bucketNorm: Array<{ creep: Creep; ant: Ant<any>; estimatedCost: number }> = [];
    private static bucketLow: Array<{ creep: Creep; ant: Ant<any>; estimatedCost: number }> = [];
    private static bucketCritical: Array<{ creep: Creep; ant: Ant<any> }> = [];

    // Memory-Initialisierung
    static initializeMemory(): void {
        if (!Memory.jobOffsets) Memory.jobOffsets = {};
        if (!Memory.jobCosts) Memory.jobCosts = {};
        if (!Memory.jobPerformance) {
            Memory.jobPerformance = {
                lastTick: Game.time,
                ticksWithHighCPU: 0,
                totalEmergencyActivations: 0,
                lastEmergencyTick: 0,
                avgCreepsPerTick: 0,
                cpuHistory: []
            };
        }
        if (!Memory.emergencyMode) {
            Memory.emergencyMode = {
                active: false,
                activatedTick: 0,
                reason: 'manual',
                skipCount: 0,
                criticalJobsOnly: false
            };
        }
    }

    static getDynamicPriority(jobType: eJobType, room: Room): number {
        const baseConfig = Jobs.jobs[jobType];
        if (!baseConfig) return 11;

        // Emergency Mode: Nur kritische Jobs
        if (Memory.emergencyMode?.active && !this.isCriticalJob(jobType, room)) {
            return 0; // Überspringe nicht-kritische Jobs
        }

        switch (jobType) {
            case eJobType.miner:
                return room.energyAvailable < room.energyCapacityAvailable * 0.3 ? 45 : 25;

            case eJobType.upgrader:
                const controller = room.controller;
                if (controller && controller.ticksToDowngrade < 3000) {
                    return 30;
                }
                return controller?.level === 8 ? 5 : 11;
                
        }

        return baseConfig.spawnPrio;
    }

    static isCriticalJob(jobType: eJobType, room: Room): boolean {
        switch (jobType) {
            case eJobType.miner:
                return room.energyAvailable < room.energyCapacityAvailable * 0.2;
            case eJobType.upgrader:
                const controller = room.controller;
                if (!controller) return false;
                return controller && controller.ticksToDowngrade < 3000;
            default:
                return false;
        }
    }

    // CPU-Kosten Tracking
    static trackJobCost(jobType: eJobType, cpuCost: number): void {
        if (!Memory.jobCosts![jobType]) {
            Memory.jobCosts![jobType] = {
                total: 0,
                count: 0,
                avg: 0,
                lastReset: Game.time,
                peak: 0
            };
        }

        const stats = Memory.jobCosts![jobType];
        stats.total += cpuCost;
        stats.count++;
        stats.avg = stats.total / stats.count;
        stats.peak = Math.max(stats.peak, cpuCost);
    }

    static getEstimatedJobCost(jobType: eJobType): number {
        const stats = Memory.jobCosts?.[jobType];
        if (!stats || stats.count < 3) {

            const fallbackCosts: Record<string, number> = {
                [eJobType.miner]: 0.5,
                [eJobType.upgrader]: 0.3,
                [eJobType.builder]: 0.4,
                [eJobType.transporter]: 0.6
            };
            return fallbackCosts[jobType] || 0.5;
        }

        return Math.min(stats.avg * 1.2, stats.peak);
    }

    static getJobOffset(creep: Creep, jobType: eJobType): number {
        if (!Memory.jobOffsets) Memory.jobOffsets = {};
        const key = `${creep.name}_${jobType}`;

        if (!Memory.jobOffsets[key]) {
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                const char = key.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }

            hash = Math.abs(hash);

            const sameJobCreeps = Object.values(Game.creeps).filter(c =>
                c.memory.job === jobType && c.memory.workroom == creep.memory.workroom);
            const maxOffset = Math.max(2, sameJobCreeps.length);

            Memory.jobOffsets[key] = hash % maxOffset;
        }

        return Memory.jobOffsets[key];
    }

    // Emergency Mode Management
    static checkEmergencyMode(): void {
        const cpuUsage = Game.cpu.getUsed() / Game.cpu.limit;
        const bucketLevel = Game.cpu.bucket;

        const shouldActivate = cpuUsage > 0.95 || bucketLevel < 1000;
        const shouldDeactivate = cpuUsage < 0.8 && bucketLevel > 5000;

        if (!Memory.emergencyMode!.active && shouldActivate) {
            Memory.emergencyMode!.active = true;
            Memory.emergencyMode!.activatedTick = Game.time;
            Memory.emergencyMode!.reason = bucketLevel < 1000 ? 'bucket_low' : 'cpu_critical';
            Memory.emergencyMode!.skipCount = 0;
            Memory.jobPerformance!.totalEmergencyActivations++;

            console.log(`🚨 EMERGENCY MODE ACTIVATED: ${Memory.emergencyMode!.reason} (CPU: ${(cpuUsage * 100).toFixed(1)}%, Bucket: ${bucketLevel})`);
        } else if (Memory.emergencyMode!.active && shouldDeactivate) {
            const duration = Game.time - Memory.emergencyMode!.activatedTick;
            console.log(`✅ Emergency Mode deactivated after ${duration} ticks (Skipped: ${Memory.emergencyMode!.skipCount} creeps)`);

            Memory.emergencyMode!.active = false;
            Memory.emergencyMode!.criticalJobsOnly = false;
        }

        // Update Performance Tracking
        if (cpuUsage > 0.8) {
            Memory.jobPerformance!.ticksWithHighCPU++;
        }

        // Update CPU History
        if (!Memory.jobPerformance!.cpuHistory) Memory.jobPerformance!.cpuHistory = [];
        Memory.jobPerformance!.cpuHistory.push(cpuUsage);
        if (Memory.jobPerformance!.cpuHistory.length > 10) {
            Memory.jobPerformance!.cpuHistory.shift();
        }
    }

    static assignRoundRobin(creep: Creep, room: Room): void {
        const jobType = creep.memory.job;
        const priority = this.getDynamicPriority(jobType, room);
        const cpuUsage = Game.cpu.getUsed() / Game.cpu.limit;
        const tickTime = Game.cpu.tickLimit;

        // Emergency Mode: Nur kritische Jobs bekommen Frequenz 1
        if (Memory.emergencyMode?.active) {
            if (this.isCriticalJob(jobType, room)) {
                creep.memory.roundRobin = 1;
                creep.memory.roundRobinOffset = 0;
            } else {
                creep.memory.roundRobin = 20; // Sehr niedrige Frequenz
                creep.memory.roundRobinOffset = this.getJobOffset(creep, jobType);
            }
            return;
        }

        // Kritische Jobs: Immer ausführen
        if (priority >= 25) {
            creep.memory.roundRobin = 1;
            creep.memory.roundRobinOffset = 0;
            return;
        }

        // Adaptive Frequenz basierend auf CPU-Last und Priorität
        let frequency = 1;

        if (cpuUsage > 0.8) {
            if (priority >= 20) {
                frequency = 3;
            } else if (priority >= 15) {
                frequency = 4;
            } else if (priority >= 10) {
                frequency = 6;
            } else {
                frequency = 10;
            }
        }

        // Zusätzliche Anpassung für niedrige Tick-Zeit
        if (tickTime < 100) {
            frequency = Math.min(frequency * 2, 10);
        }

        creep.memory.roundRobin = frequency;

        // Berechne Offset für Lastverteilung
        if (creep.memory.roundRobinOffset == undefined) {
            creep.memory.roundRobinOffset = this.getJobOffset(creep, jobType);
        }
    }

    static shouldExecuteCreep(creep: Creep): boolean {
        // Emergency Mode: Prüfe ob Job kritisch ist
        if (Memory.emergencyMode?.active && !this.isCriticalJob(creep.memory.job, creep.room)) {
            Memory.emergencyMode.skipCount++;
            return false;
        }

        // Kritische Jobs (roundRobin = 1) werden immer ausgeführt
        if (creep.memory.roundRobin === 1) return true;

        // Wenn der Creep sich bewegt, ist er aktiv
        if (creep.memory.moving) return true;

        // Round-Robin Check mit Offset für Lastverteilung
        const offset = creep.memory.roundRobinOffset || 0;
        const currentTick = Game.time + offset;

        return currentTick % creep.memory.roundRobin === 0;
    }

    static doJobs() {
        const startCpu = Game.cpu.getUsed();

        for (const {creep, ant, estimatedCost} of this.bucketNorm) {
            const jobStartCpu = Game.cpu.getUsed();

            ant.doJob();

            const actualCost = Game.cpu.getUsed() - jobStartCpu;
            this.trackJobCost(creep.memory.job, actualCost);

            // Store last job cost in creep memory for debugging
            creep.memory.lastJobCost = actualCost;
        }

        const totalCpuUsed = Game.cpu.getUsed() - startCpu;
        if (totalCpuUsed > 5) { // Log only if significant CPU usage
            console.log(`🔧 Normal Jobs: ${this.bucketNorm.length} jobs, ${totalCpuUsed.toFixed(2)} CPU`);
        }
    }

    static doLowJobs() {
        for (const {creep, ant, estimatedCost} of this.bucketLow) {
            const jobStartCpu = Game.cpu.getUsed();

            ant.doJob();

            const actualCost = Game.cpu.getUsed() - jobStartCpu;
            this.trackJobCost(creep.memory.job, actualCost);
            creep.memory.lastJobCost = actualCost;
        }
    }

    static doCriticalJobs() {

        for (const {creep, ant} of this.bucketCritical) {
            const jobStartCpu = Game.cpu.getUsed();

            ant.doJob();

            const actualCost = Game.cpu.getUsed() - jobStartCpu;
            this.trackJobCost(creep.memory.job, actualCost);
            creep.memory.lastJobCost = actualCost;
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

        if (cpuUsage > 0.75) {
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
        // Initialize Memory if needed
        this.initializeMemory();

        // Check Emergency Mode
        this.checkEmergencyMode();

        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;
        this.bucketCritical.length = 0;

        const creepCount = Object.keys(Game.creeps).length;
        if (creepCount === 0) return;

        // Dynamisches CPU-Budget - in Emergency Mode reduzierter Budget
        const emergencyMultiplier = Memory.emergencyMode?.active ? 0.6 : 0.9;
        const availableCPU = Game.cpu.limit - Game.cpu.getUsed();
        const cpuBudget = Math.min(availableCPU * emergencyMultiplier, Game.cpu.limit * 0.8);
        const startCpu = Game.cpu.getUsed();

        // Sortiere Creeps nach Priorität für bessere Abarbeitung
        const creepEntries = Object.entries(Game.creeps).sort(([, a], [, b]) => {
            const prioA = this.getDynamicPriority(a.memory.job, a.room);
            const prioB = this.getDynamicPriority(b.memory.job, b.room);
            return prioB - prioA;
        });

        let processedCount = 0;
        let skippedCount = 0;
        let estimatedTotalCost = 0;

        for (const [name, creep] of creepEntries) {
            const estimatedJobCost = this.getEstimatedJobCost(creep.memory.job);

            // Verbesserte CPU-Budget Prüfung mit tatsächlichen Kosten-Schätzungen
            if (estimatedTotalCost + estimatedJobCost > cpuBudget) {
                skippedCount = creepEntries.length - processedCount;
                if (skippedCount > 5) { // Nur loggen wenn signifikant
                    console.log(`⚠️ CPU-Budget überschritten, ${skippedCount} Creeps übersprungen (Est: ${estimatedTotalCost.toFixed(1)}/${cpuBudget.toFixed(1)})`);
                }
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

            // Verbesserte Round-Robin Prüfung mit Lastverteilung
            if (!this.shouldExecuteCreep(creep)) {
                const offset = creep.memory.roundRobinOffset || 0;
                const nextExecution = creep.memory.roundRobin - ((Game.time + offset) % creep.memory.roundRobin);

                // Emergency mode indicator
                const emergencyIcon = Memory.emergencyMode?.active ? '🚨' : '⏸️';
                creep.say(`${emergencyIcon}${nextExecution}`);
                continue;
            }

            const ant = Jobs.createAnt(creep.memory.job, creep);
            if (!ant) {
                console.log(`⚠️ Konnte keine Ant-Instanz für Job ${creep.memory.job} erstellen`);
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            const dynamicPrio = this.getDynamicPriority(creep.memory.job, creep.room);

            // Erweiterte Prioritätsstufen mit Critical Bucket
            if (dynamicPrio >= 30) {
                this.bucketCritical.push({creep, ant}); // Ultra-kritisch
            } else if (dynamicPrio >= 25) {
                ant.doJob(); // Kritisch - sofort ausführen
                const actualCost = 0.5; // Geschätzt, wird in doJob gemessen
                this.trackJobCost(creep.memory.job, actualCost);
            } else if (dynamicPrio >= 20) {
                this.bucketNorm.unshift({creep, ant, estimatedCost: estimatedJobCost}); // Hoch - am Anfang der Norm-Queue
            } else if (dynamicPrio >= 11) {
                this.bucketNorm.push({creep, ant, estimatedCost: estimatedJobCost}); // Normal
            } else if (dynamicPrio > 0) {
                this.bucketLow.push({creep, ant, estimatedCost: estimatedJobCost}); // Niedrig
            }
            // Jobs with priority 0 (non-critical in emergency) werden komplett übersprungen

            processedCount++;
            estimatedTotalCost += estimatedJobCost;
        }

        // Update Performance Metrics
        Memory.jobPerformance!.lastTick = Game.time;
        Memory.jobPerformance!.avgCreepsPerTick =
            (Memory.jobPerformance!.avgCreepsPerTick * 0.9) + (processedCount * 0.1);

        // Logging nur bei signifikanten Änderungen oder Emergency Mode
        if (skippedCount > 0 || Game.time % 100 === 0 || Memory.emergencyMode?.active) {
            const emergencyStatus = Memory.emergencyMode?.active ? ' 🚨EMERGENCY' : '';
            console.log(`🔄 Jobs: Verarbeitet=${processedCount}, Übersprungen=${skippedCount}, CPU=${(Game.cpu.getUsed() - startCpu).toFixed(2)}${emergencyStatus}`);
        }

        // Adaptive Umverteilung bei hoher CPU-Last
        if (Game.cpu.getUsed() / Game.cpu.limit > 0.8) {
            this.redistributeJobsOnHighCPU();
        }
    }

    static getJobStats(): Record<string, { count: number; priority: number; avgCost: number }> {
        const stats: Record<string, { count: number; priority: number; avgCost: number }> = {};

        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const jobType = creep.memory.job;

            if (!stats[jobType]) {
                stats[jobType] = {
                    count: 0,
                    priority: this.getDynamicPriority(jobType, creep.room),
                    avgCost: Memory.jobCosts?.[jobType]?.avg || 0
                };
            }
            stats[jobType].count++;
        }

        return stats;
    }

    static getPerformanceMetrics(): any {
        return {
            totalCreeps: Object.keys(Game.creeps).length,
            processedCreeps: Memory.jobPerformance?.avgCreepsPerTick || 0,
            bucketsSize: {
                critical: this.bucketCritical.length,
                normal: this.bucketNorm.length,
                low: this.bucketLow.length
            },
            cpuUsage: Game.cpu.getUsed(),
            cpuLimit: Game.cpu.limit,
            cpuPercent: (Game.cpu.getUsed() / Game.cpu.limit * 100).toFixed(1),
            emergencyMode: Memory.emergencyMode?.active || false,
            emergencyCount: Memory.jobPerformance?.totalEmergencyActivations || 0
        };
    }

    static logJobDistribution(): void {
        if (Game.time % 50 !== 0) return;

        const stats = this.getJobStats();
        const metrics = this.getPerformanceMetrics();

        const emergencyIndicator = metrics.emergencyMode ? ' 🚨' : '';
        console.log(`📊 === Job System Status (Tick ${Game.time})${emergencyIndicator} ===`);
        console.log(`⚡ CPU: ${metrics.cpuPercent}% (${metrics.cpuUsage.toFixed(1)}/${metrics.cpuLimit}) Bucket: ${Game.cpu.bucket}`);
        console.log(`👥 Creeps: ${metrics.totalCreeps} (Avg: ${metrics.processedCreeps.toFixed(1)})`);
        console.log(`📦 Buckets: C=${metrics.bucketsSize.critical}, N=${metrics.bucketsSize.normal}, L=${metrics.bucketsSize.low}`);

        if (metrics.emergencyMode) {
            console.log(`🚨 Emergency: ${Memory.emergencyMode?.reason} (${Game.time - Memory.emergencyMode!.activatedTick} ticks, Skipped: ${Memory.emergencyMode?.skipCount})`);
        }

        console.log(`🎯 Job Performance:`);
        Object.entries(stats)
            .sort(([, a], [, b]) => b.priority - a.priority)
            .forEach(([jobType, data]) => {
                const bar = '█'.repeat(Math.floor(data.count / 2)) + '░'.repeat(Math.max(0, 5 - Math.floor(data.count / 2)));
                const costInfo = data.avgCost > 0 ? ` (${data.avgCost.toFixed(2)}⚡)` : '';
                console.log(`  ${jobType.padEnd(12)}: ${data.count.toString().padStart(2)} [${bar}] P:${data.priority}${costInfo}`);
            });

        // CPU Trend Analysis
        if (Memory.jobPerformance?.cpuHistory && Memory.jobPerformance.cpuHistory.length > 5) {
            const recent = Memory.jobPerformance.cpuHistory.slice(-5);
            const trend = recent[recent.length - 1] - recent[0];
            const trendIcon = trend > 0.1 ? '📈' : trend < -0.1 ? '📉' : '➡️';
            console.log(`${trendIcon} CPU Trend: ${(trend * 100).toFixed(1)}% over 5 ticks`);
        }
    }
}