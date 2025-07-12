export class Movement {
    static moveTo(creep: Creep, target: RoomPosition | _HasRoomPosition, opts?: MoveToOpts): ScreepsReturnCode {
        creep.memory.moving = true;

        if (target instanceof RoomPosition) {
            creep.memory.targetPos = {
                x: target.x,
                y: target.y,
                roomName: target.roomName
            };
        } else {
            creep.memory.targetPos = {
                x: target.pos.x,
                y: target.pos.y,
                roomName: target.pos.roomName
            };
        }

        if (!opts) {
            opts = {reusePath: 10}
        }

        return creep.moveTo(target, opts);
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

    static shouldContinueMoving(creep: Creep): boolean {
        if (!creep.memory.moving || !creep.memory.targetPos) {
            return false;
        }

        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        if (creep.pos.isNearTo(targetPos)) {
            creep.memory.moving = false;
            creep.memory.targetPos = undefined;
            return false;
        }

        return true;
    }

    static continueMoving(creep: Creep): ScreepsReturnCode {
        if (!creep.memory.targetPos) {
            return ERR_INVALID_TARGET;
        }

        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        return creep.moveTo(targetPos, {reusePath: 10});
    }
}