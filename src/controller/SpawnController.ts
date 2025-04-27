import {JobsController} from "./JobsController";
import {Ant} from "../roles/Ant";
import {roomConfig} from "../config";

interface SpawnRequest {
    jobKey: string;
    targetRoom: Room;
    bodyParts: BodyPartConstant[];
    priority: number; // Priorität (höhere Werte = höhere Priorität)
    timestamp: number; // Zeitstempel für FIFO bei gleicher Priorität
}

export class SpawnController {
    private static queue: SpawnRequest[] = [];

    /**
     * Fügt eine Spawn-Anfrage mit angegebener Priorität zur Queue hinzu
     * @param jobKey - Schlüssel des Jobs
     * @param targetRoom - Zielraum für den Creep
     * @param priority - Priorität (höher = wichtiger), Standard: Job-Standardpriorität
     * @param bodyParts - Optionale benutzerdefinierte Körperteile
     * @returns Die ID der Spawn-Anfrage
     */
    public static queueCreep(
        jobKey: string,
        targetRoom: Room,
        priority?: number,
        bodyParts?: BodyPartConstant[]
    ): number {
        const def = JobsController.jobs[jobKey];
        if (!def) return -1;

        const body = bodyParts || def.ant.getProfil();
        const actualPriority = priority !== undefined ? priority : def.spawnPrio;

        const request: SpawnRequest = {
            jobKey,
            targetRoom,
            bodyParts: body,
            priority: actualPriority,
            timestamp: Game.time
        };

        this.queue.push(request);

        // Queue nach Priorität sortieren (höhere Werte zuerst)
        this.sortQueue();

        return this.queue.length - 1; // Rückgabe der Position in der Queue als ID
    }

    /**
     * Alias für queueCreep für Kompatibilität mit altem Code
     */
    public static addToJobQueue(jobKey: string, targetRoom: Room, priority?: number) {
        this.queueCreep(jobKey, targetRoom, priority);
    }

