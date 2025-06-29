import {roomConfig} from "../config";
import _ from "lodash";
import {StationaryAnt} from "./base/StationaryAnt";

export class MinerAnt extends StationaryAnt<MinerMemory> {

    doJob(): boolean {
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos()) {
                return true;
            }
        }

        if (this.memory.containerConstructionId) {
            this.checkHarvest();
            const build = Game.getObjectById(this.memory.containerConstructionId);
            if (build) {
                if (this.memory.state == eJobState.work && build.progressTotal > build.progress) {
                    this.creep.say('🪚');
                    this.creep.build(build)
                    return true;

                }
            } else if (!build) {
                this.memory.containerConstructionId = undefined;
                let container = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];
                if (container && container.structureType == STRUCTURE_CONTAINER) {
                    this.memory.containerId = container.id;
                }
            }
        } else if (this.memory.containerId) {
            const container = Game.getObjectById(this.memory.containerId);

            if (container) {

                if (container.hits < (container.hitsMax * 0.75)) {
                    if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > (this.creep.store.getCapacity() * 0.95)) {
                        this.creep.repair(container);
                        this.creep.say('🛠️');
                        return true;
                    }
                }

                if (container.store.getFreeCapacity() == 0 && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    if (container.hits < container.hitsMax) {
                        this.creep.repair(container);
                        this.creep.say('🚯🛠️');
                        return true;
                    }
                    this.creep.say('🚯');
                    return true;
                }
            } else {
                this.memory.containerId = undefined;

                let container = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];

                if (container && container.structureType == STRUCTURE_CONTAINER) {
                    this.memory.containerId = container.id;
                } else {
                    let build = this.creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                        filter: {structureType: STRUCTURE_CONTAINER}
                    })[0];
                    if (build) {
                        this.memory.containerConstructionId = build.id;
                    } else {
                        console.log("🚩 Miner braucht Container! ");
                    }
                }
            }
        }

        if (this.memory.energySourceId) {
            const source = Game.getObjectById(this.memory.energySourceId);
            if (source) {
                switch (this.creep.harvest(source)) {
                    case ERR_TIRED:
                    case ERR_NOT_ENOUGH_ENERGY: {
                        this.creep.say('😴');
                    }
                }
            }
        }
        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {

        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.energyCapacityAvailable;

        const workPerSet = 2;
        const carryPerSet = 1;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY]; // 2*100 + 1*50 = 250

        const moveCost = BODYPART_COST[MOVE]; // 50
        const maxSets = Math.floor((availableEnergy - moveCost) / setCost);
        const numberOfSets = Math.min(8, maxSets); // Limit auf 8 Sets

        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
        }
        body.push(MOVE);

        return body;
    }


    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): MinerMemory {
        const workroom = Game.rooms[roomname];

        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();
        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        let sourceId: Id<Source> | undefined = undefined;
        let containerId: Id<StructureContainer> | undefined = undefined;
        let linkId: Id<StructureLink> | undefined = undefined;
        let finalLocation: RoomPosition | undefined = undefined;
        let buildId: Id<ConstructionSite> | undefined = undefined;

        for (let s of sources) {

            let found = false;

            for (let creep of creeps) {
                const minerMemory = creep.memory as MinerMemory;
                if (minerMemory.energySourceId === s.sourceId) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                sourceId = s.sourceId;
                if (s.containerId) {
                    let check = Game.getObjectById(s.containerId);
                    if (check) {
                        containerId = s.containerId;
                    } else {
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == s.sourceId) {
                                workroom.memory.energySources[id].containerId = undefined;
                            }
                        }
                    }

                }

                if (s.linkId) {
                    let check = Game.getObjectById(s.linkId);
                    if (check) {
                        linkId = s.linkId;
                    } else {
                        for (let id in workroom.memory.energySources) {
                            if (workroom.memory.energySources[id].sourceId == s.sourceId) {
                                workroom.memory.energySources[id].linkId = undefined;
                            }
                        }
                    }
                }
                break;
            }
        }

        if (containerId) {
            let container = Game.getObjectById(containerId);
            finalLocation = container?.pos;
        }
        if (!finalLocation && sourceId) {
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
                    containerId = undefined;

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
            job: job,
            minTicksToLive: 100,
            ticksToPos: 1,
            spawn: spawn.name,
            state: eJobState.harvest,
            workroom: workroom.name,
            energySourceId: sourceId,
            containerId: containerId,
            linkId: linkId,
            containerConstructionId: buildId,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,

        } as MinerMemory;
    }

    public override getJob(): eJobType {
        return eJobType.miner;
    }

    protected getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        const ids = workroom.getOrFindEnergieSource();
        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workroom == workroom.name
        );

        return roomConfig[workroom.name].sendMiner && ids.length > creeps.length;
    }

}