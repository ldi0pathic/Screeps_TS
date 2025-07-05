import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";

export class WorkerAnt extends HarvesterAnt<HarvesterCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                    s.structureType === STRUCTURE_EXTENSION) &&
                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        });

        if (target) {
            let state = this.creep.transfer(target, RESOURCE_ENERGY);
            switch (state) {
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(target);
                    return true;
                }
            }

        }

        if (!target) {
            const todo = this.creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {
                filter: (site: ConstructionSite) => {
                    return site.structureType !== STRUCTURE_RAMPART;
                }
            });
            if (todo) {
                if (this.creep.build(todo) === ERR_NOT_IN_RANGE) {
                    this.moveTo(todo);
                }
                return true;
            } else {
                const controller = this.creep.room.controller;
                if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    this.moveTo(controller);
                    return true;
                }
            }
        }

        return true
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): HarvesterCreepMemory {
        return super.createSpawnMemory(spawn, workroom);

    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [WORK, CARRY, MOVE]
    }

    public override getJob(): eJobType {
        return eJobType.worker;
    }

    public override getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].workerCount || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {
        return workroom.memory.state <= eRoomState.phase1;

    }

}