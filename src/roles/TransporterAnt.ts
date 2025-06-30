import _ from "lodash";

import {HarvesterAnt} from "./base/HarvesterAnt";


export class TransporterAnt extends HarvesterAnt<TransporterCreepMemory> {
    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        let target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION ||
                    s.structureType === STRUCTURE_TOWER) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (!target) {
            let targets = this.creep.room.controller?.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: (structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER &&
                        (structure as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            })
            if (targets && targets.length > 0) {
                target = targets[0];
            }
        }

        if (!target) {
            let targets = this.creep.room.findAllContainersNearSpawns();
            for (let t of targets) {
                if (target && t.store.getFreeCapacity(RESOURCE_ENERGY) > target.store.getFreeCapacity(RESOURCE_ENERGY)) {
                    target = t;
                } else if (t.store.getFreeCapacity(RESOURCE_ENERGY) > 100) {
                    target = t;
                }
            }
        }

        if (target && this.creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
        
        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [CARRY, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();


        const setCost = BODYPART_COST[CARRY] + BODYPART_COST[MOVE];

        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(13, maxSets);

        const body: BodyPartConstant[] = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }

        return body;
    }

    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): TransporterCreepMemory {
        const workroom = Game.rooms[roomname];
        const job = this.getJob();
        const sources = workroom.getOrFindEnergieSource();
        const creeps = _.filter(Game.creeps, c =>
            c.memory.job == job &&
            c.memory.workroom == workroom.name
        );

        let containerId: Id<StructureContainer> | undefined = undefined;
        for (let s of sources) {

            let found = false;

            for (let creep of creeps) {
                const transporterMemory = creep.memory as TransporterCreepMemory;
                if (transporterMemory.harvestContainerId === s.containerId) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                containerId = s.containerId;

                break;
            }
        }
        return {
            job: job,
            spawn: spawn.name,
            minTicksToLive: 100,
            state: eJobState.harvest,
            workroom: workroom.name,
            harvestContainerId: containerId,
            roundRobin: 1,
            roundRobinOffset: undefined,
            moving: false,
        }
    }

    public override getJob(): eJobType {
        return eJobType.transporter;
    }

    public override getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindEnergieSource().length || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state > eRoomState.phase1;

    }

}