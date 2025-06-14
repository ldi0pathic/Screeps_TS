import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class BuilderAnt extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);

        if (creep.memory.state == eJobState.harvest) {
            let sourceId = creep.memory.energySourceId;

            if (!sourceId) {
                let source = creep.room.find(FIND_SOURCES);
                if (source.length > 0) {
                    sourceId = source[0].id;
                    creep.memory.energySourceId = sourceId
                } else {
                    return;
                }
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                    return;
                }
            } else {
                creep.memory.energySourceId = undefined
            }

        } else {

            let buildId = creep.memory.buildId;

            if (!buildId) {
                const todos = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (todos.length > 0) {
                    buildId = todos[0].id;
                    creep.memory.buildId = buildId;
                }
            }

            if (buildId) {
                const build = Game.getObjectById(buildId);
                if (build) {
                    creep.say('🪚');
                    if (creep.build(build) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(build);
                    }
                    return;

                }
            } else {
                creep.memory.buildId = undefined;
            }

            if (creep.room.find(FIND_CONSTRUCTION_SITES).length === 0) {
                const controller = creep.room.controller;
                if (controller && creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
            }
        }
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