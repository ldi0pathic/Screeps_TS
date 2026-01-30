import {MovementProfiler} from "./MovementProfiler";

export class Movement {
    private static getTargetPos(creep: Creep): RoomPosition | null {
        if (!creep.memory.targetPos) {
            return null;
        }

        return new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );
    }

    /**
     * Erweiterte Bewegungsfunktion mit Pfad-Caching und Stuck-Detection
     */
    static moveByMemory(creep: Creep, target: RoomPosition | _HasRoomPosition, range: number): boolean {
        const startCpu = MovementProfiler.startMeasurement('moveByMemory');

        const targetPos = target instanceof RoomPosition ? target : target.pos;

        // Ziel erreicht?
        if (creep.pos.inRangeTo(targetPos, range)) {
            this.clearMovementMemory(creep);
            MovementProfiler.endMeasurement('moveByMemory', startCpu);
            return false;
        }

        // Stuck-Detection: Wenn zu oft nicht bewegt, neuen Pfad mit ignoreCreeps: false
        if ((creep.memory.dontMove || 0) > 3) {
            console.log(`${creep.name}: Stuck detected, recalculating path`);
            this.calculateNewPath(creep, targetPos, false); // ignoreCreeps: false
            creep.memory.dontMove = 0;
            MovementProfiler.endMeasurement('moveByMemory', startCpu);
            return true;
        }

        // Prüfen ob cached Pfad noch gültig ist
        let serializedPath: string;

        if (this.isPathValid(creep, targetPos)) {
            serializedPath = creep.memory.path!;
        } else {
            // Neuen Pfad berechnen
            this.calculateNewPath(creep, targetPos, false); // ignoreCreeps: true
            serializedPath = creep.memory.path!;
        }

        // Pfad visualisieren (optional)
        if (Game.cpu.bucket > 500) { // Nur wenn genug CPU verfügbar
            this.visualizePath(creep, serializedPath);
        }

        // Bewegung ausführen
        const moveResult = creep.moveByPath(serializedPath);

        // Bewegungsresultat verarbeiten
        this.handleMoveResult(creep, moveResult);

        MovementProfiler.endMeasurement('moveByMemory', startCpu);
        return true;
    }

    private static isPathValid(creep: Creep, targetPos: RoomPosition): boolean {
        if (!creep.memory.path || !creep.memory.targetPos) {
            return false;
        }

        // Prüfe ob der gecachte Pfad noch für das aktuelle Ziel gültig ist
        return creep.memory.targetPos.x === targetPos.x &&
            creep.memory.targetPos.y === targetPos.y &&
            creep.memory.targetPos.roomName === targetPos.roomName;
    }

    private static calculateNewPath(creep: Creep, targetPos: RoomPosition, ignoreCreeps: boolean): void {
        const path = creep.pos.findPathTo(targetPos);

        creep.memory.path = Room.serializePath(path);
        creep.memory.targetPos = {
            x: targetPos.x,
            y: targetPos.y,
            roomName: targetPos.roomName
        };
    }

    private static visualizePath(creep: Creep, serializedPath: string): void {
        const path = Room.deserializePath(serializedPath);
        const currentPos = creep.pos;

        // Finde aktuelle Position im Pfad
        const currentIndex = path.findIndex(pos => pos.x === currentPos.x && pos.y === currentPos.y);

        if (currentIndex >= 0) {
            const visual = new RoomVisual(creep.room.name);
            // Zeige verbleibenden Pfad
            for (let i = currentIndex + 1; i < path.length; i++) {
                visual.circle(path[i].x, path[i].y, {
                    fill: 'transparent',
                    radius: 0.25,
                    stroke: 'red'
                });
            }
        }
    }

    private static handleMoveResult(creep: Creep, moveResult: ScreepsReturnCode): void {
        switch (moveResult) {
            case OK:
            case ERR_TIRED:
                // Prüfe ob Creep sich bewegt hat (Stuck-Detection)
                if (creep.memory.lastPos &&
                    creep.memory.lastPos.x === creep.pos.x &&
                    creep.memory.lastPos.y === creep.pos.y) {
                    creep.memory.dontMove = (creep.memory.dontMove || 0) + 1;
                } else {
                    creep.memory.lastPos = {
                        x: creep.pos.x,
                        y: creep.pos.y
                    };
                    creep.memory.dontMove = 0;
                }
                break;

            case ERR_NOT_FOUND:
            case ERR_INVALID_ARGS:
            case ERR_NO_BODYPART:

                console.log(`${creep.name}: Move error ${moveResult}, clearing path`);
                this.clearMovementMemory(creep);
                break;
        }
    }

    private static clearMovementMemory(creep: Creep): void {
        delete creep.memory.path;
        delete creep.memory.dontMove;
        delete creep.memory.lastPos;
        creep.memory.moving = false;
        creep.memory.targetPos = undefined;
    }

    static shouldContinueMoving(creep: Creep): boolean {
        const startCpu = MovementProfiler.startMeasurement('shouldContinueMoving');

        if (!creep.memory.moving || !creep.memory.targetPos) {
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }

        const targetPos = this.getTargetPos(creep);
        if (!targetPos) {
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }

        if (creep.pos.isNearTo(targetPos)) {
            this.clearMovementMemory(creep);
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }

        MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
        return true;
    }

    static continueMoving(creep: Creep): ScreepsReturnCode {
        const startCpu = MovementProfiler.startMeasurement('continueMoving');

        const targetPos = this.getTargetPos(creep);
        if (!targetPos) {
            MovementProfiler.endMeasurement('continueMoving', startCpu);
            return ERR_INVALID_TARGET;
        }

        // Verwende moveByMemory für bessere Performance
        const isMoving = this.moveByMemory(creep, targetPos, 1);
        MovementProfiler.endMeasurement('continueMoving', startCpu);

        return isMoving ? OK : ERR_INVALID_TARGET;
    }

    static moveToRoom(creep: Creep, targetRoomName: string): ScreepsReturnCode {
        const startCpu = MovementProfiler.startMeasurement('moveToRoom');
        // Wenn wir schon im Zielraum sind, nichts tun
        if (creep.room.name === targetRoomName) {
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return OK;
        }
        if (!creep.memory.moving || !creep.memory.targetPos) {
            const route = Game.map.findRoute(creep.room.name, targetRoomName);
            if (route === ERR_NO_PATH || !route.length) return ERR_NO_PATH;

            const nextRoom = route[0].room;
            const exitDir = creep.room.findExitTo(nextRoom);

            if (exitDir != ERR_NO_PATH && exitDir != ERR_INVALID_ARGS) {
                const exitPos = creep.pos.findClosestByPath(exitDir);

                if (!exitPos) return ERR_NO_PATH;

                creep.memory.targetPos = {
                    x: exitPos.x,
                    y: exitPos.y,
                    roomName: exitPos.roomName
                };
            }
        }

        // Bewegung ausführen
        this.moveByMemory(creep, this.getTargetPos(creep)!, 0);
        MovementProfiler.endMeasurement('moveToRoom', startCpu);
        return OK;
    }
}