import {HarvesterAnt} from "../base/HarvesterAnt";
import {BodyBuilder} from "../../utils/BodyBuilder";
import {PassivePolicy} from "../../policy/PassivePolicy";

export class ReserverAnt extends HarvesterAnt<CreepMemory> {

    public override getJob(): eJobType {
        return eJobType.reserver;
    }

    public override doJob(): boolean {
        const ctrl = Game.rooms[this.memory.workRoom]?.controller;
        if (!ctrl) {
            this.moveTo(new RoomPosition(25, 25, this.memory.workRoom), 20);
            return true;
        }

        if (!this.creep.pos.inRangeTo(ctrl, 1)) {
            this.moveTo(ctrl);
            return true;
        }

        if (ctrl.owner) {
            // owned by another player — do not attack
            if (!ctrl.my) return true;
        }

        if (ctrl.reservation?.username !== this.creep.owner.username) {
            this.creep.attackController(ctrl);
        } else {
            this.creep.reserveController(ctrl);
        }
        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        const route = Game.map.findRoute(workroom.name, this.memory.workRoom ?? workroom.name);
        const distance = route !== ERR_NO_PATH ? route.length : 1;
        return BodyBuilder.reserver(distance <= 3);
    }

    public override getMaxCreeps(workroom: string): number {
        return 1;
    }

    protected override shouldSpawn(workroom: string): boolean {
        if (!PassivePolicy.isRoomSafeToMine(workroom)) return false;
        const remote = Memory.remoteIntel?.[workroom];
        if (!remote) return false;
        if (remote.state === 'danger' || remote.state === 'blocked' || remote.state === 'disabled') return false;

        const ctrl = Game.rooms[workroom]?.controller;
        if (ctrl?.reservation && ctrl.reservation.ticksToEnd > 3500) return false;

        return true;
    }
}
