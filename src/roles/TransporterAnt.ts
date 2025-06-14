import {Ant} from "./Ant";
import _ from "lodash";


export class TransporterAnt extends Ant {
    doJob(creep: Creep): void {
        this.checkHarvest(creep);
        if (creep.memory.state == eJobState.harvest) {

            const containerId = creep.memory.containerId;

            if (containerId) {
                let container = Game.getObjectById(containerId);

                if (container?.structureType == STRUCTURE_CONTAINER) {
                    if (container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(container);
                            return;
                        }
                    } else {
                        creep.say('📦🚫');
                    }

                } else {
                    creep.memory.containerId = undefined;
                    //creep löschen?
                }
            }
        } else {
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (targets.length > 0) {
                const target = creep.pos.findClosestByRange(targets);
                if (target && creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }
        }
    }

    public getProfil(): BodyPartConstant[] {
        return [CARRY, CARRY, MOVE]
    }

    public override getSpawnMemory(spawn: StructureSpawn, roomname: string): CreepMemory {
        const workroom = Game.rooms[roomname];
        const job = this.getJob();
        const sources = workroom.getOrFindSource();
        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == job &&
            creep.memory.workroom == workroom.name
        );

        let containerId: Id<StructureContainer> | undefined = undefined;
        for (let s of sources) {

            let found = false;

            for (let creep of creeps) {
                if (creep.memory.containerId === s.containerId) {
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
            ticktToPos: 1,
            state: eJobState.harvest,
            workroom: workroom.name,
            energySourceId: undefined,
            containerId: containerId,
            linkId: undefined,
            buildId: undefined,
            onPosition: false,
            finalLocation: undefined,
            roundRobin: undefined,
        }
    }

    public override getJob(): eJobType {
        return eJobType.transporter;
    }

    protected getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindSource().length || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state > eRoomState.phase1;

    }

}