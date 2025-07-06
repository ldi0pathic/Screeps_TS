import {roomConfig} from "../config";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class WorkerAnt extends HarvesterAnt<WorkerCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(target);
                    return true;
                }
            }

        }

        if (!target) {
            const todo = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: (site: ConstructionSite) => {
                    return site.structureType !== STRUCTURE_RAMPART;
                }
            });
            if (todo) {
                if (this.creep.build(todo) === ERR_NOT_IN_RANGE) {
                    this.moveTo(todo);
                }
                return true;
            } else {
                const controller = this.creep.room.controller;
                if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                    return true;
                }
            }
        }

        return true
    }

    protected override doHarvest(resource: ResourceConstant): void {
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

        if (this.harvestRoomContainer(resource)) {
            return;
        }

        if (this.harvestLinks(resource)) {
            return;
        }

        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource()
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): WorkerCreepMemory {
        const base = super.createSpawnMemory(spawn, workroom);

        return {
            ...base
        } as WorkerCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.worker;
    }

    public override getMaxCreeps(workroom: string): number {
        return roomConfig[workroom].workerCount || 0;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        return Memory.rooms[workroom].state <= eRoomState.phase1;

    }

    override hasHarvestTarget(): boolean {
        return !!(
            this.memory.harvestContainerId ||
            this.memory.harvestStorageId ||
            this.memory.havestSourceId ||
            this.memory.havestLinkId ||
            this.memory.harvestDroppedId ||
            this.memory.harvestLinkId
        );
    }

    private harvestLinks(resource: ResourceConstant) {
        let link: StructureLink | undefined;

        if (this.memory.harvestLinkId) {
            link = Game.getObjectById(this.memory.harvestLinkId) as StructureLink | undefined;
        } else if (!this.hasHarvestTarget()) {
            link = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: s => s.structureType == STRUCTURE_LINK && s.store[resource] > 0
            }) as StructureLink | undefined;
        }

        if (!link) {
            this.memory.harvestLinkId = undefined;
            return false;
        }

        if (link.store[resource] > 0) {
            this.memory.harvestLinkId = link.id;

            let state = this.creep.withdraw(link, resource);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(link);
                    return true;
                case OK:
                    this.memory.harvestLinkId = undefined;
                    return true;
            }
        }
        this.memory.harvestLinkId = undefined;
        return false;
    }
}