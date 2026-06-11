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

            if (container && container.hits < (container.hitsMax * 0.8)) {
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
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(source);
                    return true;
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
        const creepStorage = CreepStorage.getInstance();
        const creeps = creepStorage.getCreepsByJobAndRoom(job, roomname);

        const assignedSourceIds = new Set(
            creeps
                .map(creep => (creep.memory as MinerMemory).energySourceId)
                .filter((id): id is Id<Source> => !!id)
        );

        const sourceIds = workroom
            ? workroom.getOrFindEnergieSource().map(source => source.sourceId).filter((id): id is Id<Source> => !!id)
            : (Memory.intel?.[roomname]?.sourceIds ?? []) as Id<Source>[];

        let sourceId = sourceIds.find(id => !assignedSourceIds.has(id));
        if (!sourceId) sourceId = sourceIds[0];

        let containerId: Id<StructureContainer> | undefined = undefined;
        let finalLocation: RoomPosition = new RoomPosition(25, 25, roomname);
        let buildId: Id<ConstructionSite> | undefined = undefined;

        if (workroom && sourceId) {
            const sourceMemory = workroom.getOrFindEnergieSource().find(source => source.sourceId === sourceId);
            if (sourceMemory?.containerId) {
                const check = Game.getObjectById(sourceMemory.containerId);
                if (check) {
                    containerId = sourceMemory.containerId;
                    finalLocation = check.pos;
                } else {
                    sourceMemory.containerId = undefined;
                }
            }

            const sourceObj = Game.getObjectById(sourceId);
            if (!containerId && sourceObj) {
                finalLocation = sourceObj.pos;
                const container = sourceObj.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: {structureType: STRUCTURE_CONTAINER}
                })[0] as StructureContainer | undefined;

                if (container) {
                    containerId = container.id;
                    finalLocation = container.pos;
                    if (sourceMemory) sourceMemory.containerId = containerId;
                } else {
                    const build = sourceObj.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
                        filter: {structureType: STRUCTURE_CONTAINER}
                    })[0];

                    if (build) {
                        buildId = build.id;
                        finalLocation = build.pos;
                    } else {
                        const sourcePos = sourceObj.pos;
                        for (let xOffset = -1; xOffset <= 1; xOffset++) {
                            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                                if (xOffset === 0 && yOffset === 0) continue;
                                const spot = new RoomPosition(sourcePos.x + xOffset, sourcePos.y + yOffset, workroom.name);
                                if (spot.createConstructionSite(STRUCTURE_CONTAINER) === OK) {
                                    finalLocation = spot;
                                    break;
                                }
                            }
                            if (finalLocation.roomName === workroom.name && finalLocation.x !== sourcePos.x && finalLocation.y !== sourcePos.y) break;
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
            workRoom: roomname,
            spawnRoom: spawn.room.name,
            energySourceId: sourceId,
            containerId: containerId,
            containerConstructionId: buildId,
            linkId: undefined,
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
        if (room) {
            return room.getOrFindEnergieSource().length || 0;
        }
        return Memory.intel?.[workroom]?.sourceCount ?? 0;
    }

    protected shouldSpawn(workroom: string): boolean {

        const remote = Memory.remoteIntel?.[workroom];
        if (!remote || (remote.state !== 'candidate' && remote.state !== 'mining')) {
            return false;
        }

        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length
        } else {
            max = remote.sourceCount || Memory.intel?.[workroom]?.sourceCount || 0
        }
        const job = this.getJob();
        const creepStorage = CreepStorage.getInstance();
        const countOfCreeps = creepStorage.getCreepCountByJobAndRoom(job, workroom);

        return max > countOfCreeps;
    }

}