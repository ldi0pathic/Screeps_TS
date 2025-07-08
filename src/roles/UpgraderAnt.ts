import {roomConfig} from "../config";
import _ from "lodash";
import {HarvesterAnt} from "./base/HarvesterAnt";
import {CreepManager} from "../mngtest/CreepManager";


export class UpgraderAnt extends HarvesterAnt<UpgraderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const controller = this.creep.room.controller
        if (controller) {
            if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
            }
            controller.room.setRoomState(controller);
        }

        return true;
    }

    protected override doHarvest(resource: ResourceConstant): void {

        if (this.harvestRoomContainer(resource)) {
            return;
        }

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

        if (resource == RESOURCE_ENERGY) {
            this.harvestEnergySource()
        }
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

    public override getMaxCreeps(workroom: string): number {
        let max = roomConfig[workroom].upgraderCount || 0;

        const room = Game.rooms[workroom];

        if (room && room.storage) {
            if (room.memory.state < eRoomState.phase8 && room.memory.state > eRoomState.phase4) {

                if (room.storage.store[RESOURCE_ENERGY] > 5000) {
                    max++;
                }
                if (room.storage.store[RESOURCE_ENERGY] > 7500) {
                    max++;
                }
            }

            if (room.storage.store[RESOURCE_ENERGY] < 10000) {
                max = 1;
            }
        }

        return max;
    }

    protected shouldSpawn(workroom: string): boolean {
        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }
        const job = this.getJob();
        const creepManager = CreepManager.getInstance();
        const countOfCreeps = creepManager.getCreepCountByJobAndRoom(job, workroom);

        return roomConfig[workroom].upgraderCount > countOfCreeps;
    }
}