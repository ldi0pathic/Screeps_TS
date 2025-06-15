import {Ant} from "./base/Ant";
import {roomConfig} from "../config";

export class BuilderAnt extends Ant<BuilderMemory> {

    doJob(): void {
        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {
            let sourceId = this.memory.energySourceId;

            if (!sourceId) {
                let source = this.creep.room.find(FIND_SOURCES);
                if (source.length > 0) {
                    sourceId = source[0].id;
                    this.memory.energySourceId = sourceId
                } else {
                    return;
                }
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(source);
                    return;
                }
            } else {
                this.memory.energySourceId = undefined
            }

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
                        this.creep.moveTo(build);
                    }
                    return;

                }
            } else {
                this.memory.constructionId = undefined;
            }

            if (this.creep.room.find(FIND_CONSTRUCTION_SITES).length === 0) {
                const controller = this.creep.room.controller;
                if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(controller);
                }
            }
        }
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): BuilderMemory {
        const job = this.getJob();
        return {
            job: job,
            minTicksToLive: 100,
            spawn: spawn.name,
            state: eJobState.harvest,
            workroom: workroom,
            roundRobin: undefined,
        } as BuilderMemory;
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