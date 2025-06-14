import {ErrorMapper} from "utils/ErrorMapper";
import {loadExtensions} from "./extensions/loader";
import {SpawnController} from "./controller/SpawnController";
import {JobsController} from "./controller/JobsController";
import {CleanUpManager} from "./controller/CleanUpManager";
import {CPUManager} from "./controller/CPUManager";

loadExtensions();

export const loop = ErrorMapper.wrapLoop(() => {
    // CPU History am Tick-Start updaten
    CPUManager.updateHistory();

    if (Game.time % 50 === 0) {
        SpawnController.getQueueStatus();
        CPUManager.getStatus();
    }

    CleanUpManager.cleanMemory();
    SpawnController.processEmergencySpawns();
    SpawnController.findNeededCreeps();
    SpawnController.processSpawns();
    JobsController.doPrioJobs();

    if (!CPUManager.shouldContinue('normal')) {
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    JobsController.doJobs();

    if (!CPUManager.shouldContinue('low')) {
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    JobsController.doLowJobs();
    CleanUpManager.processCleanupQueue();

    // CPU für nächsten Tick speichern
    Memory.lastTickCpu = Game.cpu.getUsed();
});