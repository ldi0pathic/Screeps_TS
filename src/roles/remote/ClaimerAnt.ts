import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";
import json = Mocha.reporters.json;
import {StationaryAnt} from "../base/StationaryAnt";

export class ClaimerAnt extends StationaryAnt<ClaimerCreepMemory> {

    public override getJob(): eJobType {
        return eJobType.claimer;
    }

    public override doJob(): boolean {
        const creep = this.creep;
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos(1)) {
                return true;
            }
            if (creep.room.name == this.memory.workRoom) {

                if (this.memory.finalLocation?.x == 25 && this.memory.finalLocation?.y == 25) {
                    if (creep.room.controller?.pos) {
                        this.memory.finalLocation = creep.room.controller?.pos;
                        Memory.rooms[creep.room.name].controllerData = {
                            x: creep.room.controller.pos.x,
                            y: creep.room.controller.pos.y,
                            id: creep.room.controller.id
                        }
                    }
                }
            }
            creep.say('🚌')
            return true;
        }

        if (creep.room.controller) {
            if (this.memory.targetClaim) {
                const s = this.creep.claimController(creep.room.controller);
                switch (s) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(creep.room.controller);
                        return true;
                    case OK:
                        Memory.rooms[this.creep.room.name].state = eRoomState.claimed;
                        return true;
                    default:
                        return true;
                }
            }
            const s = this.creep.reserveController(creep.room.controller);
            switch (s) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(creep.room.controller)
                    return true;
                case ERR_INVALID_TARGET:
                    this.creep.say('🪓')
                    this.creep.attackController(creep.room.controller);
                    return true;
                case OK: {
                    if (creep.room.controller.sign?.username != this.creep.owner.username) {
                        this.creep.signController(creep.room.controller, '⚔');
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

        const job = this.getJob();

        let finalLocation: RoomPosition | undefined = undefined;
        const roomdata = Memory.rooms[workroom].controllerData;
        if (roomdata) {
            finalLocation = new RoomPosition(roomdata.x, roomdata.y, workroom);
        } else {
            finalLocation = Game.rooms[workroom]?.controller?.pos;
        }
        if (!finalLocation) {
            finalLocation = new RoomPosition(25, 25, workroom)
        }

        return {
            job: job,
            ticksToPos: 1,
            spawn: spawn.name,
            state: eJobState.work,
            workRoom: workroom,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,

        } as ClaimerCreepMemory;
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