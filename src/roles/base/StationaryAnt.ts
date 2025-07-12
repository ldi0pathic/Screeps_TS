import {Ant} from "./Ant";

export abstract class StationaryAnt<TMemory extends StationaryCreepMemory> extends Ant<TMemory> {
    protected goToFinalPos(): boolean {
        const finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.creep.room.name === this.memory.workRoom &&
                this.creep.pos.x === finalPos.x &&
                this.creep.pos.y === finalPos.y) {
                this.memory.onPosition = true;
                this.memory.moving = false;
                this.memory.targetPos = undefined;
                return true;
            }

            this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workRoom))

            return true;
        }
        return false;
    }

    protected isOnPosition(): boolean {
        return this.memory.onPosition;
    }
}