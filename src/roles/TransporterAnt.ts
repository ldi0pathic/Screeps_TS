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
                    if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(container);
                        return;
                    }
                } else {
                    creep.memory.containerId = undefined;
                }
            }
        } else {
            let spawn = Game.spawns[creep.memory.spawn];
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }

    public getProfil(): BodyPartConstant[] {
        return [CARRY, CARRY, MOVE]
    }

    public override getSpawnOptions(spawn: StructureSpawn, workroom: Room): SpawnOptions {
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
            memory: {
                job: job,
                spawn: spawn.name,
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
    }

    protected onSpawnAction(workroom: Room): void {

    }

    protected getMaxCreeps(workroom: Room): number {
        return workroom.getOrFindSource().length;
    }

    protected getJob(): eJobType {
        return eJobType.transporter;
    }

    protected shouldSpawn(workroom: Room): boolean {

        return workroom.memory.state > eRoomState.phase1;

    }

}