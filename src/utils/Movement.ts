import {MovementProfiler} from "./MovementProfiler";

export class Movement {
    static moveTo(creep: Creep, target: RoomPosition | _HasRoomPosition, opts?: MoveToOpts): ScreepsReturnCode {
        const startCpu = MovementProfiler.startMeasurement('moveTo');

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

        const result = creep.moveTo(target, opts);
        MovementProfiler.endMeasurement('moveTo', startCpu);
        return result;
    }

    static moveToRoom(creep: Creep, targetRoomName: string): ScreepsReturnCode {
        const startCpu = MovementProfiler.startMeasurement('moveToRoom');

        if (creep.room.name === targetRoomName) {
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return OK;
        }

        const route = Game.map.findRoute(creep.room.name, targetRoomName);
        if (route === ERR_NO_PATH) {
            console.log(`Kein Pfad zu ${targetRoomName} von ${creep.room.name} gefunden`);
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return ERR_NO_PATH;
        }

        const nextRoom = route[0];
        const exit = creep.room.findExitTo(nextRoom.room);
        if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return ERR_NO_PATH;
        }

        const exitPos = creep.pos.findClosestByRange(exit);
        if (!exitPos) {
            MovementProfiler.endMeasurement('moveToRoom', startCpu);
            return ERR_NO_PATH;
        }

        const result = this.moveTo(creep, exitPos);
        MovementProfiler.endMeasurement('moveToRoom', startCpu);
        return result;
    }

    static shouldContinueMoving(creep: Creep): boolean {
        const startCpu = MovementProfiler.startMeasurement('shouldContinueMoving');

        if (!creep.memory.moving || !creep.memory.targetPos) {
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
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
            MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
            return false;
        }

        MovementProfiler.endMeasurement('shouldContinueMoving', startCpu);
        return true;
    }

    static continueMoving(creep: Creep): ScreepsReturnCode {
        const startCpu = MovementProfiler.startMeasurement('continueMoving');

        if (!creep.memory.targetPos) {
            MovementProfiler.endMeasurement('continueMoving', startCpu);
            return ERR_INVALID_TARGET;
        }

        const targetPos = new RoomPosition(
            creep.memory.targetPos.x,
            creep.memory.targetPos.y,
            creep.memory.targetPos.roomName
        );

        const result = creep.moveTo(targetPos, {reusePath: 10});
        MovementProfiler.endMeasurement('continueMoving', startCpu);
        return result;
    }
}