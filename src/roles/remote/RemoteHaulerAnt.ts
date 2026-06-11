import {HarvesterAnt} from "../base/HarvesterAnt";
import {BodyBuilder} from "../../utils/BodyBuilder";
import {PassivePolicy} from "../../policy/PassivePolicy";

export class RemoteHaulerAnt extends HarvesterAnt<RemoteHarvesterMemory> {

    public override getJob(): eJobType {
        return eJobType.remoteHauler;
    }

    public override doJob(): boolean {
        this.checkHarvest();

        if (this.memory.state === eJobState.harvest) {
            // Flee if danger
            if (PassivePolicy.shouldFleeRemote(this.memory.workRoom)) {
                this.moveTo(new RoomPosition(25, 25, this.memory.spawnRoom), 20);
                return true;
            }

            // Go to work room and pick up from container
            if (this.creep.room.name !== this.memory.workRoom) {
                this.moveTo(new RoomPosition(25, 25, this.memory.workRoom), 22);
                return true;
            }

            if (this.harvestRoomContainer(RESOURCE_ENERGY)) return true;
            if (this.harvestRoomDrop(RESOURCE_ENERGY)) return true;
            return true;
        }

        // Deliver to home room storage
        const homeRoom = Game.rooms[this.memory.spawnRoom];
        if (!homeRoom) {
            this.moveTo(new RoomPosition(25, 25, this.memory.spawnRoom), 22);
            return true;
        }

        const storage = homeRoom.storage;
        if (storage) {
            const result = this.creep.transfer(storage, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) this.moveTo(storage);
            return true;
        }

        // Fallback: deliver to spawn
        const spawn = homeRoom.find(FIND_MY_SPAWNS)[0];
        if (spawn) {
            const result = this.creep.transfer(spawn, RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) this.moveTo(spawn);
        }
        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        const remote = Memory.remoteIntel?.[workroom.name];
        const ept = remote?.reserved ? 10 : 5;
        // Use observed route distance if available, else estimate
        const routeLen = remote?.routeDistance ?? 5;
        const roundTrip = routeLen * 3; // rough ticks per hop
        return BodyBuilder.hauler(ept, roundTrip, true);
    }

    public override getMaxCreeps(workroom: string): number {
        return 1;
    }

    protected override shouldSpawn(workroom: string): boolean {
        if (!PassivePolicy.isRoomSafeToMine(workroom)) return false;
        const remote = Memory.remoteIntel?.[workroom];
        if (!remote) return false;
        if (remote.state !== 'mining' && remote.state !== 'candidate') return false;
        return true;
    }
}
