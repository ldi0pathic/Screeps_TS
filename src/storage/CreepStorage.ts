export class CreepStorage {
    private static instance: CreepStorage;
    private creepCache: Map<string, { creeps: Creep[], lastUpdate: number }> = new Map();
    private readonly CACHE_TTL = 5;

    private constructor() {
    }

    static getInstance(): CreepStorage {
        if (!this.instance) {
            this.instance = new CreepStorage();
        }
        return this.instance;
    }

    onCreepSpawning(job: string, workRoom: string): void {
        this.invalidateCache(`job_${job}`);
        this.invalidateCache(`room_${workRoom}`);
        this.invalidateCache(`${job}_${workRoom}`);
    }

    onCreepSpawned(creep: Creep): void {
        this.invalidateCache(`job_${creep.memory.job}`);
        this.invalidateCache(`room_${creep.memory.workRoom}`);
        this.invalidateCache(`${creep.memory.job}_${creep.memory.workRoom}`);
    }

    onCreepDied(creepMemory: CreepMemory): void {
        this.invalidateCache(`job_${creepMemory.job}`);
        this.invalidateCache(`room_${creepMemory.workRoom}`);
        this.invalidateCache(`${creepMemory.job}_${creepMemory.workRoom}`);
    }

    getCreepCountByJobAndRoom(job: string, workRoom: string): number {
        return this.getCreepsByJobAndRoom(job, workRoom).length;
    }

    getCreepsByJobAndRoom(job: string, workRoom: string): Creep[] {
        const key = `${job}_${workRoom}`;
        const roomKey = `room_${workRoom}`;

        const roomCache = this.creepCache.get(roomKey);

        if (roomCache && (Game.time - roomCache.lastUpdate) < this.CACHE_TTL) {
            return this.getCachedCreeps(key, () =>
                _.filter(roomCache.creeps, c => c.memory.job === job)
            );
        }

        return this.getCachedCreeps(key, () =>
            _.filter(Game.creeps, (c) =>
                c.memory.job === job &&
                c.memory.workRoom === workRoom
            )
        );
    }

    getCreepsByRoom(roomName: string): Creep[] {
        const key = `room_${roomName}`;
        return this.getCachedCreeps(key, () =>
            _.filter(Game.creeps, c => c.memory.workRoom === roomName)
        );
    }

    getCreepCountByRoom(roomName: string): number {
        return this.getCreepsByRoom(roomName).length;
    }


    // Invalidiert Cache für spezifische Bereiche
    invalidateCache(pattern?: string): void {
        if (!pattern) {
            this.creepCache.clear();
            return;
        }

        const keysToDelete = Array.from(this.creepCache.keys())
            .filter(key => key.includes(pattern));

        keysToDelete.forEach(key => this.creepCache.delete(key));
    }

    // Cache-Statistiken
    getCacheStats(): { size: number, keys: string[], hitRate?: number } {
        return {
            size: this.creepCache.size,
            keys: Array.from(this.creepCache.keys())
        };
    }

    // Bereinigung alter Cache-Einträge (optional, bei 2 Ticks TTL weniger kritisch)
    cleanupCache(): void {
        const currentTime = Game.time;
        const keysToDelete: string[] = [];

        this.creepCache.forEach((value, key) => {
            if (currentTime - value.lastUpdate >= this.CACHE_TTL) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.creepCache.delete(key));
    }

    private getCachedCreeps(key: string, filterFunction: () => Creep[]): Creep[] {
        const cached = this.creepCache.get(key);

        if (cached && (Game.time - cached.lastUpdate) < this.CACHE_TTL) {
            // console.log(`Cache hit for ${key}`);
            return cached.creeps;
        }

        const creeps = filterFunction();
        this.creepCache.set(key, {
            creeps,
            lastUpdate: Game.time
        });

        return creeps;
    }
}
