import {WorkerAnt} from './ants/WorkerAnt';
import {Ant} from "./ants/Ant";
import {UpgraderAnt} from "./ants/UpgraderAnt";

interface Ants {
    [key: string]: Ant;
}

export const jobs: Ants = {
    Worker: new WorkerAnt(),
    Upgrader: new UpgraderAnt(),
}