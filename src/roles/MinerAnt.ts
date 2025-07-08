import {roomConfig} from "../config";
import _ from "lodash";
import {StationaryAnt} from "./base/StationaryAnt";
import {CreepManager} from "../mngtest/CreepManager";

export class MinerAnt extends StationaryAnt<MinerMemory> {

    doJob(): boolean {
        if (!this.isOnPosition()) {
            if (!this.goToFinalPos()) {
                return true;
            }
            this.creep.say('🚌')
            return true;
        }

        let container: StructureContainer | undefined;
        let constructionSite: ConstructionSite | undefined;
        let link: StructureLink | undefined;
        let targetLinkIds: Id<StructureLink>[] | undefined
        let source: Source | undefined;

        if (this.memory.energySourceId) {
            source = Game.getObjectById(this.memory.energySourceId) as Source | undefined;
            if (!source) {
                this.memory.energySourceId = undefined;
            }
        } else {
            this.creep.say('🚩')
            return false;
        }

        if (this.creep.room.memory.state >= eRoomState.phase5) {
            if (this.memory.linkId) {

                link = Game.getObjectById(this.memory.linkId) as StructureLink | undefined;
                targetLinkIds = this.creep.room.getOrFindTargetLinks();
            } else {
                link = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_LINK}
                })[0] as StructureLink | undefined;
                this.memory.linkId = link?.id;
            }
        }

        if (this.memory.containerId) {
            container = Game.getObjectById(this.memory.containerId) as StructureContainer | undefined;
        } else if (this.memory.containerConstructionId) {
            constructionSite = Game.getObjectById(this.memory.containerConstructionId) as ConstructionSite | undefined;

        }

        if (!container && !constructionSite && source) {

            let container = source.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: {structureType: STRUCTURE_CONTAINER}
            })[0] as StructureContainer | undefined;

            if (container) {
                this.memory.containerId = container.id;
            } else {
                let build = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0];

                if (build) {
                    this.memory.containerConstructionId = build.id;
                } else {
                    this.creep.say("🚩")
                }
            }
        }
        const energyStore = this.creep.store[RESOURCE_ENERGY];
        if (energyStore > 0) {
            if (constructionSite) {
                this.creep.say('🪚');
                this.creep.build(constructionSite)
                return true;
            }

            if (container && container.hits < (container.hitsMax * 0.25)) {
                this.creep.repair(container);
                this.creep.say('🛠️');
                return true;
            }

            if (energyStore >= this.creep.store.getCapacity(RESOURCE_ENERGY)) {

                if (link && (targetLinkIds && targetLinkIds.length > 0)) {

                    let state = this.creep.transfer(link, RESOURCE_ENERGY)

                    switch (state) {
                        case ERR_FULL: {
                            let target: StructureLink | undefined = undefined;
                            for (let targetLinkId of targetLinkIds) {
                                if (!target) {
                                    target = Game.getObjectById(targetLinkId) as StructureLink | undefined;
                                } else {

                                    let newTarget = Game.getObjectById(targetLinkId) as StructureLink | undefined;

                                    if (newTarget && newTarget.store[RESOURCE_ENERGY] < target.store[RESOURCE_ENERGY]) {
                                        target = newTarget;
                                    }
                                }
                            }
                            if (target) {
                                link.transferEnergy(target)
                            }
                            break;
                        }
                        case ERR_NOT_IN_RANGE: {
                            this.memory.linkId = undefined;
                            break;
                        }
                    }
                    return true;
                }

                if (container) {
                    if (container.store.getFreeCapacity() == 0) {
                        if (container.hits < container.hitsMax) {
                            this.creep.repair(container);
                            this.creep.say('🚯🛠️');
                            return true;
                        }
                        this.creep.say('🚯');
                        return true;
                    }
                }
            }
        }

        if (source) {
            switch (this.creep.harvest(source)) {
                case ERR_TIRED:
                case ERR_NOT_ENOUGH_ENERGY: {
                    this.creep.say('😴');

                    if (container) {
                        this.creep.withdraw(container, RESOURCE_ENERGY)
                    }

                    break;
                }
                case OK: {
                    return true;
                }
            }
        }

        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {

        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

        const setCost = BODYPART_COST[WORK];

        const moveCost = 2 * BODYPART_COST[MOVE] + BODYPART_COST[CARRY];
        const maxSets = Math.floor((availableEnergy - moveCost) / setCost);
        const numberOfSets = Math.min(20, maxSets); // Limit auf 8 Sets

        const body: BodyPartConstant[] = [MOVE, MOVE, CARRY];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(WORK);
        }

        return body;
    }


    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): MinerMemory {
        const workroom = Game.rooms[roomname];

        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();

        const creepManager = CreepManager.getInstance();
        const creeps = creepManager.getCreepsByJobAndRoom(job, roomname);

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
            ticksToPos: 1,
            spawn: spawn.name,
            state: eJobState.harvest,
            workRoom: workroom.name,
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

    public override getMaxCreeps(workroom: string): number {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        return room.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (!roomConfig[workroom].sendMiner) {
            return false;
        }

        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length
        } else {
            max = Memory.rooms[workroom].energySources.length
        }
        const job = this.getJob();
        const creepManager = CreepManager.getInstance();
        const countOfCreeps = creepManager.getCreepCountByJobAndRoom(job, workroom);

        return max > countOfCreeps;
    }

}