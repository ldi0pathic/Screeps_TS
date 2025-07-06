import {TransporterAnt} from "../roles/TransporterAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {WorkerAnt} from "../roles/WorkerAnt";
import {BuilderAnt} from "../roles/BuilderAnt";
import {Ant} from "../roles/base/Ant";
import {ScoutAnt} from "../roles/remote/ScoutAnt";
import {WallBuilderAnt} from "../roles/WallBuilderAnt";
import {FillerAnt} from "../roles/FillerAnt";
import {RemoteHarvester} from "../roles/remote/RemoteHarvester";

export class Jobs {
    public static jobs: Record<string, JobDef> = {
        Miner: {antClass: MinerAnt, jobPrio: 11, spawnPrio: 15},
        Transporter: {antClass: TransporterAnt, jobPrio: 30, spawnPrio: 14},
        Filler: {antClass: FillerAnt, jobPrio: 30, spawnPrio: 13},
        Worker: {antClass: WorkerAnt, jobPrio: 11, spawnPrio: 12},
        Upgrader: {antClass: UpgraderAnt, jobPrio: 11, spawnPrio: 11},
        Builder: {antClass: BuilderAnt, jobPrio: 11, spawnPrio: 10},
        Scout: {antClass: ScoutAnt, jobPrio: 1, spawnPrio: 1},
        WallBuilder: {antClass: WallBuilderAnt, jobPrio: 1, spawnPrio: 1},
        RemoteHarvester: {antClass: RemoteHarvester, jobPrio: 1, spawnPrio: 1},
    };

    public static createAnt(jobType: eJobType, creep: Creep): Ant<any> | null {
        const jobDef = this.jobs[jobType];
        if (!jobDef) {
            console.log(`Unknown job: ${jobType}`);
            return null;
        }
        return new jobDef.antClass(creep);
    }

    public static getJobNames(): string[] {
        return Object.keys(this.jobs);
    }

    public static getJobDef(jobName: string): JobDef | undefined {
        return this.jobs[jobName];
    }
}