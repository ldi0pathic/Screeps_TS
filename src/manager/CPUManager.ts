export class CPUManager {
    private static readonly HISTORY_SIZE = 10;

    static getAdaptiveCPUBudget(): number {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];

        const avgCPU = Memory.cpuHistory.length > 0
            ? Memory.cpuHistory.reduce((a, b) => a + b, 0) / Memory.cpuHistory.length
            : Game.cpu.getUsed();

        const maxCPU = Game.cpu.limit;
        const bucket = Game.cpu.bucket;

        // Strengere Regeln für 20 CPU Server
        const isLowCPULimit = maxCPU <= 20;

        // Wenn der Bucket voll ist, können wir aggressiver sein
        if (bucket > 9000) return maxCPU * 0.95;
        if (bucket > 7000) return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (bucket < 2000) return maxCPU * (isLowCPULimit ? 0.2 : 0.3);

        if (avgCPU < maxCPU * 0.3) return maxCPU * (isLowCPULimit ? 0.7 : 0.8);
        if (avgCPU > maxCPU * 0.7) return maxCPU * (isLowCPULimit ? 0.3 : 0.4);
        return maxCPU * (isLowCPULimit ? 0.5 : 0.6);
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
        console.log(`ℹ️ CPU: ${used.toFixed(1)}/${Game.cpu.limit} Bucket: ${bucket}`);
    }

    static updateHistory(): void {
        if (!Memory.cpuHistory) Memory.cpuHistory = [];
        if (!Memory.lastTickCpu) return;

        Memory.cpuHistory.push(Memory.lastTickCpu);
        if (Memory.cpuHistory.length > this.HISTORY_SIZE) {
            Memory.cpuHistory.shift();
        }

        // Pixel Farming
        if (Game.cpu.bucket === 10000 && Game.cpu.generatePixel) {
            const result = Game.cpu.generatePixel();
            if (result === OK) {
                console.log("💎 Pixel generiert!");
            }
        }
    }

}
