import {loadExtensions} from "./extensions/loader";
import {ErrorMapper} from "utils/ErrorMapper";
import {SpawnManager} from "./manager/SpawnManager";
import {JobsManager} from "./manager/JobsManager";
import {CleanUpManager} from "./manager/CleanUpManager";
import {CPUManager} from "./manager/CPUManager";
import {LayoutManager} from "./manager/LayoutManager";
import {TowerManager} from "./manager/TowerManager";

loadExtensions();

let exportDone = false;
export const loop = ErrorMapper.wrapLoop(() => {
    //console.log("--Loop--");
    /*
        if (!exportDone) {
            LayoutExporter.exportRoomToConsole("W5N8")
            exportDone = true;
        }
     */

    // CPU History am Tick-Start updaten
    CPUManager.updateHistory();

    SpawnManager.processEmergencySpawns();
    SpawnManager.processSpawns();
    SpawnManager.findNeededCreeps();
    JobsManager.doPrioJobs();
    JobsManager.doCriticalJobs();
    TowerManager.runTowers();

    if (!CPUManager.shouldContinue('normal')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    JobsManager.doJobs();

    if (!CPUManager.shouldContinue('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    CleanUpManager.runAllCleanup();
    JobsManager.doLowJobs();


    if (!CPUManager.shouldContinue('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    LayoutManager.run();

    SpawnManager.getStatus()


    // CPU für nächsten Tick speichern
    Memory.lastTickCpu = Game.cpu.getUsed();
});