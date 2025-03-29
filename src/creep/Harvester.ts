import {Ant} from "./Ant";
import {roomConfig} from "../config";

export class Harvester extends Ant {

    protected getMaxCreeps(workroom: Room): number {
        return roomConfig[workroom.name].harvesterCount;
    }

    protected shouldSpawn(spawn: StructureSpawn): boolean {
        return false;
    }

    protected getProfil(): BodyPartConstant[] {
        return [WORK];
    }

    protected getJob(): eJobType {
        return eJobType.harvester;
    }

    doJob(creep: Creep): void {
        throw new Error("Method not implemented.");
    }

}

