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

    public static queueCreep(jobKey: eJobType, spawnRoom: Room, workRoom: string, bodyParts: BodyPartConstant[], priority?: number): number {
        const def = Jobs.jobs[jobKey];
        if (!def) return -1;

        // Prüfe ob bereits ein Request für diesen Job/Raum in der Queue existiert
        const existingIndex = this.queue.findIndex(r =>
            r.jobKey === jobKey &&
            r.workroom === workRoom);

        const actualPriority = priority !== undefined ? priority :
            this.getSpawnPriority(jobKey, workRoom);

        if (existingIndex !== -1) {
            if (this.queue[existingIndex].priority < actualPriority) {
                console.log(`🔄 Priorität für ${jobKey} in ${spawnRoom.name} aktualisiert: ${this.queue[existingIndex].priority} → ${actualPriority}`);
                this.updatePriority(existingIndex, actualPriority);
            }
            return existingIndex; // Kein neuer Request, bestehender bleibt
        }

        // Nur wenn noch kein Request existiert, einen neuen erstellen
        const request: SpawnRequest = {
            jobKey,
            workroom: workRoom,
            spawnRoom: spawnRoom.name,
            bodyParts: bodyParts,
            priority: actualPriority,
            timestamp: Game.time
        };

        this.queue.push(request);
        this.sortQueue();

        console.log(`➕ Neuer Spawn-Request: ${jobKey} für ${workRoom} in ${spawnRoom.name} (Priorität: ${actualPriority})`);
        return this.queue.length - 1;
    }

    public static addToJobQueue(jobType: eJobType, spawnRoom: Room, workRoom: string, bodyParts: BodyPartConstant[], priority?: number) {
        this.queueCreep(jobType, spawnRoom, workRoom, bodyParts, priority);
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
            let spawnRoom: Room | undefined;

            if (roomConfig[name].spawnRoom != undefined) {
                spawnRoom = Game.rooms[roomConfig[name].spawnRoom!];
            } else {
                spawnRoom = Game.rooms[name];
            }
            if (!spawnRoom) continue;

            for (let jobName in Jobs.jobs) {
                const jobType = jobName as eJobType;

                // Erstelle temporäre Ant-Instanz für spawn() Aufruf
                const tempAnt = this.createTempAnt(jobType, spawnRoom, name);
                if (tempAnt) {

                    tempAnt.spawn(spawnRoom, name);
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

                if (req.spawnRoom != spawn.room.name) {
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

                const score = req.priority

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

    static getSpawnPriority(jobType: eJobType, workRoom: string): number {
        if (jobType === eJobType.miner) {
            const miners = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.miner && c.memory.workRoom === workRoom
            );
            if (miners.length === 0) {
                return 998;
            }
        }

        if (jobType === eJobType.transporter && Memory.rooms[workRoom].state < eRoomState.phase7) {
            const transporter = _.filter(Game.creeps, c =>
                c.memory.job === eJobType.transporter && c.memory.workRoom === workRoom
            );
            if (transporter.length === 0) {
                return 997;
            }
        }

        let room = Game.rooms[workRoom];
        if (room) {
            if (jobType === eJobType.filler && room.memory.state >= eRoomState.phase5 && room.storage != null) {
                const filler = _.filter(Game.creeps, c =>
                    c.memory.job === eJobType.filler && c.memory.workRoom === workRoom
                );
                if (filler.length === 0) {
                    return 996;
                }
            }
        }


        return Jobs.jobs[jobType].spawnPrio;
    }

    static processEmergencySpawns(): boolean {
        for (const roomName in roomConfig) {

            if (roomConfig[roomName].spawnRoom != undefined) continue;

            const room = Game.rooms[roomName];
            if (!room) continue;

            //2, da Miner und Transporter existieren sollen
            const creeps = _.filter(Game.creeps, c => c.memory.workRoom === roomName);
            let max = room.memory.state >= eRoomState.phase5 ? 4 : 2;

            if (creeps.length < max) {
                this.queueCreep(eJobType.worker, room, room.name, [WORK, CARRY, MOVE], 999);
                return true;
            }
        }
        return false;
    }

    private static createTempAnt(jobType: eJobType, spawnRoom: Room, workRoom: string): Ant<any> | null {
        const def = Jobs.jobs[jobType];
        if (!def) return null;

        const mockCreep = {
            memory: {job: jobType, workRoom: workRoom, spawnRoom: spawnRoom.name},
            room: spawnRoom
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

            if (!Game.rooms[req.spawnRoom]) {
                console.log(`⚠️ Spawn-Request für nicht verfügbaren Raum entfernt: ${req.spawnRoom}`);
                return false;
            } else {
                let maxEnergy = Game.rooms[req.spawnRoom].getMaxAvailableEnergy();
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
            const key = `${req.jobKey}|${req.workroom}`;

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

        const tempAnt = this.createTempAnt(request.jobKey, spawn.room, request.workroom);
        if (!tempAnt) return false;

        const name = this.getName(request);
        const memory = tempAnt.createSpawnMemory(spawn, request.workroom);

        if (spawn.spawnCreep(request.bodyParts, name, {dryRun: true}) === OK) {
            if (spawn.spawnCreep(request.bodyParts, name, {memory: memory}) === OK) {
                console.log(`✅ Gespawned ${name} in ${spawn.room.name} → ${request.workroom} (Priorität: ${request.priority})`);
                return true;
            }
        }

        return false;
    }

    private static getName(request: SpawnRequest): string {
        let count = 0;
        let roomName = request.workroom;
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