import {roomConfig} from "../config";
import {StationaryAnt} from "./base/StationaryAnt";
import _ from "lodash";


export class UpgraderAnt extends StationaryAnt<UpgraderCreepMemory> {

    doJob(): boolean {

        if (!this.isOnPosition()) {
            if (!this.goToFinalPos()) {
                return true;
            }
        }

        this.checkHarvest();
        if (this.memory.state == eJobState.harvest) {

            let container: StructureContainer | undefined;
            if (this.memory.harvestContainerId) {
                container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;
            } else {
                container = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.structureType === STRUCTURE_CONTAINER &&
                            (structure as StructureContainer).store[RESOURCE_ENERGY] > 0;
                    }
                }) as StructureContainer | undefined;

                if (container && container.structureType == STRUCTURE_CONTAINER) {
                    this.memory.harvestContainerId = container.id;
                }
            }

            if (!container) {
                this.memory.harvestContainerId = undefined;
                return false;
            }

            if (container.store?.getUsedCapacity(RESOURCE_ENERGY) > this.creep.store.getCapacity()) {
                this.memory.harvestContainerId = container.id;

                let state = this.creep.withdraw(container, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(container);
                        return true;
                }
            } else {
                this.creep.say("😴")
            }
        } else {
            if (this.memory.harvestContainerId) {

                let container = Game.getObjectById(this.memory.harvestContainerId) as StructureContainer;

                if (container.hits < (container.hitsMax * 0.75)) {
                    this.creep.repair(container);
                    this.creep.say('🛠️');
                    return true;
                }
            }

            const controller = this.creep.room.controller
            if (controller) {
                controller.room.setRoomState(controller);
                if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                }

            }
        }
        return true;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): UpgraderCreepMemory {
        let room = Game.rooms[workroom];
        let finalLocation: RoomPosition | undefined;
        let containerId: Id<StructureContainer> | undefined = undefined;

        let targets = room.controller?.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_CONTAINER;
            }
        }) as StructureContainer[] | undefined;

        if (targets && targets.length > 0) {
            finalLocation = targets[0].pos;
            containerId = targets[0].id;
        } else {
            finalLocation = room.controller?.pos;
        }

        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            onPosition: false,
            ticksToPos: 0,
            finalLocation: finalLocation,
            harvestContainerId: containerId,
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

    public override getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].upgraderCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        let creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workroom == workroom.name);

        return roomConfig[workroom.name].upgraderCount > creeps.length;
    }
}