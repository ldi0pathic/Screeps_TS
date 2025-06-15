import {Ant} from "./base/Ant";
import {roomConfig} from "../config";

export class UpgraderAnt extends Ant<UpgraderMemory> {

    doJob(): void {
        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            let sourceId = this.memory.energySourceId;

            if (!sourceId) {
                let source = this.creep.room.find(FIND_SOURCES);
                sourceId = source[0].id;
                this.memory.energySourceId = sourceId
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(source);
                }
            } else {
                this.memory.energySourceId = undefined
            }
        } else {

            this.memory.energySourceId = undefined

            const controller = this.creep.room.controller
            if (controller) {
                controller.room.setRoomState(controller);
                if (this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(controller);
                }

            }
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): UpgraderMemory {
        return {
            job: this.getJob(),
            spawn: spawn.name,
            minTicksToLive: 100,
            state: eJobState.harvest,
            workroom: workroom,
            energySourceId: undefined,
            roundRobin: undefined,
        }
    }

    public getProfil(): BodyPartConstant[] {
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