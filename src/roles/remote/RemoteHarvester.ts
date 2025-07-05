import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";
import _ from "lodash";


export class RemoteHarvester extends Ant<RemoteHarvesterMemory> {


    doJob(): boolean {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {

            if (this.creep.room.name != this.memory.workRoom) {
                this.moveToRoom(this.memory.workRoom);
                return true;
            }

            let Source: Source | undefined;

            if (this.memory.energySourceId) {
                Source = Game.getObjectById(this.memory.energySourceId) as Source | undefined;
            } else {
                let sources = this.creep.room.getOrFindEnergieSource();

                if (sources.length == 1) {
                    Source = Game.getObjectById(sources[0].sourceId) as Source | undefined;
                } else {

                    for (let source of sources) {

                        if (!Source) {
                            Source = Game.getObjectById(source.sourceId) as Source | undefined;
                        } else {
                            let newSource = Game.getObjectById(source.sourceId) as Source | undefined;
                            if (newSource && newSource.energy > Source.energy) {
                                Source = newSource;
                            }
                        }
                    }
                }
                this.memory.energySourceId = Source?.id;
            }

            if (Source) {
                let state = this.creep.harvest(Source);
                switch (state) {
                    case ERR_TIRED:
                    case ERR_NOT_ENOUGH_ENERGY: {
                        this.creep.say('😴');
                        return true;
                    }
                    case ERR_NOT_IN_RANGE:
                        this.moveTo(Source);
                        return true;
                    default: {
                        return true;
                    }
                }
            }
        } else {
            if (this.creep.room.name != this.memory.spawnRoom) {
                this.moveToRoom(this.memory.spawnRoom);
                return true;
            }

            let target: AnyStoreStructure | undefined;

            if (this.memory.targetId) {
                target = Game.getObjectById(this.memory.targetId) as AnyStoreStructure | undefined;
            }

            if (!target) {

                if (this.creep.room.storage && this.creep.room.storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                    target = this.creep.room.storage;
                }

                if (!target) {
                    const roomStorage = this.creep.room.getOrFindRoomStorage();
                    if (roomStorage) {
                        const allStructures = [
                            ...(roomStorage.storageContainerId?.map(id => Game.getObjectById(id) as AnyStoreStructure) || [])
                        ].filter(structure => structure && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

                        target = this.creep.pos.findClosestByPath(allStructures) as AnyStoreStructure;
                    }
                }

            }

            if (target) {
                let state = this.creep.transfer(target, RESOURCE_ENERGY);
                switch (state) {
                    case ERR_NOT_IN_RANGE: {
                        this.memory.targetId = target.id;
                        this.moveTo(target);
                        break
                    }
                    case ERR_FULL:
                    case OK: {
                        this.memory.targetId = undefined;
                        break
                    }
                }
            }
        }
        return true;
    }

    private moveToRoom(room: string): void {
        const exitDir = this.creep.room.findExitTo(room);

        if (exitDir !== ERR_NO_PATH && exitDir !== ERR_INVALID_ARGS) {
            const exit = this.creep.pos.findClosestByRange(exitDir);
            if (exit) {
                this.moveTo(exit, {
                    visualizePathStyle: {stroke: '#ff0000'},
                    reusePath: 50
                });
            }
        }
    }

    getJob(): eJobType {
        return eJobType.remoteHarvester;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): RemoteHarvesterMemory {
        let base = super.createSpawnMemory(spawn, spawn.room.name);
        return {
            ...base,
        } as RemoteHarvesterMemory;
    }

    getMaxCreeps(workroom: string): number {
        return Memory.rooms[workroom].energySources.length || 0
    }

    getProfil(spawnRoom: Room): BodyPartConstant[] {
        if (spawnRoom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = spawnRoom.getMaxAvailableEnergy();

        const setCost = BODYPART_COST[WORK] + BODYPART_COST[CARRY] + 2 * BODYPART_COST[MOVE];

        const maxSets = Math.floor((availableEnergy) / setCost);
        const numberOfSets = Math.min(6, maxSets);

        const body: BodyPartConstant[] = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            body.push(MOVE);
        }

        return body;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (!roomConfig[workroom].sendRemoteMiner) {
            return false;
        }

        let room = Game.rooms[workroom];
        let max = 0;
        if (room) {
            max = room.getOrFindEnergieSource().length
        } else {
            max = Memory.rooms[workroom].energySources.length
        }
        let creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workRoom == workroom);

        return max > creeps.length;
    }

}