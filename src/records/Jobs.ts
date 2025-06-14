import {TransporterAnt} from "../roles/TransporterAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {WorkerAnt} from "../roles/WorkerAnt";
import {BuilderAnt} from "../roles/BuilderAnt";

export class Jobs {

    public static jobs: Record<string, JobDef> = {
        Transporter: {ant: new TransporterAnt(), jobPrio: 30, spawnPrio: 10},
        Miner: {ant: new MinerAnt(), jobPrio: 11, spawnPrio: 10},
        Upgrader: {ant: new UpgraderAnt(), jobPrio: 11, spawnPrio: 10},
        Worker: {ant: new WorkerAnt(), jobPrio: 11, spawnPrio: 10},
        Builder: {ant: new BuilderAnt(), jobPrio: 11, spawnPrio: 10},
    };
}