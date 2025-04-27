import {ErrorMapper} from "utils/ErrorMapper";
import {loadExtensions} from "./extensions/loader";
import {SpawnController} from "./controller/SpawnController";
import {JobsController} from "./controller/JobsController";
import {CleanUpManager} from "./controller/CleanUpManager";

const maxCpu = Game.cpu.limit;
loadExtensions();

export const loop = ErrorMapper.wrapLoop
(() => {

    CleanUpManager.cleanMemory();
    SpawnController.findNeededCreeps();
    SpawnController.processSpawns();
    JobsController.doPrioJobs();

    let used = Game.cpu.getUsed();
    if (used >= maxCpu * 0.4) {
        return;
    }

    JobsController.doJobs()

    used = Game.cpu.getUsed();
    if (used >= maxCpu * 0.8) {
        return;
    }
    JobsController.doLowJobs();
    CleanUpManager.processCleanupQueue();
});