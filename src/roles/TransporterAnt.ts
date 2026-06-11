import {HarvesterAnt} from "./base/HarvesterAnt";
import {roomConfig} from "../config";
import {LinkStorage} from "../storage/LinkStorage";
import {RoomLogistics} from "../storage/RoomLogistics";


export class TransporterAnt extends HarvesterAnt<TransporterCreepMemory> {
    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        let target: AnyStoreStructure | undefined;

        if (this.memory.targetId) {
            target = Game.getObjectById(this.memory.targetId) as AnyStoreStructure | undefined;
            if (!target) this.memory.targetId = undefined;
        }

        if (!target) {
            const purpose = this.creep.room.memory.spawnPrioBlock ? 'spawn' : 'hauler';
            target = RoomLogistics.getBestEnergyDepositTarget(
                this.creep.room,
                this.creep.pos,
                purpose,
                this.creep.store[RESOURCE_ENERGY]
            );
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
                if (!container) this.memory.harvestContainerId = undefined;
            } else {
                container = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
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
        const countOfSources = room.getOrFindEnergieSource().length || 0;
        const links = LinkStorage.getInstance();
        const countOfSourcesLinks = links.getLinksByType(workroom, "source").length || 0

        const result = countOfSources - countOfSourcesLinks;
        return result > 0 ? result : 0;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const roomstate = Memory.rooms[workroom].state;
        if (roomstate > eRoomState.phase1 && roomstate < eRoomState.phase5) {
            return true;
        }
        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }
        const countOfSources = room.getOrFindEnergieSource().length || 0;
        const links = LinkStorage.getInstance();
        const countOfSourcesLinks = links.getLinksByType(workroom, "source").length || 0

        return countOfSources > countOfSourcesLinks;

    }

}