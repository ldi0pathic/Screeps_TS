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

        return creep.moveTo(target, opts);
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

        return creep.moveTo(targetPos);
    }
}