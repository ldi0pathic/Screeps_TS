import {Worker} from './creep/Worker';
import {Ant} from "./creep/Ant";
import {Upgrader} from "./creep/Upgrader";

interface Ants {
    [key: string]: Ant;
}

export const jobs: Ants = {
    Worker: new Worker(),
    Upgrader: new Upgrader(),
}