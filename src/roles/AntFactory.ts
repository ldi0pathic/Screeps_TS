import {Ant} from "./base/Ant";

export class AntFactory {
    private static instanceCache: Map<string, Ant<any>> = new Map();

    /**
     * Gibt eine Ant-Instanz für den Bedarfs-Check (Spawn-Check) zurück.
     * Nutzt Caching, um redundante Instanziierungen pro Tick zu vermeiden.
     */
    public static getAntForSpawnCheck(jobType: eJobType, spawnRoom: Room, workRoomName: string): Ant<any> | null {
        const cacheKey = `spawn_${jobType}_${spawnRoom.name}_${workRoomName}`;

        if (this.instanceCache.has(cacheKey)) {
            return this.instanceCache.get(cacheKey)!;
        }

        const {Jobs} = require("../records/Jobs");
        const def = Jobs.jobs[jobType];
        if (!def) return null;

        // Mock-Creep für die Instanziierung
        const mockCreep = {
            memory: {job: jobType, workRoom: workRoomName, spawnRoom: spawnRoom.name},
            room: spawnRoom
        } as Creep;

        const ant = new def.antClass(mockCreep);
        this.instanceCache.set(cacheKey, ant);
        return ant;
    }

    /**
     * Erstellt eine frische Ant-Instanz für einen existierenden Creep.
     * Diese wird i.d.R. im JobsManager pro Creep pro Tick aufgerufen.
     */
    public static createAntForCreep(creep: Creep): Ant<any> | null {
        const {Jobs} = require("../records/Jobs");
        return Jobs.createAnt(creep.memory.job, creep);
    }

    /**
     * Bereinigt den Cache. Sollte am Anfang jedes Ticks aufgerufen werden.
     */
    public static clearCache(): void {
        this.instanceCache.clear();
    }
}
