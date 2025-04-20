export function extendCreep() {


    Creep.prototype.goToFinalPos = function (): void {
        const finalPos = this.memory.finalLocation

        if (finalPos) {
            if (this.room.name == this.memory.workroom && this.pos.x == finalPos.x && this.pos.y == finalPos.y) {
                this.memory.onPosition = true;
                return;
            }

            this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workroom))
            return;

        }
    }
    
}