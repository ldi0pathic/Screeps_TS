import {WorkerAnt} from './ants/WorkerAnt';
import {Ant} from "./ants/Ant";
import {UpgraderAnt} from "./ants/UpgraderAnt";
import {MinerAnt} from "./ants/MinerAnt";
import {BuilderAnt} from "./ants/BuilderAnt";

interface Ants {
    [key: string]: Ant;
}

export const jobs: Ants = {
    Worker: new WorkerAnt(),
    Miner: new MinerAnt(),
    Upgrader: new UpgraderAnt(),
    Builder: new BuilderAnt(),
}