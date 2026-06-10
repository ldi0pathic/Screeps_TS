export class CPUManager {
    private static readonly HISTORY_SIZE = 10;
    private static readonly PER_ROOM_AVG_WINDOW = 100;
    private static readonly CPU_SAFETY_BUFFER = 3;
    private static readonly TOTAL_CPU_LIMIT = 20;

    private static staggerCounters: Record<string, number> = {};
    private static managerStartCpu: Record<string, number> = {};

    static getAdaptiveCPUBudget(): number {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];

        const avgCPU = Memory.cpuHistory.length > 0
            ? Memory.cpuHistory.reduce((a, b) => a + b, 0) / Memory.cpuHistory.length
            : Game.cpu.getUsed();

        const maxCPU = Game.cpu.limit;
        const bucket = Game.cpu.bucket;

        const isLowCPULimit = maxCPU <= 20;

        if (bucket > 9000) return maxCPU * 0.95;
        if (bucket > 7000) return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (bucket < 2000) return maxCPU * (isLowCPULimit ? 0.2 : 0.3);

        if (avgCPU < maxCPU * 0.3) return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (avgCPU > maxCPU * 0.7) return maxCPU * (isLowCPULimit ? 0.3 : 0.4);
        return maxCPU * (isLowCPULimit ? 0.5 : 0.6);
    }

    static canRunTier(tier: 'normal' | 'low'): boolean {
        const budget = this.getAdaptiveCPUBudget();
        const used = Game.cpu.getUsed();
        if (tier === 'normal') return used < budget * 0.6;
        return used < budget;
    }

    static shouldContinue(phase: 'normal' | 'low'): boolean {
        return this.canRunTier(phase);
    }

    static getStatus(): void {
        const used = Game.cpu.getUsed();
        const bucket = Game.cpu.bucket;
        if (Memory.debug?.visuals) {
            console.log(`CPU: ${used.toFixed(1)}/${Game.cpu.limit} Bucket: ${bucket}`);
        }
    }

    /** Returns true once per `interval` ticks for the given key, staggered by offset */
    static shouldRunEvery(key: string, interval: number, offset: number = 0): boolean {
        return (Game.time + offset) % interval === 0;
    }

    /** Wrap a function, record its CPU cost under a manager name */
    static measure<T>(name: string, fn: () => T): T {
        const start = Game.cpu.getUsed();
        const result = fn();
        const cost = Game.cpu.getUsed() - start;
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        const prev = Memory.cpuStats.manager[name] ?? cost;
        Memory.cpuStats.manager[name] = prev * 0.9 + cost * 0.1;
        return result;
    }

    /** Measure CPU consumed by a single room's processing and update rolling average */
    static measureRoom(roomName: string, fn: () => void): void {
        const start = Game.cpu.getUsed();
        fn();
        const cost = Game.cpu.getUsed() - start;
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        const prev = Memory.cpuStats.perRoom[roomName] ?? cost;
        Memory.cpuStats.perRoom[roomName] = prev * (1 - 1 / this.PER_ROOM_AVG_WINDOW) + cost * (1 / this.PER_ROOM_AVG_WINDOW);
    }

    /** Returns true if expanding to a new room is within the CPU budget */
    static canExpandToNewRoom(): boolean {
        const stats = Memory.cpuStats;
        if (!stats) return false;
        const roomCosts = Object.values(stats.perRoom);
        if (roomCosts.length === 0) return false;
        const avgRoomCost = roomCosts.reduce((a, b) => a + b, 0) / roomCosts.length;
        const currentTotal = roomCosts.reduce((a, b) => a + b, 0) + stats.baseOverhead;
        const projected = currentTotal + avgRoomCost;
        return projected + this.CPU_SAFETY_BUFFER < this.TOTAL_CPU_LIMIT;
    }

    static updateHistory(): void {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];
        if (!Memory.lastTickCpu) return;

        Memory.cpuHistory.push(Memory.lastTickCpu);
        if (Memory.cpuHistory.length > this.HISTORY_SIZE) {
            Memory.cpuHistory.shift();
        }

        // Track total CPU in stats
        if (!Memory.cpuStats) {
            Memory.cpuStats = { perRoom: {}, baseOverhead: 0, total: 0, manager: {} };
        }
        Memory.cpuStats.total = Memory.lastTickCpu;

        // Pixels only when explicitly enabled
        if (Memory.config?.enablePixels && Game.cpu.bucket === 10000 && Game.cpu.generatePixel) {
            Game.cpu.generatePixel();
        }

        // Log CPU summary every 500 ticks
        if (Game.time % 500 === 0) {
            const stats = Memory.cpuStats;
            const roomCount = Object.keys(stats.perRoom).length;
            const totalRoomCpu = Object.values(stats.perRoom).reduce((a, b) => a + b, 0);
            console.log(`[CPU] tick=${Game.time} total=${Memory.lastTickCpu.toFixed(1)} rooms=${roomCount} roomCpu=${totalRoomCpu.toFixed(2)} bucket=${Game.cpu.bucket}`);
        }
    }

}

