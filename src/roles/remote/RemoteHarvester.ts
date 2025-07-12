import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";
import {CreepStorage} from "../../storage/CreepStorage";


export class RemoteHarvester extends Ant<RemoteHarvesterMemory> {


    doJob(): boolean {

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            if (this.creep.room.name !== this.memory.workRoom) {
                const result = Movement.moveToRoom(this.creep, this.memory.workRoom);
                if (result != OK) {
                    return true;
                } else {
                    this.memory.moving = false
                }
            }
        } else {
            if (this.creep.room.name !== this.memory.spawnRoom) {
                const result = Movement.moveToRoom(this.creep, this.memory.spawnRoom);
                if (result != OK) {
                    return true;
                } else {
                    this.memory.moving = false
                }
            }
        }

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        if (this.memory.state == eJobState.harvest) {

            this.memory.targetId = undefined;

            if (this.creep.room.name != this.memory.workRoom) {
                return false;
            }

            if (this.harvestRoomDrop(RESOURCE_ENERGY)) {
                return true;
            }

            if (this.harvestRoomTombstone(RESOURCE_ENERGY)) {
                return true;
            }

            let Source: Source | undefined;

            if (this.memory.energySourceId) {
                Source = Game.getObjectById(this.memory.energySourceId) as Source | undefined;
            } else {
                let sources = this.creep.room.getOrFindEnergieSource();

                if (sources.length == 1) {
                    Source = Game.getObjectById(sources[0].sourceId) as Source | undefined;
                } else {

                    for (let source of sources) {

                        if (!Source) {
                            Source = Game.getObjectById(source.sourceId) as Source | undefined;
                        } else {
                            let newSource = Game.getObjectById(source.sourceId) as Source | undefined;
                            if (newSource && newSource.energy > Source.energy) {
                                Source = newSource;
                            }
                        }
                    }
                }
                this.memory.energySourceId = Source?.id;
            }

            if (Source) {
                let state = this.creep.harvest(Source);
                switch (state) {
                    case ERR_TIRED:
                    case ERR_NOT_ENOUGH_ENERGY: {
                        if (this.creep.pos.isNearTo(Source)) {
                            this.creep.say('😴');
                        } else {
                            this.moveTo(Source);
                        }
                        return true;
                    }
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(Source);
                        return true;
                    default: {
                        return true;
                    }
                }
            }
        } else {
            this.memory.energySourceId = undefined;
            if (this.creep.room.name != this.memory.spawnRoom) {
                return false;
            }

            let target: AnyStoreStructure | undefined;

            if (this.memory.targetId) {
                target = Game.getObjectById(this.memory.targetId) as AnyStoreStructure | undefined;
            }

            if (!target) {

                if (!target) {

                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: structure => (structure.structureType === STRUCTURE_CONTAINER ||
                                structure.structureType == STRUCTURE_STORAGE ||
                                structure.structureType == STRUCTURE_LINK ||
                                structure.structureType == STRUCTURE_TOWER
                            ) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) >= this.creep.store[RESOURCE_ENERGY] * 0.5
                    }) as AnyStoreStructure | undefined;
                }

            }

            if (target) {
                let state = this.creep.transfer(target, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE: {
                        this.memory.targetId = target.id;
                        this.moveTo(target);
                        break
                    }
                    case ERR_FULL:
                    case OK: {
                        this.memory.targetId = undefined;
                        break
                    }
                }
            }
        }
        return true;
    }


    getJob(): eJobType {
        return eJobType.remoteHarvester;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): RemoteHarvesterMemory {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
        } as RemoteHarvesterMemory;
    }

    getMaxCreeps(workroom: string): number {
        if (!roomConfig[workroom].sendRemoteMiner) {
            return 0;
        }
        let max = Memory.rooms[workroom].energySources.length || 0;
        if (max > 0) {
            max *= roomConfig[workroom].remoteMinerPerSource
        }
        return max;
    }

    getProfil(spawnRoom: Room): BodyPartConstant[] {
        if (spawnRoom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = spawnRoom.getMaxAvailableEnergy();

        const setCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + 2 * BODYPART_COST[MOVE];

        const maxSets = Math.floor((availableEnergy) / setCost);
        const numberOfSets = Math.min(12, maxSets);

        const body: BodyPartConstant[] = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            body.push(MOVE);
        }

        return body;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (!roomConfig[workroom].sendRemoteMiner || roomConfig[workroom].remoteMinerPerSource == 0) {
            return false;
        }

        if (Memory.rooms[workroom].needDefence ||
            Memory.rooms[workroom].invaderCore) {
            return false;
        }


        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length
        } else {
            max = Memory.rooms[workroom].energySources.length
        }

        if (max > 0) {
            max *= roomConfig[workroom].remoteMinerPerSource
        }

        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfAnts = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        return max > countOfAnts;
    }

    protected harvestRoomDrop(resourceType: ResourceConstant): boolean {
        let drop: Resource | undefined;

        if (this.memory.harvestDroppedId) {
            drop = Game.getObjectById(this.memory.harvestDroppedId) as Resource;
        } else if (!this.hasHarvestTarget()) {
            drop = this.creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType == resourceType && resource.amount > 100;
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
                    if (drop.amount > 100) {
                        this.moveTo(drop);
                        return true;
                    }
                    this.memory.harvestDroppedId = undefined;
                    break;
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
            tombstone = this.creep.pos.findClosestByRange(FIND_TOMBSTONES, {
                filter: (tombstone) => {
                    return tombstone.store.getUsedCapacity(resourceType) > 100;
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
                if (tombstone.store.getUsedCapacity(resourceType) > 100) {
                    this.moveTo(tombstone);
                    return true;
                }
                this.memory.harvestTombstoneId = undefined;
                break;

            case OK:
                this.memory.harvestTombstoneId = undefined;
                return true;
        }

        return false;
    }

    hasHarvestTarget(): boolean {
        return !!(

            this.memory.harvestDroppedId ||
            this.memory.harvestTombstoneId
        );
    }
}