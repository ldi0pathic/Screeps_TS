import {ErrorMapper} from "utils/ErrorMapper";
import {Mem} from "./controller/Memory";
import {Jobs} from "./controller/Jobs";
import {loadExtensions} from "./extensions/loader";

const maxCpu = Game.cpu.limit;
loadExtensions();

export const loop = ErrorMapper.wrapLoop
(() => {

    Jobs.spawn()
    Jobs.doPrioJobs();

    let used = Game.cpu.getUsed();
    if (used >= maxCpu * 0.5) {
        return;
    }


    if (Game.time % 2 === 0) {
        Mem.clean();
    }

    Jobs.doJobs()

    used = Game.cpu.getUsed();
    if (used >= maxCpu) {
        return;
    }


    Jobs.doLowJobs();
});