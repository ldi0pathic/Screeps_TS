import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class BuilderAnt extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);

        if (creep.memory.state == eJobState.harvest) {
            let sourceId = creep.memory.energySourceId;

            if (!sourceId) {
                let source = creep.room.find(FIND_SOURCES);
                sourceId = source[0].id;
                creep.memory.energySourceId = sourceId
            }

            let source = Game.getObjectById(sourceId)

            if (source) {
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(source);
                    return;
                }
            }

            creep.memory.energySourceId = undefined

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
                    if (creep.build(build) == OK) {
                        return;
                    }
                }
            }
            
            creep.memory.buildId = undefined;

        }
    }

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].builderCount;
    }

    protected getJob(): eJobType {
        return eJobType.builder;
    }

    protected shouldSpawn(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): boolean {
        const todos = workroom.find(FIND_CONSTRUCTION_SITES);
        return todos.length > 0;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }
}