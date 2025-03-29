import {WorkerAnt} from './ants/WorkerAnt';
import {Ant} from "./ants/Ant";
import {UpgraderAnt} from "./ants/UpgraderAnt";
import {MinerAnt} from "./ants/MinerAnt";

interface Ants {
    [key: string]: Ant;
}

export const jobs: Ants = {
    Worker: new WorkerAnt(),
    Miner: new MinerAnt(),
    Upgrader: new UpgraderAnt(),
}