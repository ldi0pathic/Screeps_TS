import {Ant} from "../roles/Ant";
import {WorkerAnt} from "../roles/WorkerAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {BuilderAnt} from "../roles/BuilderAnt";
import {roomConfig} from "../config";
import {TransporterAnt} from "../roles/TransporterAnt";


export class Jobs {

    private static jobs: Record<string, JobDef> = {
        Transporter: {ant: new TransporterAnt(), prio: 30},
        Miner: {ant: new MinerAnt(), prio: 11},
        Upgrader: {ant: new UpgraderAnt(), prio: 11},
        Worker: {ant: new WorkerAnt(), prio: 11},
        Builder: {ant: new BuilderAnt(), prio: 11},
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
                delete Memory.creeps[name];
                creep.suicide();
                continue;
            }

            if (creep.memory.roundRobin != undefined) {
                if (Game.time % creep.memory.roundRobin != 0) {
                    continue;
                }
            }

            if (def.prio >= 21) {
                def.ant.doJob(creep);
            } else if (def.prio >= 11) {
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

    static spawn() {
        for (const spawnName in Game.spawns) {
            let spawn = Game.spawns[spawnName];

            if (spawn.spawning) {
                continue;
            }

            for (const name in roomConfig) {
                const room = Game.rooms[name];

                for (let jobName in Jobs.jobs) {
                    let job: Ant = this.jobs[jobName].ant;
                    if (job.spawn(spawn, room)) {
                        break;
                    }
                }
            }
        }
    }
}