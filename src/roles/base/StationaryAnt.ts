import {Ant} from "./Ant";

export abstract class StationaryAnt<TMemory extends StationaryCreepMemory> extends Ant<TMemory> {
    protected goToFinalPos(): boolean {
        const finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.creep.room.name === this.memory.workroom &&
                this.creep.pos.x === finalPos.x &&
                this.creep.pos.y === finalPos.y) {
                this.memory.onPosition = true;
                this.memory.minTicksToLive = this.memory.ticksToPos;
                return true;
            }

            if (this.creep.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workroom)) === OK) {
                this.memory.ticksToPos = this.memory.ticksToPos + 1;
            }
            return true;
        }
        return false;
    }

    protected isOnPosition(): boolean {
        return this.memory.onPosition;
    }
}