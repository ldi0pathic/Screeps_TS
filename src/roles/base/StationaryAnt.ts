import {Ant} from "./Ant";

export abstract class StationaryAnt<TMemory extends StationaryCreepMemory> extends Ant<TMemory> {
    protected goToFinalPos(range: number = 0): boolean {
        const finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.creep.room.name === this.memory.workRoom &&
                new RoomPosition(finalPos.x, finalPos.y, this.memory.workRoom).inRangeTo(this.creep.pos, range)) {
                this.memory.onPosition = true;
                this.memory.moving = false;
                this.memory.targetPos = undefined;
                return true;
            }

            this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workRoom), range)

            return true;
        }
        return false;
    }

    protected isOnPosition(): boolean {
        return this.memory.onPosition;
    }
}