import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class BuilderAnt extends HarvesterAnt<BuilderCreepMemory> {

    doJob(): void {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            this.doHarvest(RESOURCE_ENERGY);
        } else {

            let buildId = this.memory.constructionId;

            if (!buildId) {
                const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES);
                if (todos.length > 0) {
                    buildId = todos[0].id;
                    this.memory.constructionId = buildId;
                }
            }

            if (buildId) {
                const build = Game.getObjectById(buildId);
                if (build) {
                    this.creep.say('🪚');
                    if (this.creep.build(build) === ERR_NOT_IN_RANGE) {
                        this.moveTo(build);
                    }
                    return;
                }
                this.memory.constructionId = undefined;
            }

            if (this.creep.room.find(FIND_CONSTRUCTION_SITES).length === 0) {
                const controller = this.creep.room.controller;
                if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                }
            }
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): BuilderCreepMemory {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        } as BuilderCreepMemory;
    }

    public getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.builder;
    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].builderCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {
        const todos = workroom.find(FIND_CONSTRUCTION_SITES);
        return todos.length > 0;
    }
}