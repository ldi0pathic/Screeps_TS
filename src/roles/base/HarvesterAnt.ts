﻿import {Ant} from "./Ant";
import {Movement} from "../../utils/Movement";

export abstract class HarvesterAnt<TMemory extends HarvesterCreepMemory> extends Ant<TMemory> {

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): HarvesterCreepMemory {
        const base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        } as HarvesterCreepMemory;
    }

    doJob(): boolean {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            if (this.creep.memory.workRoom) {
                let room = Game.rooms[this.creep.memory.workRoom];
                if (room && room.memory.spawnPrioBlock && room.storage) {
                    this.memory.harvestStorageId = room.storage?.id;
                    if (this.harvestRoomStorage(RESOURCE_ENERGY)) {
                        return true;
                    }
                }
            }
            this.doHarvest(RESOURCE_ENERGY);
            return true;
        } else if (this.creep.memory.workRoom) {
            let room = Game.rooms[this.creep.memory.workRoom];
            if (room && room.memory.spawnPrioBlock) {
                this.creep.say('🚩🚩🚩')
                const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });

                if (target) {
                    let state = this.creep.transfer(target, RESOURCE_ENERGY);
                    switch (state) {
                        case ERR_NOT_IN_RANGE:
                            this.moveTo(target);
                            return true;
                        case ERR_FULL:
                            return true;

                    }

                }
                return true;
            }
        }

        return false;
    }

    hasHarvestTarget(): boolean {
        return !!(
            this.memory.harvestContainerId ||
            this.memory.harvestStorageId ||
            this.memory.havestSourceId ||
            this.memory.havestLinkId ||
            this.memory.harvestTombstoneId ||
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

        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource()
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
                default: {
                    console.log("🚩 harvestRoomStorage unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "")
                    return false;
                }
            }
        }
        this.memory.harvestStorageId = undefined;
        return false;
    }

    protected harvestRoomContainer(resourceType: ResourceConstant): boolean {
        let container: StructureContainer | undefined;

        if (this.memory.harvestContainerId) {
            container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;
        } else if (!this.hasHarvestTarget()) {
            container = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER &&
                        (structure as StructureContainer).store[resourceType] > 0;
                }
            }) as StructureContainer | undefined;
            this.memory.harvestContainerId = container?.id;
        }

        if (!container) {
            this.memory.harvestContainerId = undefined;
            return false;
        }

        let state = this.creep.withdraw(container, resourceType);
        switch (state) {
            case ERR_NOT_IN_RANGE:
                if (container.store[resourceType] > this.creep.store.getCapacity() * 0.5) {
                    this.moveTo(container);
                    return true;
                } else {
                    this.memory.harvestContainerId = undefined;
                }
                break;

            case OK:
                this.memory.harvestContainerId = undefined;
                return true;
            default: {
                console.log("🚩 harvestRoomContainer unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "")
                return false;
            }
        }


        return false;
    }

    protected harvestRoomDrop(resourceType: ResourceConstant): boolean {
        let drop: Resource | undefined;

        if (this.memory.harvestDroppedId) {
            drop = Game.getObjectById(this.memory.harvestDroppedId) as Resource;
        } else if (!this.hasHarvestTarget()) {
            drop = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType == resourceType && resource.amount > 50;
                }
            }) as Resource | undefined;
        }

        if (!drop) {
            this.memory.harvestDroppedId = undefined;
            return false;
        }

        if (drop.resourceType == resourceType) {
            this.memory.harvestDroppedId = drop.id;

            let state = this.creep.pickup(drop);
            switch (state) {
                case ERR_NOT_IN_RANGE:
                    if (drop.amount > 50) {
                        this.moveTo(drop);
                        return true;
                    }
                    this.memory.harvestDroppedId = undefined;
                    break;
                case OK:
                    this.memory.harvestDroppedId = undefined;
                    return true;
                default: {
                    console.log("🚩 harvestRoomDrop unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "")
                    return false;
                }
            }
        }

        return false;
    }

    protected harvestRoomTombstone(resourceType: ResourceConstant): boolean {
        let tombstone: Tombstone | undefined;

        if (this.memory.harvestTombstoneId) {
            tombstone = Game.getObjectById(this.memory.harvestTombstoneId) as Tombstone;
        } else if (!this.hasHarvestTarget()) {
            tombstone = this.creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                filter: (tombstone) => {
                    return tombstone.store.getUsedCapacity(resourceType) > 50;
                }
            }) as Tombstone | undefined;

            this.memory.harvestTombstoneId = tombstone?.id;
        }

        if (!tombstone) {
            this.memory.harvestTombstoneId = undefined;
            return false;
        }

        let state = this.creep.withdraw(tombstone, resourceType);
        switch (state) {
            case ERR_NOT_IN_RANGE:
                if (tombstone.store.getUsedCapacity(resourceType) > 50) {
                    this.moveTo(tombstone);
                    return true;
                }
                this.memory.harvestTombstoneId = undefined;
                break;

            case OK:
            case ERR_NOT_ENOUGH_ENERGY:
                this.memory.harvestTombstoneId = undefined;
                return true;

            default: {
                console.warn("🚩 harvestRoomTombstone unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "")
                return false;
            }
        }

        return false;
    }


    protected harvestEnergySource() {
        let source: Source | undefined;

        if (this.memory.havestSourceId) {
            source = Game.getObjectById(this.memory.havestSourceId) as Source;
        } else {
            source = this.creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE) as Source | undefined;
        }

        if (source) {
            let state = this.creep.harvest(source)
            switch (state) {
                case ERR_TIRED:
                case ERR_NOT_ENOUGH_ENERGY: {
                    this.creep.say('😴');
                    return;
                }
                case ERR_NOT_IN_RANGE:
                    this.moveTo(source);
                    return;
                case OK:
                    return;

                default: {
                    console.log("🚩 harvestEnergySource unhandled state: " + state + " for creep: " + this.creep.name + " in room: " + this.creep.room.name + "")
                    return;
                }
            }
        }
    }
}
    