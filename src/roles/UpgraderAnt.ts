import {roomConfig} from "../config";
import {HarvesterAnt} from "./base/HarvesterAnt";
import {CreepStorage} from "../storage/CreepStorage";
import {LinkStorage} from "../storage/LinkStorage";


export class UpgraderAnt extends HarvesterAnt<UpgraderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const controller = this.creep.room.controller
        if (controller) {
            if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
            }
            controller.room.setRoomState(controller);
        }

        return true;
    }

    protected override doHarvest(resource: ResourceConstant): void {

        if (this.creep.room.memory.state >= eRoomState.phase4) {
            let link: StructureLink | undefined;

            if (this.memory.havestLinkId) {
                link = Game.getObjectById(this.memory.havestLinkId) as StructureLink | undefined;
                if (!link) this.memory.havestLinkId = undefined;
            } else {
                let links = LinkStorage.getInstance().getLinksByType(this.creep.room.name, "upgrader")
                if (links.length > 0) {
                    this.memory.havestLinkId = links[0].linkId;
                }
            }

            if (link && link.store[RESOURCE_ENERGY] > 0) {
                let state = this.creep.withdraw(link, RESOURCE_ENERGY)
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(link);
                        return;
                    case OK:
                        return;
                }
            }
        }

        if (this.harvestRoomContainer(resource)) {
            return;
        }

        if (this.harvestRoomDrop(resource)) {
            return;
        }

        if (this.harvestRoomTombstone(resource)) {
            return;
        }

        if (this.creep.room.controller?.my) {
            if (this.harvestRoomStorage(resource)) {
                return;
            }
        }

        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource()
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): UpgraderCreepMemory {

        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        } as UpgraderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

        const workPerSet = 3;
        const carryPerSet = 1;
        const movePerSet = 1;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];

        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(7, maxSets);

        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }

        return body;
    }

    public override getJob(): eJobType {
        return eJobType.upgrader
    }

    public override getMaxCreeps(workroom: string): number {
        let max = roomConfig[workroom].upgraderCount || 0;

        const room = Game.rooms[workroom];

        if (room && room.storage) {
            if (room.memory.state < eRoomState.phase8 && room.memory.state > eRoomState.phase4) {

                if (room.storage.store[RESOURCE_ENERGY] > 50_000) {
                    max++;
                }
                if (room.storage.store[RESOURCE_ENERGY] > 75_000) {
                    max++;
                }
            }

            if (room.storage.store[RESOURCE_ENERGY] < 10_000) {
                max = 1;
            }
        }

        return max;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        return this.getMaxCreeps(workroom) > countOfCreeps;
    }
}