import {Ant} from "../roles/Ant";
import {WorkerAnt} from "../roles/WorkerAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {BuilderAnt} from "../roles/BuilderAnt";
import {TransporterAnt} from "../roles/TransporterAnt";
import {CleanUpManager} from "./CleanUpManager";


export class JobsController {

    public static jobs: Record<string, JobDef> = {
        Transporter: {ant: new TransporterAnt(), jobPrio: 30, spawnPrio: 10},
        Miner: {ant: new MinerAnt(), jobPrio: 11, spawnPrio: 10},
        Upgrader: {ant: new UpgraderAnt(), jobPrio: 11, spawnPrio: 10},
        Worker: {ant: new WorkerAnt(), jobPrio: 11, spawnPrio: 10},
        Builder: {ant: new BuilderAnt(), jobPrio: 11, spawnPrio: 10},
    };

    private static bucketNorm: Array<{ creep: Creep; ant: Ant }> = [];
    private static bucketLow: Array<{ creep: Creep; ant: Ant }> = [];

    static doPrioJobs() {
        this.bucketNorm.length = 0;
        this.bucketLow.length = 0;

        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const def = this.jobs[creep.memory.job];

            if (!def) {
                CleanUpManager.addToCleanupQueue(name);
                continue;
            }

            if (creep.memory.roundRobin != undefined) {
                if (Game.time % creep.memory.roundRobin != 0) {
                    continue;
                }
            }

            if (def.jobPrio >= 21) {
                def.ant.doJob(creep);
            } else if (def.jobPrio >= 11) {
                this.bucketNorm.push({creep, ant: def.ant});
            } else {
                this.bucketLow.push({creep, ant: def.ant});
            }
        }
    }

    static doJobs() {
        for (const {creep, ant} of this.bucketNorm) {
            ant.doJob(creep);
        }
    }

    static doLowJobs() {
        for (const {creep, ant} of this.bucketLow) {
            ant.doJob(creep);
        }
    }
}