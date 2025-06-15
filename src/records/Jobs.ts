import {TransporterAnt} from "../roles/TransporterAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {WorkerAnt} from "../roles/WorkerAnt";
import {BuilderAnt} from "../roles/BuilderAnt";
import {Ant} from "../roles/base/Ant";

export class Jobs {
    public static jobs: Record<string, JobDef> = {
        Transporter: {antClass: TransporterAnt, jobPrio: 30, spawnPrio: 10},
        Miner: {antClass: MinerAnt, jobPrio: 11, spawnPrio: 10},
        Upgrader: {antClass: UpgraderAnt, jobPrio: 11, spawnPrio: 10},
        Worker: {antClass: WorkerAnt, jobPrio: 11, spawnPrio: 10},
        Builder: {antClass: BuilderAnt, jobPrio: 11, spawnPrio: 10},
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