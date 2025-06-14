export function extendCreep() {

    Creep.prototype.goToFinalPos = function (): boolean {
        let finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.room.name == this.memory.workroom && this.pos.x == finalPos.x && this.pos.y == finalPos.y) {
                this.memory.onPosition = true;
                this.memory.minTicksToLive = this.memory.ticktToPos;
                return true;
            }

            if (this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workroom)) == OK) {
                this.memory.ticktToPos = this.memory.ticktToPos + 1;
            }
            return true;

        }

        return false;
    }

}