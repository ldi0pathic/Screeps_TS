import {JobsController} from "./JobsController";
import {roomConfig} from "../config";
import {Ant} from "../roles/base/Ant";
import {Jobs} from "../records/Jobs";

export class SpawnController {

    private static get queue(): SpawnRequest[] {
        if (!Memory.spawnQueue) Memory.spawnQueue = [];
        return Memory.spawnQueue;
    }

    private static set queue(value: SpawnRequest[]) {
        Memory.spawnQueue = value;
    }

    public static queueCreep(jobKey: eJobType, targetRoom: Room, bodyParts: BodyPartConstant[], priority?: number): number {
        const def = Jobs.jobs[jobKey];
        if (!def) return -1;

        const actualPriority = priority !== undefined ? priority :
            this.getSpawnPriority(jobKey, targetRoom);

        const request: SpawnRequest = {
            jobKey,
            targetRoom: targetRoom.name,
            bodyParts: bodyParts,
            priority: actualPriority,
            timestamp: Game.time
        };

        const index = this.queue.findIndex(r =>
            r.jobKey === request.jobKey &&
            r.targetRoom === request.targetRoom
        );

        if (index === -1) {
            this.queue.push(request);
        } else {
            let prio = this.queue[index].priority
            if (request.priority != prio) {
                this.updatePriority(index, request.priority)
            }
        }

        this.sortQueue();
        return this.queue.length - 1;
    }

    public static addToJobQueue(jobType: eJobType, targetRoom: Room, bodyParts: BodyPartConstant[], priority?: number) {
        this.queueCreep(jobType, targetRoom, bodyParts, priority);
    }

    public static cancelSpawnRequest(index: number): boolean {
        if (index >= 0 && index < this.queue.length) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    }

    public static updatePriority(index: number, priority: number): boolean {
        if (index >= 0 && index < this.queue.length) {
            this.queue[index].priority = priority;
            this.sortQueue();
            return true;
        }
        return false;
    }

    public static getQueue(): SpawnRequest[] {
        return [...this.queue];
    }

    // GEÄNDERT: Neue Methode um Ant-Instanzen temporär zu erstellen
    public static findNeededCreeps() {
        for (const name in roomConfig) {
            const room = Game.rooms[name];
            if (!room) continue;

            for (let jobName in Jobs.jobs) {
                // Erstelle temporäre Ant-Instanz für spawn() Aufruf
                const tempAnt = this.createTempAnt(jobName as eJobType, room);
                if (tempAnt) {
                    tempAnt.spawn(room);
                }
            }
        }
    }

    public static processSpawns() {
        this.cleanupQueue();
        this.sortQueue();

        if (this.queue.length === 0) return;

        const availableSpawns: StructureSpawn[] = [];
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            if (!spawn.spawning) {
                availableSpawns.push(spawn);
            }
        }

        if (availableSpawns.length === 0) return;

        const scoreMatrix: number[][] = [];
        const validCombinations: { spawnIdx: number, reqIdx: number, score: number }[] = [];

        for (let spawnIdx = 0; spawnIdx < availableSpawns.length; spawnIdx++) {
            const spawn = availableSpawns[spawnIdx];
            scoreMatrix[spawnIdx] = [];

            for (let reqIdx = 0; reqIdx < this.queue.length; reqIdx++) {
                const req = this.queue[reqIdx];

                const cost = _.sum(req.bodyParts, part => BODYPART_COST[part]);

                if (spawn.room.energyAvailable < cost) {
                    scoreMatrix[spawnIdx][reqIdx] = Infinity;
                    continue;
                }

                const dist = Game.map.getRoomLinearDistance(spawn.room.name, req.targetRoom);
                const score = (1000 - req.priority) * 100 + dist * 10;

                scoreMatrix[spawnIdx][reqIdx] = score;

                validCombinations.push({
                    spawnIdx,
                    reqIdx,
                    score
                });
            }
        }

        validCombinations.sort((a, b) => a.score - b.score);

        const usedSpawns = new Set<number>();
        const usedRequests = new Set<number>();
        let spawnedCount = 0;

        for (const combo of validCombinations) {
            if (usedSpawns.has(combo.spawnIdx) || usedRequests.has(combo.reqIdx) ||
                combo.score === Infinity) {
                continue;
            }

            const spawn = availableSpawns[combo.spawnIdx];
            const req = this.queue[combo.reqIdx];

            if (this.spawnCreep(spawn, req)) {
                usedSpawns.add(combo.spawnIdx);
                usedRequests.add(combo.reqIdx);
                spawnedCount++;
            }
        }

        this.queue = this.queue.filter((_, index) => !usedRequests.has(index));

