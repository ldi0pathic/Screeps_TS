export class CPUManager {
    private static readonly HISTORY_SIZE = 10;

    static getAdaptiveCPUBudget(): number {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];

        const avgCPU = Memory.cpuHistory.length > 0
            ? Memory.cpuHistory.reduce((a, b) => a + b, 0) / Memory.cpuHistory.length
            : Game.cpu.getUsed();

        const maxCPU = Game.cpu.limit;

        if (avgCPU < maxCPU * 0.3) return maxCPU * 0.8;
        if (avgCPU > maxCPU * 0.7) return maxCPU * 0.4;
        return maxCPU * 0.6;
    }

    static shouldContinue(phase: 'normal' | 'low'): boolean {
        const budget = this.getAdaptiveCPUBudget();
        const used = Game.cpu.getUsed();

        if (phase === 'normal') {
            return used < budget * 0.6;
        } else {
            return used < budget;
        }
    }

    static getStatus(): void {
        const used = Game.cpu.getUsed();
        const bucket = Game.cpu.bucket;
        console.log(`CPU: ${used.toFixed(1)}/${Game.cpu.limit} Bucket: ${bucket}`);
    }

    static updateHistory(): void {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];
        if (!Memory.lastTickCpu) return;

        Memory.cpuHistory.push(Memory.lastTickCpu);
        if (Memory.cpuHistory.length > this.HISTORY_SIZE) {
            Memory.cpuHistory.shift();
        }
    }

}
