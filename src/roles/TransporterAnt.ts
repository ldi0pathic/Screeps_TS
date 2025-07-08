import _ from "lodash";

import {HarvesterAnt} from "./base/HarvesterAnt";
import {roomConfig} from "../config";


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

            if (this.creep.room.memory.spawnPrioBlock || //Wenn Prioblock
                (this.creep.room.storage && this.creep.room.storage.store[RESOURCE_ENERGY] < 3000)) { //oder wenn Storage keine Energie hat, Filler unterstützen
                target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: s => (s.structureType === STRUCTURE_SPAWN ||
                            s.structureType === STRUCTURE_EXTENSION) &&
                        s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                }) as AnyStoreStructure | undefined;
            }

            if (!target) {
                //Wenn kein Storage existiert tower befüllen & Filler unterstützen
                if (this.creep.room.storage == null) {
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s => (s.structureType === STRUCTURE_SPAWN ||
                                s.structureType === STRUCTURE_EXTENSION ||
                                (s.structureType === STRUCTURE_TOWER && s.store[RESOURCE_ENERGY] < 900)) &&
                            s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                    }) as AnyStoreStructure | undefined;
                } else { //ansonsten nur Tower befüllen
                    target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: s =>
                            s.structureType === STRUCTURE_TOWER &&
                            s.store[RESOURCE_ENERGY] < 900
                    }) as AnyStoreStructure | undefined;
                }
            }

            if (!target) { //ansonsten Energie einlagern
                const roomStorage = this.creep.room.getOrFindRoomStorage();
                if (roomStorage) {
                    const allStructures = [
                        ...(roomStorage.storageId ? [Game.getObjectById(roomStorage.storageId) as AnyStoreStructure] : []),
                        ...(roomStorage.storageContainerId?.map(id => Game.getObjectById(id) as AnyStoreStructure) || [])
                    ].filter(structure => structure && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

                    // Erst nach halb leeren Containern suchen
                    const halfEmptyContainers = allStructures.filter(structure =>
                        structure.structureType === STRUCTURE_CONTAINER &&
                        (structure.store.getFreeCapacity(RESOURCE_ENERGY) > this.creep.store[RESOURCE_ENERGY])
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

        return true;
    }

    protected override doHarvest(resource: ResourceConstant): void {
        if (this.harvestRoomDrop(resource)) {
            return;
        }

        if (this.harvestRoomTombstone(resource)) {
            return;
        }


        let container: StructureContainer | undefined;

        let sources = this.creep.room.getOrFindEnergieSource();

        if (!this.memory.harvestContainerId && sources.length > 0) {
            sources.forEach(source => {
                if (source.containerId) {

                    if (!container) {
                        container = Game.getObjectById(source.containerId) as StructureContainer;
                    } else {
                        let newContainer = Game.getObjectById(source.containerId) as StructureContainer;
                        if (newContainer && container.store[RESOURCE_ENERGY] < newContainer.store[RESOURCE_ENERGY]) {
                            container = newContainer;
                        }
                    }
                }
            })
            this.memory.harvestContainerId = container?.id;
        }

        if (!container) {
            if (this.memory.harvestContainerId) {
                container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;
            } else {
                container = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_CONTAINER &&
                            (structure as StructureContainer).store[RESOURCE_ENERGY] > 0;
                    }
                }) as StructureContainer | undefined;
            }
        }

        if (container) {

            if (container.store[RESOURCE_ENERGY] > this.creep.store.getCapacity() * 0.5) {
                this.memory.harvestContainerId = container.id;

                let state = this.creep.withdraw(container, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(container);
                        return;
                    case ERR_NOT_ENOUGH_RESOURCES:
                    case ERR_NOT_ENOUGH_ENERGY:
                    case OK:
                        this.memory.harvestContainerId = undefined;
                        return;
                }
            } else {
                this.memory.harvestContainerId = undefined;
            }
        }
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [CARRY, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();


        const setCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];

        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(25, maxSets);

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

    public override getMaxCreeps(workroom: string): number {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        return room.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        return Memory.rooms[workroom].state > eRoomState.phase1;

    }

}