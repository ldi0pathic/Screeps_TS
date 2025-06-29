import {roomConfig} from "../config";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class UpgraderAnt extends HarvesterAnt<UpgraderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        this.memory.energySourceId = undefined

        const controller = this.creep.room.controller
        if (controller) {
            controller.room.setRoomState(controller);
            if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
            }

        }
        return true;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): UpgraderCreepMemory {
        return {
            job: this.getJob(),
            spawn: spawn.name,
            minTicksToLive: 100,
            state: eJobState.harvest,
            workroom: workroom,
            energySourceId: undefined,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        }
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        //todo sobald link existiert, wird es ein fest positionierter Creep >> neue rolle?

        const availableEnergy = workroom.energyCapacityAvailable;

        const workPerSet = 3;
        const carryPerSet = 2;
        const movePerSet = 2;
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
        return true;
    }
}