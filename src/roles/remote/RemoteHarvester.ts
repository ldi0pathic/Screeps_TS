import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {roomConfig} from "../../config";
import _ from "lodash";
import {SpawnManager} from "../../manager/SpawnManager";


export class RemoteHarvester extends Ant<RemoteHarvesterMemory> {


    doJob(): boolean {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return true;
        }

        this.checkHarvest();

        if (this.memory.state == eJobState.harvest) {

            if (this.creep.room.name != this.memory.remoteRoom) {
                this.moveToRoom(this.memory.remoteRoom);
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
            if (this.creep.room.name != this.memory.homeRoom) {
                this.moveToRoom(this.memory.homeRoom);
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
            remoteRoom: workroom,
        } as RemoteHarvesterMemory;
    }

    getMaxCreeps(workroom: Room): number {
        return workroom.memory.energySources.length || 0
    }

    getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

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

    override spawn(workroom: Room): boolean {
        const max = this.getMaxCreeps(workroom);
        const job = this.getJob();

        const countOfAnts = _.filter(Game.creeps, (c) =>
            c.memory.job == job &&
            (c.memory as RemoteHarvesterMemory).remoteRoom == workroom.name
        ).length;

        if (countOfAnts >= max) {
            return false;
        }

        if (!this.shouldSpawn(workroom)) {
            return false;
        }

        const dynamicPriority = SpawnManager.getSpawnPriority(job, workroom);
        SpawnManager.addToJobQueue(job, workroom, this.getProfil(workroom), dynamicPriority);

        return false;

    }

    protected shouldSpawn(workroom: Room): boolean {
        if (!roomConfig[workroom.name].sendRemoteMiner) {
            return false;
        }

        const ids = workroom.getOrFindEnergieSource();

        let creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            (creep.memory as RemoteHarvesterMemory).remoteRoom == workroom.name);

        return ids.length > creeps.length;
    }

}