import _ from "lodash";
import {Ant} from "./base/Ant";
import {Movement} from "../utils/Movement";

export class FillerAnt extends Ant<FillerCreepMemory> {
    doJob(): boolean {

        if (this.creep.fatigue > 0) {
            return true;
        }

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }
        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            if (this.creep.room.controller?.my) {
                let storage: StructureStorage | undefined;

                if (this.memory.harvestStorageId) {
                    storage = Game.getObjectById(this.memory.harvestStorageId) as StructureStorage;
                } else {
                    storage = this.creep.room.storage;
                }

                if (!storage) {
                    this.memory.harvestStorageId = undefined;
                    return false;
                }

                if (storage.store?.getUsedCapacity(RESOURCE_ENERGY) > this.creep.store.getCapacity() * 0.5) {
                    this.memory.harvestStorageId = storage.id;

                    let state = this.creep.withdraw(storage, RESOURCE_ENERGY);
                    switch (state) {
                        case ERR_NOT_IN_RANGE:
                            this.moveTo(storage);
                            return true;
                        case OK:
                            this.memory.harvestStorageId = undefined;
                            return true;
                    }
                }
                this.memory.harvestStorageId = undefined;
                return false;
            }

            let container: StructureContainer | undefined;
            if (this.memory.harvestContainerId) {
                container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;
            } else {
                let containers = this.creep.room.findAllContainersNearSpawns()
                if (containers.length == 1) {
                    container = containers[0];
                } else {
                    container = this.creep.pos.findClosestByPath(containers, {
                        filter: c => c.store.getUsedCapacity(RESOURCE_ENERGY) > 0
                    }) as StructureContainer | undefined;
                }
            }

            if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                let state = this.creep.withdraw(container, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(container);
                        return true;
                    case OK:
                        this.memory.harvestContainerId = undefined;
                        return true;
                }

            }

            return true;
        }


        let target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target && this.creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }

        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [CARRY, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();


        const setCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];

        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(13, maxSets);

        const body: BodyPartConstant[] = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }

        return body;
    }

    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): FillerCreepMemory {
        const base = super.createSpawnMemory(spawn, roomname);

        return {
            ...base,
            harvestContainerId: undefined,
            harvestStorageId: undefined,
        } as FillerCreepMemory
    }

    public override getJob(): eJobType {
        return eJobType.filler;
    }

    public override getMaxCreeps(workroom: Room): number {
        return 1;
    }

    protected shouldSpawn(workroom: Room): boolean {
        return workroom.memory.state >= eRoomState.phase5 && workroom.storage != null;
    }

}