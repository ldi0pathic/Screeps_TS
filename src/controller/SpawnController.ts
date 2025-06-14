import {JobsController} from "./JobsController";
import {roomConfig} from "../config";
import {Ant} from "../roles/Ant";

export class SpawnController {

    private static get queue(): SpawnRequest[] {
        if (!Memory.spawnQueue) Memory.spawnQueue = [];
        return Memory.spawnQueue;
    }

    private static set queue(value: SpawnRequest[]) {
        Memory.spawnQueue = value;
    }

    public static queueCreep(jobKey: eJobType, targetRoom: Room, priority?: number, bodyParts?: BodyPartConstant[]): number {
        const def = JobsController.jobs[jobKey];
        if (!def) return -1;

        const body = bodyParts || def.ant.getProfil();

        const actualPriority = priority !== undefined ? priority :
            this.getSpawnPriority(def.ant, targetRoom);

        const request: SpawnRequest = {
            jobKey,
            targetRoom,
            bodyParts: body,
            priority: actualPriority,
            timestamp: Game.time
        };

        this.queue.push(request);
        this.sortQueue();

        return this.queue.length - 1;
    }

    public static addToJobQueue(jobType: eJobType, targetRoom: Room, priority?: number) {
        this.queueCreep(jobType, targetRoom, priority);
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

    public static findNeededCreeps() {
        for (const name in roomConfig) {
            const room = Game.rooms[name];
            if (!room) continue;

            for (let jobName in JobsController.jobs) {
                let job: Ant = JobsController.jobs[jobName].ant;
                job.spawn(room);
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
                const def = JobsController.jobs[req.jobKey];

                const cost = _.sum(req.bodyParts, part => BODYPART_COST[part]);

                if (spawn.room.energyAvailable < cost) {
                    scoreMatrix[spawnIdx][reqIdx] = Infinity;
                    continue;
                }

                const dist = Game.map.getRoomLinearDistance(spawn.room.name, req.targetRoom.name);
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

        // 🔥 FIX: Verwende setter statt direkte Zuweisung
        this.queue = this.queue.filter((_, index) => !usedRequests.has(index));

        if (spawnedCount > 0) {
            console.log(`🛠️ Es wurden ${spawnedCount} Creeps in diesem Tick gespawnt.`);
        }
    }

    static getSpawnPriority(ant: Ant, room: Room): number {
        const jobType = ant.getJob();

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
            if (creeps.length === 0 && room.energyAvailable >= 200) {
                this.queueCreep(eJobType.miner, room, 999);
                return true;
            }
        }
        return false;
    }

    public static getQueueStatus(): void {
        if (this.queue.length === 0) {
            console.log("🟢 Spawn Queue: Leer");
            return;
        }

        console.log(`📋 Spawn Queue (${this.queue.length}):`);
        this.queue.slice(0, 5).forEach((req, i) => {
            console.log(`  ${i + 1}. ${req.jobKey} → ${req.targetRoom.name} (P:${req.priority})`);
        });

        if (this.queue.length > 5) {
            console.log(`  ... und ${this.queue.length - 5} weitere`);
        }
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
        // 🔥 FIX: Verwende setter statt direkte Zuweisung
        this.queue = this.queue.filter(req => {
            if (!JobsController.jobs[req.jobKey]) {
                console.log(`⚠️ Ungültigen Job aus Queue entfernt: ${req.jobKey}`);
                return false;
            }

            if (!Game.rooms[req.targetRoom.name]) {
                console.log(`⚠️ Spawn-Request für nicht verfügbaren Raum entfernt: ${req.targetRoom.name}`);
                return false;
            }

            return true;
        });
    }

    private static spawnCreep(spawn: StructureSpawn, request: SpawnRequest): boolean {
        const def = JobsController.jobs[request.jobKey];
        if (!def) return false;

        const cost = _.sum(request.bodyParts, part => BODYPART_COST[part]);
        if (spawn.room.energyAvailable < cost) return false;

        const spawnAnt = def.ant;
        const name = this.getName(request);
        const options = spawnAnt.getSpawnOptions(spawn, request.targetRoom);

        if (spawn.spawnCreep(request.bodyParts, name, {dryRun: true}) === OK) {
            if (spawn.spawnCreep(request.bodyParts, name, options) === OK) {
                console.log(`✅ Gespawned ${name} in ${spawn.room.name} → ${request.targetRoom.name} (Priorität: ${request.priority})`);
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
        let roomName = request.targetRoom.name;
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