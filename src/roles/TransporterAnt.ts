import _ from "lodash";

import {HarvesterAnt} from "./base/HarvesterAnt";


export class TransporterAnt extends HarvesterAnt<TransporterCreepMemory> {
    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        let target: AnyStoreStructure | undefined;

        if (this.memory.targetId) {
            target = Game.getObjectById(this.memory.targetId) as AnyStoreStructure | undefined;
        }

        if (!target) {

            if (this.creep.room.memory.state >= eRoomState.phase4 && this.creep.room.storage == null) {
                target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION ||
                            (s.structureType === STRUCTURE_TOWER && s.store.getFreeCapacity(RESOURCE_ENERGY) > 100)) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }) as AnyStoreStructure | undefined;
            } else {
                target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s =>
                        s.structureType === STRUCTURE_TOWER &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 100
                }) as AnyStoreStructure | undefined;
            }

            if (!target) {
                const roomStorage = this.creep.room.getOrFindRoomStorage();
                if (roomStorage) {
                    const allStructures = [
                        ...(roomStorage.storageId ? [Game.getObjectById(roomStorage.storageId) as AnyStoreStructure] : []),
                        ...(roomStorage.storageContainerId?.map(id => Game.getObjectById(id) as AnyStoreStructure) || [])
                    ].filter(structure => structure && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

                    // Erst nach halb leeren Containern suchen
                    const halfEmptyContainers = allStructures.filter(structure =>
                        structure.structureType === STRUCTURE_CONTAINER &&
                        (structure.store.getUsedCapacity(RESOURCE_ENERGY) / structure.store.getCapacity(RESOURCE_ENERGY)) < 0.55
                    );

                    if (halfEmptyContainers.length > 0) {
                        target = this.creep.pos.findClosestByPath(halfEmptyContainers) as AnyStoreStructure;
                    } else {
                        target = this.creep.pos.findClosestByPath(allStructures) as AnyStoreStructure;
                    }
                }
            }
        }

        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE: {
                    this.memory.targetId
                    this.moveTo(target);
                    break
                }
                case OK: {
                    this.memory.targetId = undefined;
                    break
                }
            }
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

    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): TransporterCreepMemory {
        const base = super.createSpawnMemory(spawn, roomname);
        return {
            ...base,
            targetId: undefined,
        } as TransporterCreepMemory
    }

    public override getJob(): eJobType {
        return eJobType.transporter;
    }

    public override getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state > eRoomState.phase1;

    }

}