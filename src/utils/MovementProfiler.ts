export class MovementProfiler {
    private static measurements: { [key: string]: number[] } = {};
    private static lastStatsOutput: number = 0;
    private static statsInterval: number = 50; // Alle 50 Ticks

    static startMeasurement(operation: string): number {
        return Game.cpu.getUsed();
    }

    static endMeasurement(operation: string, startCpu: number): void {
        const cpuUsed = Game.cpu.getUsed() - startCpu;

        if (!this.measurements[operation]) {
            this.measurements[operation] = [];
        }

        this.measurements[operation].push(cpuUsed);

        // Nur die letzten 100 Messungen behalten
        if (this.measurements[operation].length > 100) {
            this.measurements[operation].shift();
        }

        // Automatisches Logging alle X Ticks
        if (Game.time - this.lastStatsOutput >= this.statsInterval) {
            this.outputStats();
            this.lastStatsOutput = Game.time;
        }
    }

    private static outputStats(): void {
        console.log('=== Movement CPU Stats (Tick ' + Game.time + ') ===');
        let totalAvg = 0;
        let totalCalls = 0;

        for (const [operation, measurements] of Object.entries(this.measurements)) {
            if (measurements.length > 0) {
                const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const max = Math.max(...measurements);
                const min = Math.min(...measurements);
                console.log(`${operation}: avg=${avg.toFixed(4)}, max=${max.toFixed(4)}, min=${min.toFixed(4)}, calls=${measurements.length}`);
                totalAvg += avg * measurements.length;
                totalCalls += measurements.length;
            }
        }

        if (totalCalls > 0) {
            console.log(`TOTAL Movement CPU: ${(totalAvg / totalCalls).toFixed(4)} avg per call, ${totalCalls} total calls`);
        }
    }

    static getStats(): void {
        this.outputStats();
    }

    static setInterval(ticks: number): void {
        this.statsInterval = ticks;
    }
}