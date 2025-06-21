import {Ant} from "./Ant";

export abstract class HarvesterAnt<TMemory extends HarvesterCreepMemory> extends Ant<TMemory> {

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): HarvesterCreepMemory {
        const base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        } as HarvesterCreepMemory;
    }

    hasHarvestTarget(): boolean {
        return !!(
            this.memory.harvestContainerId ||
            this.memory.harvestStorageId ||
            this.memory.havestSourceId ||
            this.memory.havestLinkId ||
            this.memory.harvestDroppedId
        );
    }

    protected doHarvest(resource: ResourceConstant): void {
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
    }

    protected harvestRoomStorage(resourceType: ResourceConstant): boolean {
        let storage: StructureStorage | undefined;

        if (this.memory.harvestStorageId) {
            storage = Game.getObjectById(this.memory.harvestStorageId) as StructureStorage;
        } else if (!this.hasHarvestTarget()) {
            storage = this.creep.room.storage;
        }

        if (!storage) {
            this.memory.harvestStorageId = undefined;
            return false;
        }

        if (storage.store?.getUsedCapacity(resourceType) > this.creep.store.getCapacity() * 0.5) {
            this.memory.harvestStorageId = storage.id;

            let state = this.creep.withdraw(storage, resourceType);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(storage);
                    return true;
                case OK:
                    this.memory.harvestStorageId = undefined;
                    return true;
            }
        }

        return false;
    }

    protected harvestRoomContainer(resourceType: ResourceConstant): boolean {
        let container: StructureContainer | undefined;

        if (this.memory.harvestContainerId) {
            container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;
        } else if (!this.hasHarvestTarget()) {
            container = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER &&
                        (structure as StructureContainer).store[resourceType] > 0;
                }
            }) as StructureContainer | undefined;
        }

        if (!container) {
            this.memory.harvestContainerId = undefined;
            return false;
        }

        if (container.store?.getUsedCapacity(resourceType) > this.creep.store.getCapacity() * 0.5) {
            this.memory.harvestContainerId = container.id;

            let state = this.creep.withdraw(container, resourceType);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(container);
                    return true;
                case OK:
                    this.memory.harvestContainerId = undefined;
                    return true;
            }
        }

        return false;
    }

    protected harvestRoomDrop(resourceType: ResourceConstant): boolean {
        let drop: Resource | undefined;

        if (this.memory.harvestDroppedId) {
            drop = Game.getObjectById(this.memory.harvestDroppedId) as Resource;
        } else if (!this.hasHarvestTarget()) {
            drop = this.creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType == resourceType && resource.amount > 100;
                }
            }) as Resource | undefined;
        }

        if (!drop) {
            this.memory.harvestDroppedId = undefined;
            return false;
        }

        if (drop.amount > 100 && drop.resourceType == resourceType) {
            this.memory.harvestDroppedId = drop.id;

            let state = this.creep.pickup(drop);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(drop);
                    return true;

                case OK:
                    this.memory.harvestDroppedId = undefined;
                    return true;
            }
        }

        return false;
    }

    protected harvestRoomTombstone(resourceType: ResourceConstant): boolean {
        let tombstone: Tombstone | undefined;

        if (this.memory.harvestTombstoneId) {
            tombstone = Game.getObjectById(this.memory.harvestTombstoneId) as Tombstone;
        } else if (!this.hasHarvestTarget()) {
            tombstone = this.creep.pos.findClosestByPath(FIND_TOMBSTONES, {
                filter: (tombstone) => {
                    return tombstone.store.getUsedCapacity(resourceType) > 100;
                }
            }) as Tombstone | undefined;
        }

        if (!tombstone) {
            this.memory.harvestTombstoneId = undefined;
            return false;
        }

        if (tombstone.store.getUsedCapacity(resourceType) > 100) {
            this.memory.harvestTombstoneId = tombstone.id;

            let state = this.creep.withdraw(tombstone, resourceType);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    this.moveTo(tombstone);
                    return true;

                case OK:
                    this.memory.harvestTombstoneId = undefined;
                    return true;
            }
        }

        return false;
    }


}
    