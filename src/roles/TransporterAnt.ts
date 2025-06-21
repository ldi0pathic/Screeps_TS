import {Ant} from "./base/Ant";
import _ from "lodash";
import {Movement} from "../utils/Movement";


export class TransporterAnt extends Ant<TransporterMemory> {
    doJob(): void {

        if (Movement.shouldContinueMoving(this.creep)) {
            Movement.continueMoving(this.creep);
            return;
        }

        this.checkHarvest();
        if (this.memory.state == eJobState.harvest) {

            const containerId = this.memory.harvestContainerId;

            if (containerId) {
                let container = Game.getObjectById(containerId);

                if (container?.structureType == STRUCTURE_CONTAINER) {
                    if (container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        if (this.creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                            this.moveTo(container);
                            return;
                        }
                    } else {
                        this.creep.say('📦🚫');
                    }

                } else {
                    this.memory.harvestContainerId = undefined;
                    //creep löschen?
                }
            }
        } else {
            const target = this.creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN ||
                        s.structureType === STRUCTURE_EXTENSION) &&
                    s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });

            if (target && this.creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                this.moveTo(target);
            }
        }
    }

    public getProfil(): BodyPartConstant[] {
        return [CARRY, CARRY, MOVE]
    }

    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): TransporterMemory {
        const workroom = Game.rooms[roomname];
        const job = this.getJob();
        const sources = workroom.getOrFindSource();
        const creeps = _.filter(Game.creeps, c =>
            c.memory.job == job &&
            c.memory.workroom == workroom.name
        );

        let containerId: Id<StructureContainer> | undefined = undefined;
        for (let s of sources) {

            let found = false;

            for (let creep of creeps) {
                const transporterMemory = creep.memory as TransporterMemory;
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

    protected getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindSource().length || 0;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state > eRoomState.phase1;

    }

}