    /**
     * Entfernt eine Spawn-Anfrage aus der Queue
     * @param index - Index der zu entfernenden Anfrage
     * @returns true wenn erfolgreich, false wenn Index ungültig
     */
    public static cancelSpawnRequest(index: number): boolean {
        if (index >= 0 && index < this.queue.length) {
            this.queue.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Ändert die Priorität einer Spawn-Anfrage
     * @param index - Index der Anfrage
     * @param priority - Neue Priorität
     * @returns true wenn erfolgreich, false wenn Index ungültig
     */
    public static updatePriority(index: number, priority: number): boolean {
        if (index >= 0 && index < this.queue.length) {
            this.queue[index].priority = priority;
            this.sortQueue();
            return true;
        }
        return false;
    }

    /**
     * Sortiert die Queue nach Priorität (höhere Werte zuerst)
     * Bei gleicher Priorität wird nach Timestamp sortiert (FIFO)
     */
    private static sortQueue(): void {
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Höhere Priorität zuerst
            }
            return a.timestamp - b.timestamp; // Bei gleicher Priorität: ältere zuerst
        });
    }

    /**
     * Gibt die aktuelle Spawn-Queue zurück
     * @returns Kopie der aktuellen Queue
     */
    public static getQueue(): SpawnRequest[] {
        return [...this.queue];
    }

    public static findNeededCreeps() {
        for (const name in roomConfig) {
            const room = Game.rooms[name];

            for (let jobName in JobsController.jobs) {
                let job: Ant = JobsController.jobs[jobName].ant;
                job.spawn(room);
            }
        }
    }

    /**
     * Verarbeitet alle Spawn-Anfragen und weist den optimalen Spawn für jede Anfrage zu
     */
    public static processSpawns() {
        // Bereinige die Queue und entferne ungültige Jobs
        this.cleanupQueue();

        // Sortiere Queue nach Priorität
        this.sortQueue();

        // Wenn die Queue leer ist, gibt es nichts zu tun
        if (this.queue.length === 0) return;

        // Sammle alle verfügbaren Spawns
        const availableSpawns: StructureSpawn[] = [];
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            if (!spawn.spawning) {
                availableSpawns.push(spawn);
            }
        }

        if (availableSpawns.length === 0) return;

        // Erstelle eine Matrix mit Bewertungen für jede Spawn-Anfrage-Kombination
        // [spawnIndex][requestIndex] = Bewertung (niedrigere Werte = bessere Eignung)
        const scoreMatrix: number[][] = [];
        const validCombinations: { spawnIdx: number, reqIdx: number, score: number }[] = [];

        // Für jeden Spawn
        for (let spawnIdx = 0; spawnIdx < availableSpawns.length; spawnIdx++) {
            const spawn = availableSpawns[spawnIdx];
            scoreMatrix[spawnIdx] = [];

            // Für jede Anfrage
            for (let reqIdx = 0; reqIdx < this.queue.length; reqIdx++) {
                const req = this.queue[reqIdx];
                const def = JobsController.jobs[req.jobKey];

                // Berechne die Kosten des Creeps
                const cost = _.sum(req.bodyParts, part => BODYPART_COST[part]);

                // Prüfe, ob dieser Spawn den Creep bauen kann
                if (spawn.room.energyAvailable < cost) {
                    // Nicht genug Energie - sehr hohe Bewertung (= schlechte Eignung)
                    scoreMatrix[spawnIdx][reqIdx] = Infinity;
                    continue;
                }

                // Berechne die Entfernung zwischen Spawn und Zielraum
                const dist = Game.map.getRoomLinearDistance(spawn.room.name, req.targetRoom.name);

                // Bewertung berechnen:
                // - Höhere Priorität = bessere Bewertung (= niedrigerer Wert)
                // - Kürzere Entfernung = bessere Bewertung
                // - Priorität hat mehr Gewicht als Entfernung
                const score = (1000 - req.priority) * 100 + dist * 10;

                scoreMatrix[spawnIdx][reqIdx] = score;

                // Speichere gültige Kombinationen für spätere Sortierung
                validCombinations.push({
                    spawnIdx,
                    reqIdx,
                    score
                });
            }
        }

        // Sortiere die gültigen Kombinationen nach Bewertung (niedrigste zuerst)
        validCombinations.sort((a, b) => a.score - b.score);

        // Verfolge, welche Spawns und Anfragen bereits verwendet wurden
        const usedSpawns = new Set<number>();
        const usedRequests = new Set<number>();
        let spawnedCount = 0;

        // Weise die besten Kombinationen zu
        for (const combo of validCombinations) {
            // Überspringe, wenn dieser Spawn oder diese Anfrage bereits verwendet wurde
            if (usedSpawns.has(combo.spawnIdx) || usedRequests.has(combo.reqIdx) ||
                combo.score === Infinity) {
                continue;
            }

            const spawn = availableSpawns[combo.spawnIdx];
            const req = this.queue[combo.reqIdx];

            // Versuche zu spawnen
            if (this.spawnCreep(spawn, req)) {
                // Markiere als verwendet
                usedSpawns.add(combo.spawnIdx);
                usedRequests.add(combo.reqIdx);
                spawnedCount++;
            }
        }

        // Entferne die erfolgreich gespawnten Anfragen aus der Queue
        this.queue = this.queue.filter((_, index) => !usedRequests.has(index));

        if (spawnedCount > 0) {
            console.log(`🛠️ Es wurden ${spawnedCount} Creeps in diesem Tick gespawnt.`);
        }
    }

    /**
     * Bereinigt die Queue und entfernt ungültige Jobs
     */
    private static cleanupQueue(): void {
        for (let i = 0; i < this.queue.length; i++) {
            if (!JobsController.jobs[this.queue[i].jobKey]) {
                this.queue.splice(i, 1);
                i--;
            }
        }
    }

    /**
     * Versucht, einen Creep mit dem gegebenen Spawn zu erzeugen
     * @param spawn - Der zu verwendende Spawn
     * @param request - Die Spawn-Anfrage
     * @returns true wenn erfolgreich, sonst false
     */
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

    /**
     * Versucht, einen Creep mit dem angegebenen Spawn zu erzeugen (ältere Methode)
     * @param spawn - Der zu verwendende Spawn
     * @returns true wenn erfolgreich, sonst false
     */
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
        }

        return name;
    }
}