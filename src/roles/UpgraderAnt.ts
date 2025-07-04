import {roomConfig} from "../config";
import {StationaryAnt} from "./base/StationaryAnt";
import _ from "lodash";
import {Ant} from "./base/Ant";
import {Movement} from "../utils/Movement";


export class UpgraderAnt extends Ant<UpgraderCreepMemory> {

    doJob(): boolean {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        this.checkHarvest();
        if (this.memory.state == eJobState.harvest) {

            let harvest: AnyStoreStructure | undefined;
            if (this.memory.harvestId) {
                harvest = Game.getObjectById(this.memory.harvestId) as AnyStoreStructure;
            } else {
                harvest = this.creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_CONTAINER ||
                                structure.structureType == STRUCTURE_STORAGE) &&
                            (structure as AnyStoreStructure).store[RESOURCE_ENERGY] > 0;
                    }
                }) as AnyStoreStructure | undefined;

                this.memory.harvestId = harvest?.id;
            }

            if (harvest) {
                let state = this.creep.withdraw(harvest, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(harvest);
                        return true;
                }
            }

        } else {
            this.memory.harvestId = undefined;
            const controller = this.creep.room.controller
            if (controller) {
                if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                }
                controller.room.setRoomState(controller);
            }
        }
        return true;
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

    public override getMaxCreeps(workroom: Room): number {
        let max = roomConfig[workroom.name].upgraderCount || 0;

        if (workroom.memory.state < eRoomState.phase8 && workroom.memory.state > eRoomState.phase4 && workroom.storage) {

            if (workroom.storage.store[RESOURCE_ENERGY] > 5000) {
                max++;
            }
            if (workroom.storage.store[RESOURCE_ENERGY] > 7500) {
                max++;
            }
        }

        return max;
    }

    protected shouldSpawn(workroom: Room): boolean {

        let creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workroom == workroom.name);

        return roomConfig[workroom.name].upgraderCount > creeps.length;
    }
}