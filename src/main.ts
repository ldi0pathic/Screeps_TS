import {ErrorMapper} from "utils/ErrorMapper";
import {Mem} from "./utils/Memory";
import {Jobs} from "./utils/Jobs";

const maxCpu = Game.cpu.limit;

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