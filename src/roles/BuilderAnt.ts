import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class BuilderAnt extends HarvesterAnt<BuilderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

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
                return true;
            }
            this.memory.constructionId = undefined;
        }

        if (this.creep.room.find(FIND_CONSTRUCTION_SITES).length === 0) {
            const controller = this.creep.room.controller;
            if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
                return true;
            }
        }
        return true;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): BuilderCreepMemory {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        } as BuilderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
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