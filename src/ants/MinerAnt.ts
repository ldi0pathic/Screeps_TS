import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class MinerAnt extends Ant {

    private getOrFindSourceIds(workroom: Room): Id<Source>[] {
        let ids = workroom.memory.energySourceIds;

        if (ids && ids.length > 0) {
            return ids;
        }

        const source = Game.rooms[workroom.name].find(FIND_SOURCES)
        workroom.memory.energySourceIds = []
        for (let s of source) {
            workroom.memory.energySourceIds.push(s.id);
        }

        return workroom.memory.energySourceIds;
    }

    protected getMaxCreeps(workroom: Room): number {
        return this.getOrFindSourceIds(workroom).length;
    }

    protected override getMinLiveTicks(spawn: StructureSpawn, workroom: Room): number {
        //todo Miner soll zeit zu Source sichern

        if (workroom.name == spawn.room.name) {
            return 150;
        }

        return 250
    }

    protected override getSpawnOptions(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): SpawnOptions {

        const job = this.getJob();
        const sourceIds = this.getOrFindSourceIds(workroom);

        let source: Id<Source> | undefined = undefined;
        for (let sourceId of sourceIds) {

            let found = false;

            for (let creep of creeps) {
                if (creep.memory.energySourceId === sourceId) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                source = sourceId;
                break;
            }
        }

        let finalLocation: RoomPosition | undefined = undefined;
        let containerId: Id<StructureContainer> | undefined = undefined;
        let buildId: Id<ConstructionSite> | undefined = undefined;

        if (source) {
            let sourceObj = Game.getObjectById(source);

            finalLocation = sourceObj?.pos;

            if (sourceObj) {
                let container = sourceObj.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];

                if (container) {
                    finalLocation = container.pos;
                    if (container.structureType == STRUCTURE_CONTAINER) {
                        containerId = container.id;
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
                energySourceId: source,
                containerId: containerId,
                buildId: buildId,
                onPosition: false,
                finalLocation: finalLocation,
            }
        }
    }

    protected shouldSpawn(spawn: StructureSpawn, workroom: Room, creeps: Creep[]): boolean {

        const ids = this.getOrFindSourceIds(workroom);

        return roomConfig[workroom.name].sendMiner && ids.length > creeps.length;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    protected getJob(): eJobType {
        return eJobType.miner;
    }

    doJob(creep: Creep): void {
        if (!creep.memory.onPosition) {
            this.goToFinalPos(creep)
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
            }
        }

        if (creep.memory.containerId) {
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
                        creep.suicide()
                        return;
                    }
                    case OK: {
                        return;
                    }
                }
            }
        }
    }
}

