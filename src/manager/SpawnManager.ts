import {roomConfig} from "../config";
import {Ant} from "../roles/base/Ant";
import {Jobs} from "../records/Jobs";

export class SpawnManager {

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

        // Prüfe ob bereits ein Request für diesen Job/Raum in der Queue existiert
        const existingIndex = this.queue.findIndex(r =>
            r.jobKey === jobKey &&
            r.targetRoom === targetRoom.name
        );

        const actualPriority = priority !== undefined ? priority :
            this.getSpawnPriority(jobKey, targetRoom);

        if (existingIndex !== -1) {
            if (this.queue[existingIndex].priority < actualPriority) {
                console.log(`🔄 Priorität für ${jobKey} in ${targetRoom.name} aktualisiert: ${this.queue[existingIndex].priority} → ${actualPriority}`);
                this.updatePriority(existingIndex, actualPriority);
            }
            return existingIndex; // Kein neuer Request, bestehender bleibt
        }

        // Nur wenn noch kein Request existiert, einen neuen erstellen
        const request: SpawnRequest = {
            jobKey,
            targetRoom: targetRoom.name,
            bodyParts: bodyParts,
            priority: actualPriority,
            timestamp: Game.time
        };

        this.queue.push(request);
        this.sortQueue();

        console.log(`➕ Neuer Spawn-Request: ${jobKey} für ${targetRoom.name} (Priorität: ${actualPriority})`);
        return this.queue.length - 1;
    }

    public static addToJobQueue(jobType: eJobType, targetRoom: Room, bodyParts: BodyPartConstant[], priority?: number) {
        this.queueCreep(jobType, targetRoom, bodyParts, priority);
    }

    public static updatePriority(index: number, priority: number): boolean {
        if (index >= 0 && index < this.queue.length) {
            this.queue[index].priority = priority;
            this.sortQueue();
            return true;
        }
        return false;
    }

    public static findNeededCreeps() {
        for (const name in roomConfig) {
            const room = Game.rooms[name];
            if (!room) continue;

            for (let jobName in Jobs.jobs) {
                const jobType = jobName as eJobType;

                // Erstelle temporäre Ant-Instanz für spawn() Aufruf
                const tempAnt = this.createTempAnt(jobType, room);
                if (tempAnt) {
                    tempAnt.spawn(room);
                }
            }
        }
    }

    public static getCreepCount(jobType: eJobType, roomName: string): number {
        return _.filter(Game.creeps, c =>
            c.memory.job === jobType &&
            c.memory.homeRoom === roomName
        ).length;
    }

    public static getQueuedCount(jobType: eJobType, roomName: string): number {
        return _.filter(this.queue, req =>
            req.jobKey === jobType &&
            req.targetRoom === roomName
        ).length;
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

                if (req.targetRoom != spawn.room.name) {
                    continue;
                }

                const cost = _.sum(req.bodyParts, part => BODYPART_COST[part]);

                if (spawn.room.energyAvailable < cost) {
                    scoreMatrix[spawnIdx][reqIdx] = Infinity;
                    if (req.priority > 900) {
                        console.log('🚩 Spawn PrioBlock')
                        spawn.room.memory.spawnPrioBlock = true;
                        this.cleanupQueue();
                    }
                    break;
                }

                spawn.room.memory.spawnPrioBlock = false;
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

    static getSpawnPriority(jobType: eJobType, room: Room): number {
        if (jobType === eJobType.miner) {
            const miners = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.miner && c.memory.homeRoom === room.name
            );
            if (miners.length === 0) {
                return 998;
            }
        }

        if (jobType === eJobType.transporter && room.memory.state < eRoomState.phase7) {
            const transporter = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.transporter && c.memory.homeRoom === room.name
            );
            if (transporter.length === 0) {
                return 997;
            }
        }

        if (jobType === eJobType.filler && room.memory.state >= eRoomState.phase5 && room.storage != null) {
            const filler = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.filler && c.memory.homeRoom === room.name
            );
            if (filler.length === 0) {
                return 996;
            }
        }


        return Jobs.jobs[jobType].spawnPrio;
    }

    static processEmergencySpawns(): boolean {
        for (const roomName in roomConfig) {
            const room = Game.rooms[roomName];
            if (!room) continue;

            //2, da Miner und Transporter existieren sollen
            const creeps = _.filter(Game.creeps, c => c.memory.homeRoom === roomName);
            let max = room.memory.state >= eRoomState.phase5 ? 4 : 2;
            console.log(room.name, creeps.length, max);
            if (creeps.length < max) {
                this.queueCreep(eJobType.worker, room, [WORK, CARRY, MOVE], 999);
                return true;
            }
        }
        return false;
    }

    private static createTempAnt(jobType: eJobType, room: Room): Ant<any> | null {
        const def = Jobs.jobs[jobType];
        if (!def) return null;

        const mockCreep = {
            memory: {job: jobType, homeRoom: room.name},
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
            } else {
                let maxEnergy = Game.rooms[req.targetRoom].getMaxAvailableEnergy();
                let cost = req.bodyParts.reduce((totalCost, part) => {
                    return totalCost + BODYPART_COST[part];
                }, 0);

                if (cost > maxEnergy) {
                    console.log(`⚠️ zu teurerer Spawn-Request entfernt: ${req.jobKey}`);
                    return false;
                }
            }

            if (req.bodyParts.length == 0) {
                console.log(`⚠️ Spawn-Request ohne Body entfernt: ${req.jobKey}`);
                return false;
            }


            // Prüfe ob der Request noch benötigt wird - aber nur basierend auf Queue-Duplikaten
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

    // Debug-Methode um den aktuellen Status zu sehen
    public static getStatus(): string {
        let status = "🔍 SpawnManager Status:\n";
        status += `📋 Queue: ${this.queue.length} Requests\n`;

        // Zeige Queue-Inhalt
        if (this.queue.length > 0) {
            status += "\n📝 Queue-Inhalt:\n";
            this.queue.forEach((req, idx) => {
                status += `  ${idx}: ${req.jobKey} → ${req.targetRoom} (Prio: ${req.priority}, Age: ${Game.time - req.timestamp})\n`;
            });
        }

        status += "\n";

        for (const roomName in roomConfig) {
            const room = Game.rooms[roomName];
            if (!room) continue;

            status += `\n📍 ${roomName}:\n`;

            for (let jobName in Jobs.jobs) {
                const jobType = jobName as eJobType;
                const creepCount = this.getCreepCount(jobType, roomName);
                const queuedCount = this.getQueuedCount(jobType, roomName);

                const tempAnt = this.createTempAnt(jobType, room);
                const maxCreeps = tempAnt?.getMaxCreeps ? tempAnt.getMaxCreeps(room) : "?";

                if (creepCount > 0 || queuedCount > 0 || maxCreeps > 0) {
                    const spawningCount = _.filter(Game.creeps, c =>
                        c.memory.job === jobType &&
                        c.memory.homeRoom === roomName &&
                        c.spawning
                    ).length;

                    status += `  ${jobType}: ${creepCount}/${maxCreeps} (${queuedCount} queued, ${spawningCount} spawning)\n`;
                }
            }
        }

        return status;
    }
}