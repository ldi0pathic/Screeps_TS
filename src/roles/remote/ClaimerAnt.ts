import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";

export class ClaimerAnt extends Ant<ClaimerCreepMemory> {

    public override getJob(): eJobType {
        return eJobType.claimer;
    }

    public override doJob(): boolean {
        if (this.creep.room.name !== this.memory.workRoom) {
            const result = Movement.moveToRoom(this.creep, this.memory.workRoom);
            if (result != OK) {
                return true;
            } else {
                this.memory.moving = false
            }
        }

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        const controller = this.creep.room.controller;
        if (!controller) {
            this.creep.say("🚩🚩🚩🚩")
            return false;
        }

        if (this.memory.targetClaim) {
            switch (this.creep.claimController(controller)) {
                case ERR_NOT_IN_RANGE:
                    if (this.moveTo(controller) !== OK) {
                        this.moveToRoomMiddle(this.memory.workRoom)
                    }
                    return true;
                case OK:
                    Memory.rooms[this.creep.room.name].state = eRoomState.claimed;
                    this.creep.suicide();
                    return true;
                default:
                    return true;
            }
        }

        switch (this.creep.reserveController(controller)) {
            case ERR_NOT_IN_RANGE:
                if (this.moveTo(controller) !== OK) {
                    this.moveToRoomMiddle(this.memory.workRoom)
                }
                return true;
            case ERR_INVALID_TARGET:
                this.creep.say('🪓')
                this.creep.attackController(controller);
                return true;
            case OK: {
                if (controller.sign?.username != this.creep.owner.username) {
                    this.creep.signController(controller, '⚔');
                }
            }
        }

        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [CLAIM, CLAIM, MOVE, MOVE];
    }

    public override createSpawnMemory(spawn: StructureSpawn, workroom: string): ClaimerCreepMemory {

        const base = super.createSpawnMemory(spawn, workroom);

        return {
            ...base,
            targetClaim: roomConfig[workroom].buildBase,
        };
    }

    public override getMaxCreeps(workroom: string): number {
        return 1; // nur ein Claimer pro Raum
    }

    protected override shouldSpawn(workroom: string): boolean {

        if (roomConfig[workroom].spawnRoom == undefined) {
            return false;
        }

        if (!roomConfig[workroom].sendClaimer) {
            return false;
        }

        const roomState = Memory.rooms[workroom]?.state;
        if (!roomState ||
            (roomState !== eRoomState.neutral &&
                roomState !== eRoomState.claimed &&
                roomState !== eRoomState.invader &&
                roomState !== eRoomState.otherPlayer)) {
            return false; // nur Räume mit neutral, claimed oder invader zulassen
        }

        const room = Game.rooms[workroom];
        if (room && room.controller && room.controller.reservation && room.controller.reservation.ticksToEnd > 3000)
            return false;

        const count = _.filter(Game.creeps, c => c.memory.job === this.getJob() && c.memory.workRoom === workroom).length;
        return count < this.getMaxCreeps(workroom);
    }
}