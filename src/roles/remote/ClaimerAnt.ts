import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";

export class ClaimerAnt extends Ant<ClaimerCreepMemory> {

    public override getJob(): eJobType {
        return eJobType.claimer;
    }

    public override doJob(): boolean {
        const creep = this.creep;
        const workRoom = creep.memory.workRoom;

        // 1. Noch nicht im Raum → dorthin bewegen
        if (creep.room.name !== workRoom) {
            Movement.moveToRoom(creep, workRoom);
            return true;
        }

        // 2. Jetzt im Raum, Controller sichtbar
        const controller = creep.room.controller;
        if (!controller) {
            this.moveToRoomMiddle(workRoom);
            return true;
        }

        // 3. Prüfen, ob Creep noch unterwegs ist
        if (Movement.shouldContinueMoving(creep)) {
            Movement.continueMoving(creep);
            return true;
        }

        // 4. Controller als Ziel setzen und hinlaufen
        Movement.moveTo(creep, controller.pos);

        // 5. Wenn in Reichweite, reservieren
        if (creep.pos.isNearTo(controller)) {
            if (this.memory.targetClaim) {
                const s = this.creep.claimController(controller);
                switch (s) {
                    case ERR_NOT_IN_RANGE:
                        if (this.moveTo(controller) !== OK) {
                            this.moveToRoomMiddle(this.memory.workRoom)
                        }
                        return true;
                    case OK:
                        Memory.rooms[this.creep.room.name].state = eRoomState.claimed;
                        return true;
                    default:
                        return true;
                }
            }
            const s = this.creep.reserveController(controller);
            switch (s) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(controller)
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