        if (spawnedCount > 0) {
            console.log(`🛠️ Es wurden ${spawnedCount} Creeps in diesem Tick gespawnt.`);
        }
    }

    // GEÄNDERT: Parameter von Ant<any> zu eJobType geändert
    static getSpawnPriority(jobType: eJobType, room: Room): number {
        if (jobType === eJobType.miner) {
            const miners = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.miner && c.memory.workroom === room.name
            );
            if (miners.length === 0 && room.energyAvailable > 200) {
                return 100;
            }
        }

        return JobsController.getDynamicPriority(jobType, room) + 10;
    }

    static processEmergencySpawns(): boolean {
        for (const roomName in roomConfig) {
            const room = Game.rooms[roomName];
            if (!room) continue;

            const creeps = _.filter(Game.creeps, c => c.memory.workroom === roomName);
            if (creeps.length === 0) {
                this.queueCreep(eJobType.miner, room, [WORK, CARRY, MOVE], 999);
                return true;
            }
        }
        return false;
    }

    public static getQueueStatus(): void {
        if (Game.time % 50 !== 0) return; // Nur alle 50 Ticks
        
        if (this.queue.length === 0) {
            console.log("🟢 Spawn Queue: Leer");
            return;
        }

        console.log(`📋 Spawn Queue (${this.queue.length}):`);
        this.queue.slice(0, 5).forEach((req, i) => {
            console.log(`  ${i + 1}. ${req.jobKey} → ${req.targetRoom} (P:${req.priority})`);
        });

        if (this.queue.length > 5) {
            console.log(`  ... und ${this.queue.length - 5} weitere`);
        }
    }

    // GEÄNDERT: Hilfsmethode für temporäre Ant-Erstellung
    private static createTempAnt(jobType: eJobType, room: Room): Ant<any> | null {
        const def = Jobs.jobs[jobType];
        if (!def) return null;

        // Erstelle einen Mock-Creep für die temporäre Ant-Instanz
        const mockCreep = {
            memory: {job: jobType, workroom: room.name},
            room: room
        } as Creep;

        return new def.antClass(mockCreep);
    }

    private static sortQueue(): void {
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
        });
    }

    private static cleanupQueue(): void {
        const seen = new Set<string>();

        this.queue = this.queue.filter(req => {
            if (!Jobs.jobs[req.jobKey]) {
                console.log(`⚠️ Ungültigen Job aus Queue entfernt: ${req.jobKey}`);
                return false;
            }

            if (!Game.rooms[req.targetRoom]) {
                console.log(`⚠️ Spawn-Request für nicht verfügbaren Raum entfernt: ${req.targetRoom}`);
                return false;
            }

            const key = `${req.jobKey}|${req.targetRoom}`;

            if (seen.has(key)) {
                console.log(`⚠️ Doppelter Spawn-Request entfernt: ${key}`);
                return false;
            }

            seen.add(key);
            return true;
        });
    }

    private static spawnCreep(spawn: StructureSpawn, request: SpawnRequest): boolean {
        const def = Jobs.jobs[request.jobKey];
        if (!def) return false;

        const cost = _.sum(request.bodyParts, part => BODYPART_COST[part]);
        if (spawn.room.energyAvailable < cost) return false;

        // GEÄNDERT: Erstelle temporäre Ant-Instanz für createSpawnMemory
        const tempAnt = this.createTempAnt(request.jobKey, Game.rooms[request.targetRoom]);
        if (!tempAnt) return false;

        const name = this.getName(request);
        const memory = tempAnt.createSpawnMemory(spawn, request.targetRoom);

        if (spawn.spawnCreep(request.bodyParts, name, {dryRun: true}) === OK) {
            if (spawn.spawnCreep(request.bodyParts, name, {memory: memory}) === OK) {
                console.log(`✅ Gespawned ${name} in ${spawn.room.name} → ${request.targetRoom} (Priorität: ${request.priority})`);
                return true;
            }
        }

        return false;
    }

    private static trySpawnAt(spawn: StructureSpawn): boolean {
        for (let i = 0; i < this.queue.length; i++) {
            const req = this.queue[i];
            if (this.spawnCreep(spawn, req)) {
                this.queue.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    private static getName(request: SpawnRequest): string {
        let count = 0;
        let roomName = request.targetRoom;
        let name = `${request.jobKey}@${roomName}#${count}`;

        while (Game.creeps[name]) {
            count++;
            name = `${request.jobKey}@${roomName}#${count}`;

            if (count > 999) {
                name = `${request.jobKey}@${roomName}#${Game.time}`;
                break;
            }
        }

        return name;
    }
}
