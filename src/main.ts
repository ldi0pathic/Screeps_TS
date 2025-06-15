import {loadExtensions} from "./extensions/loader";
import {ErrorMapper} from "utils/ErrorMapper";
import {SpawnController} from "./controller/SpawnController";
import {JobsController} from "./controller/JobsController";
import {CleanUpManager} from "./controller/CleanUpManager";
import {CPUManager} from "./controller/CPUManager";

loadExtensions();


export const loop = ErrorMapper.wrapLoop(() => {
    // CPU History am Tick-Start updaten
    CPUManager.updateHistory();

    //CPUManager.getStatus();
    //JobsController.logJobDistribution();
    //SpawnController.getQueueStatus();

    CleanUpManager.cleanMemory();
    SpawnController.processEmergencySpawns();
    SpawnController.findNeededCreeps();
    SpawnController.processSpawns();
    JobsController.doPrioJobs();

    if (!CPUManager.shouldContinue('normal')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    JobsController.doJobs();

    if (!CPUManager.shouldContinue('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    JobsController.doLowJobs();
    CleanUpManager.processCleanupQueue();

    // CPU für nächsten Tick speichern
    Memory.lastTickCpu = Game.cpu.getUsed();


});