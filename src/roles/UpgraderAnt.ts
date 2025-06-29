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
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.upgrader
    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].upgraderCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {
        return true;
    }
}