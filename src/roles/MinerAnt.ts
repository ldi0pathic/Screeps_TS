import {Ant} from "./Ant";
import {roomConfig} from "../config";
import _ from "lodash";

export class MinerAnt extends Ant {

    doJob(creep: Creep): void {
        if (!creep.memory.onPosition) {
            creep.goToFinalPos()
            return;
        }

        if (creep.memory.buildId) {
            this.checkHarvest(creep)
            const build = Game.getObjectById(creep.memory.buildId);
            if (build) {
                if (creep.memory.state == eJobState.work && build.progressTotal > build.progress) {
                    creep.say('🪚');
                    creep.build(build)
                    return;

                }
            } else if (!build) {
                creep.memory.buildId = undefined;
                let container = creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];
                if (container && container.structureType == STRUCTURE_CONTAINER) {
                    creep.memory.containerId = container.id;
                }
            }
        } else if (creep.memory.containerId) {
            const container = Game.getObjectById(creep.memory.containerId);

            if (container) {
                if (container.store.getFreeCapacity() == 0) {
                    creep.say('🚯');
                    return;
                }
            }
        }

        if (creep.memory.energySourceId) {
            const source = Game.getObjectById(creep.memory.energySourceId);
            if (source) {
                switch (creep.harvest(source)) {
                    case ERR_TIRED:
                    case ERR_NOT_ENOUGH_ENERGY: {
                        creep.say('😴');
                        return;
                    }
                    case ERR_NO_BODYPART: {
                       

                        return;
                    }
                    case OK: {
                        return;
                    }
                }
            }
        }
    }

    public getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getSpawnOptions(spawn: StructureSpawn, workroom: Room): SpawnOptions {

        const job = this.getJob();
        const sources = workroom.getOrFindSource();
        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        let sourceId: Id<Source> | undefined = undefined;
        let containerId: Id<StructureContainer> | undefined = undefined;
        let linkId: Id<StructureLink> | undefined = undefined;

        for (let s of sources) {

            let found = false;

            for (let creep of creeps) {
                if (creep.memory.energySourceId === s.sourceId) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                sourceId = s.sourceId;
                containerId = s.containerId;
                linkId = s.linkId;
                break;
            }
        }

        let finalLocation: RoomPosition | undefined = undefined;
        let buildId: Id<ConstructionSite> | undefined = undefined;

        if (containerId) {
            let container = Game.getObjectById(containerId);
            finalLocation = container?.pos;
        } else if (sourceId) {
            let sourceObj = Game.getObjectById(sourceId);

            finalLocation = sourceObj?.pos;

            if (sourceObj) {
                let container = sourceObj.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];

                if (container) {
                    finalLocation = container.pos;
                    if (container.structureType == STRUCTURE_CONTAINER) {
                        containerId = container.id;
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == sourceId) {
                                workroom.memory.energySources[id].containerId = containerId;
                            }
                        }
                    }
                } else {
                    let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                        filter: {structureType: STRUCTURE_CONTAINER}
                    })[0];

                    if (build) {
                        finalLocation = build.pos;
                        if (build.id) {
                            buildId = build.id;
                        }

                    } else {
                        const sourcePos = sourceObj.pos;
                        let adjacentSpots = [];

                        for (let xOffset = -1; xOffset <= 1; xOffset++) {
                            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                                if (xOffset === 0 && yOffset === 0) {
                                    continue;
                                }

                                let x = sourcePos.x + xOffset;
                                let y = sourcePos.y + yOffset;

                                adjacentSpots.push(new RoomPosition(x, y, workroom.name));
                            }
                        }

                        for (let spot of adjacentSpots) {
                            if (spot.createConstructionSite(STRUCTURE_CONTAINER) === OK) {
                                finalLocation = spot;
                                break
                            }
                        }

                        let build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                            filter: {structureType: STRUCTURE_CONTAINER}
                        })[0];

                        if (build) {
                            finalLocation = build.pos;
                            if (build.id) {
                                buildId = build.id;
                            }
                        }

                    }
                }
            }
        }


        return {
            memory: {
                job: job,
                spawn: spawn.name,
                state: eJobState.harvest,
                workroom: workroom.name,
                energySourceId: sourceId,
                containerId: containerId,
                linkId: linkId,
                buildId: buildId,
                onPosition: false,
                finalLocation: finalLocation,
                roundRobin: undefined,
            }
        }
    }

    protected getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindSource().length;
    }


    protected shouldSpawn(workroom: Room): boolean {

        const ids = workroom.getOrFindSource();
        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workroom == workroom.name
        );

        return roomConfig[workroom.name].sendMiner && ids.length > creeps.length;
    }

    protected getJob(): eJobType {
        return eJobType.miner;
    }

}