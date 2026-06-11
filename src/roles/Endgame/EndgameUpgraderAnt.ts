import {CreepStorage} from "../../storage/CreepStorage";
import {LinkStorage} from "../../storage/LinkStorage";
import {StationaryAnt} from "../base/StationaryAnt";
import {BodyBuilder} from "../../utils/BodyBuilder";

export class EndgameUpgraderAnt extends StationaryAnt<EndgameUpgraderCreepMemory> {

    doJob(): boolean {
        if (!this.isOnPosition()) {
            this.goToFinalPos(3);
            this.creep.say('🚌');
            return true;
        }

        const ctrl = Game.rooms[this.memory.workRoom]?.controller;
        if (!ctrl) return true;

        // Withdraw from link first, then container
        const energy = this.creep.store.energy;
        const cap = this.creep.store.getCapacity(RESOURCE_ENERGY);

        if (energy < cap * 0.25) {
            // Need energy
            if (this.memory.linkId) {
                const link = Game.getObjectById(this.memory.linkId);
                if (link && link.store.energy > 0) {
                    const result = this.creep.withdraw(link, RESOURCE_ENERGY);
                    if (result === ERR_NOT_IN_RANGE) this.moveTo(link, 1);
                    return true;
                }
            }
            if (this.memory.containerId) {
                const container = Game.getObjectById(this.memory.containerId);
                if (container && container.store.energy > 0) {
                    const result = this.creep.withdraw(container, RESOURCE_ENERGY);
                    if (result === ERR_NOT_IN_RANGE) this.moveTo(container, 1);
                    return true;
                }
            }
        }

        if (energy > 0) {
            const result = this.creep.upgradeController(ctrl);
            if (result === ERR_NOT_IN_RANGE) this.moveTo(ctrl, 3);
        }
        return true;
    }

    public override createSpawnMemory(spawn: StructureSpawn, workroom: string): EndgameUpgraderCreepMemory {
        const room = Game.rooms[workroom];
        const ctrl = room?.controller;

        // Find controller container or link
        let containerId: Id<StructureContainer> | undefined;
        let linkId: Id<StructureLink> | undefined;
        let finalLocation: RoomPosition = ctrl?.pos ?? new RoomPosition(25, 25, workroom);

        if (ctrl) {
            const containers = ctrl.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            }) as StructureContainer[];
            if (containers.length > 0) {
                containerId = containers[0].id;
                finalLocation = containers[0].pos;
            }

            const links = ctrl.pos.findInRange(FIND_MY_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_LINK
            }) as StructureLink[];
            if (links.length > 0) linkId = links[0].id;
        }

        return {
            job: this.getJob(),
            ticksToPos: 1,
            spawn: spawn.name,
            state: eJobState.work,
            workRoom: workroom,
            spawnRoom: spawn.room.name,
            onPosition: false,
            finalLocation,
            roundRobin: 1,
            roundRobinOffset: 0,
            moving: false,
            containerId,
            linkId,
        } as EndgameUpgraderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        const storage = workroom.storage;
        const storageEnergy = storage?.store.energy ?? 0;
        return BodyBuilder.endgameUpgrader(workroom.getMaxAvailableEnergy());
    }

    public override getJob(): eJobType {
        return eJobType.endgameUpgrader;
    }

    public override getMaxCreeps(workroom: string): number {
        return 1;
    }

    protected shouldSpawn(workroom: string): boolean {
        const room = Memory.rooms[workroom];
        if (!room) return false;
        if (room.state < eRoomState.phase5) return false;

        const gameRoom = Game.rooms[workroom];
        if (!gameRoom) return false;

        // Skip if storage is low
        const storageEnergy = gameRoom.storage?.store.energy ?? 0;
        if (storageEnergy < 20000) return false;

        // RCL8: skip if controller timer is very healthy and storage almost full
        if (room.state === eRoomState.phase8 &&
            gameRoom.controller &&
            gameRoom.controller.ticksToDowngrade > 100000 &&
            storageEnergy < 250000) {
            return false;
        }

        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const count = creepStorage.getCreepCountByJobAndRoom(job, workroom);
        return count < this.getMaxCreeps(workroom);
    }
}
