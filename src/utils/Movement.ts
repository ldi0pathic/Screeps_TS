export class Movement {
    static moveTo(creep: Creep, target: RoomPosition | _HasRoomPosition, opts?: MoveToOpts): ScreepsReturnCode {
        creep.memory.moving = true;

        // Zielposition bestimmen
        let targetPos: RoomPosition;
        if (target instanceof RoomPosition) {
            targetPos = target;
        } else {
            targetPos = target.pos;
        }

        // Ziel im Memory speichern
        creep.memory.targetPos = {
            x: targetPos.x,
            y: targetPos.y,
            roomName: targetPos.roomName
        };

        // Pfad mit PathFinder berechnen
        const pathResult = PathFinder.search(creep.pos, {pos: targetPos, range: 1});

        if (pathResult.incomplete) {
            console.log(`Unvollständiger Pfad für ${creep.name} zu ${targetPos}`);
            return ERR_NO_PATH;
        }

        // Pfad zu Richtungsarray konvertieren
        const directions: DirectionConstant[] = [];
        let currentPos = creep.pos;

        for (const step of pathResult.path) {
            const direction = currentPos.getDirectionTo(step.x, step.y);
            directions.push(direction);
            currentPos = new RoomPosition(step.x, step.y, step.roomName);
        }

        creep.memory.cachedDirections = directions;
        creep.memory.pathIndex = 0;

        return this.executeNextMove(creep);
    }

    static executeNextMove(creep: Creep): ScreepsReturnCode {
        if (!creep.memory.cachedDirections || creep.memory.pathIndex === undefined) {
            return ERR_INVALID_TARGET;
        }

        if (creep.memory.pathIndex >= creep.memory.cachedDirections.length) {
            // Pfad abgeschlossen
            this.clearMovement(creep);
            return OK;
        }

        const direction = creep.memory.cachedDirections[creep.memory.pathIndex];
        const moveResult = creep.move(direction);

        if (moveResult === OK) {
            creep.memory.pathIndex++;
        }

        return moveResult;
    }

    static shouldContinueMoving(creep: Creep): boolean {
        if (!creep.memory.moving || !creep.memory.targetPos || !creep.memory.cachedDirections) {
            return false;
        }

        // Prüfen ob Pfad bereits abgearbeitet
        if (creep.memory.pathIndex !== undefined && creep.memory.pathIndex >= creep.memory.cachedDirections.length) {
            this.clearMovement(creep);
            return false;
        }

        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        if (creep.pos.isNearTo(targetPos)) {
            this.clearMovement(creep);
            return false;
        }

        return true;
    }

    static continueMoving(creep: Creep): ScreepsReturnCode {
        return this.executeNextMove(creep);
    }

    static clearMovement(creep: Creep): void {
        creep.memory.moving = false;
        creep.memory.targetPos = undefined;
        creep.memory.cachedDirections = undefined;
        creep.memory.pathIndex = undefined;
    }

    static moveToRoom(creep: Creep, targetRoomName: string): ScreepsReturnCode {
        if (creep.room.name === targetRoomName) {
            return OK;
        }

        const route = Game.map.findRoute(creep.room.name, targetRoomName);
        if (route === ERR_NO_PATH) {
            console.log(`Kein Pfad zu ${targetRoomName} von ${creep.room.name} gefunden`);
            return ERR_NO_PATH;
        }

        const nextRoom = route[0];
        const exit = creep.room.findExitTo(nextRoom.room);
        if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
            return ERR_NO_PATH;
        }

        const exitPos = creep.pos.findClosestByRange(exit);
        if (!exitPos) {
            return ERR_NO_PATH;
        }

        return this.moveTo(creep, exitPos);
    }
}