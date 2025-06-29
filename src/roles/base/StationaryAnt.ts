import {Ant} from "./Ant";
import _ from "lodash";

export abstract class StationaryAnt<TMemory extends StationaryCreepMemory> extends Ant<TMemory> {
    protected goToFinalPos(): boolean {
        const finalPos = this.memory.finalLocation;
        if (finalPos) {
            if (this.creep.room.name === this.memory.workroom &&
                this.creep.pos.x === finalPos.x &&
                this.creep.pos.y === finalPos.y) {
                this.memory.onPosition = true;
                this.memory.moving = false;
                this.memory.targetPos = undefined;
                this.memory.minTicksToLive = this.memory.ticksToPos;
                return true;
            }

            if (this.moveTo(new RoomPosition(finalPos.x, finalPos.y, this.memory.workroom)) === OK) {
                this.memory.ticksToPos = this.memory.ticksToPos + 1;
            }
            return true;
        } else {
            const creeps = _.filter(Game.creeps, creep =>
                creep.memory.job == this.creep.memory.job &&
                creep.memory.workroom == this.creep.memory.workroom &&
                (creep.ticksToLive && creep.ticksToLive < creep.memory.minTicksToLive)
            );


            if (creeps.length > 0) {
                let mem = creeps[0].memory as StationaryCreepMemory;
                this.memory.finalLocation = mem.finalLocation;
            }
        }
        return false;
    }

    protected isOnPosition(): boolean {
        return this.memory.onPosition;
    }
}