import {roomConfig} from "../../config";
import _ from "lodash";
import {StationaryAnt} from "../base/StationaryAnt";
import {CreepStorage} from "../../storage/CreepStorage";

export class RemoteMinerAnt extends StationaryAnt<MinerMemory> {

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

        if (this.memory.containerId) {
            container = Game.getObjectById(this.memory.containerId) as StructureContainer | undefined;
            if (!container) this.memory.containerId = undefined;
        }

        if (!this.memory.containerId && this.memory.containerConstructionId) {
            constructionSite = Game.getObjectById(this.memory.containerConstructionId) as ConstructionSite | undefined;
            if (!constructionSite) this.memory.containerConstructionId = undefined;
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
            return [WORK, CARRY, MOVE];
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

        const workCost = BODYPART_COST[WORK];
        const carryCost = BODYPART_COST[CARRY];
        const moveCost = BODYPART_COST[MOVE];

        // Berechne maximale Anzahl WORK unter Berücksichtigung von 1 CARRY und benötigten MOVE
        let maxWork = Math.floor((availableEnergy - carryCost) / (workCost + moveCost / 2));
        maxWork = Math.min(maxWork, 20); // Optional: Limit auf 20 WORK

        const body: BodyPartConstant[] = [];

        // WORK-Teile hinzufügen
        for (let i = 0; i < maxWork; i++) {
            body.push(WORK);
        }

        // MOVE: 1 MOVE pro 2 WORK, aufrunden
        const moveCount = Math.ceil(maxWork / 2);
        for (let i = 0; i < moveCount; i++) {
            body.push(MOVE);
        }

        // Ein einziges CARRY
        body.push(CARRY);

        return body;
    }


    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): MinerMemory {
        const workroom = Game.rooms[roomname];

        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();

        const creepStorage = CreepStorage.getInstance();
        const creeps = creepStorage.getCreepsByJobAndRoom(job, roomname);

        let sourceId: Id<Source> | undefined = undefined;
        let containerId: Id<StructureContainer> | undefined = undefined;
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
            containerConstructionId: buildId,
            onPosition: false,
            finalLocation: finalLocation,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        } as MinerMemory;
    }

    public override getJob(): eJobType {
        return eJobType.remoteMiner;
    }

    public override getMaxCreeps(workroom: string): number {
        const room = Game.rooms[workroom];
        if (!room) {
            return 0;
        }
        return room.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (!roomConfig[workroom].sendMiner || roomConfig[workroom].spawnRoom == undefined) {
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
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        return max > countOfCreeps;
    }

}