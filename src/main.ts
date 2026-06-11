import {loadExtensions} from "./extensions/loader";
import {ErrorMapper} from "utils/ErrorMapper";
import {SpawnManager} from "./manager/SpawnManager";
import {JobsManager} from "./manager/JobsManager";
import {CleanUpManager} from "./manager/CleanUpManager";
import {CPUManager} from "./manager/CPUManager";
import {LayoutManager} from "./manager/LayoutManager";
import {TowerManager} from "./manager/TowerManager";
import {RoomManager} from "./manager/RoomManager";
import {RoomPhaseManager} from "./manager/RoomPhaseManager";
import {IntelManager} from "./manager/IntelManager";
import {DefenseManager} from "./manager/DefenseManager";
import {SpawnDemandManager} from "./manager/SpawnDemandManager";
import {RemotePlanner} from "./manager/RemotePlanner";
import {ScoutPlanner} from "./manager/ScoutPlanner";
import {NukeMitigationManager} from "./manager/NukeMitigationManager";
import {AntFactory} from "./roles/AntFactory";


loadExtensions();

export const loop = ErrorMapper.wrapLoop(() => {

    // --- CRITICAL (always runs) ---
    CPUManager.updateHistory();
    AntFactory.clearCache();

    // Collect owned rooms once per tick for stagger indexing
    const ownedRooms: string[] = [];
    for (const name in Game.rooms) {
        const room = Game.rooms[name];
        if (room.controller?.my) {
            ownedRooms.push(name);
            if (room.memory.roomIndex === undefined) {
                room.memory.roomIndex = ownedRooms.length - 1;
            }
        }
    }

    DefenseManager.runCritical(ownedRooms);
    SpawnManager.processEmergencySpawns();
    SpawnManager.processSpawns();
    if (Memory.config?.enableLegacySpawnSweep) {
        SpawnManager.findNeededCreeps();
    }
    JobsManager.doPrioJobs();
    JobsManager.doCriticalJobs();
    TowerManager.runTowers();

    // --- NORMAL (skip when CPU is low) ---
    if (!CPUManager.canRunTier('normal')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    RoomPhaseManager.updateStaggered(ownedRooms);
    SpawnDemandManager.run(ownedRooms);

    CPUManager.measure('roomManager', () => RoomManager.run());
    JobsManager.doJobs();

    // --- LOW (first to be dropped under pressure) ---
    if (!CPUManager.canRunTier('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    CleanUpManager.runAllCleanup();
    JobsManager.doLowJobs();

    if (!CPUManager.canRunTier('low')) {
        CPUManager.getStatus();
        Memory.lastTickCpu = Game.cpu.getUsed();
        return;
    }

    IntelManager.scanStaggered(ownedRooms);
    RemotePlanner.runStaggered(ownedRooms);
    ScoutPlanner.discoverFrontier(ownedRooms);
    ScoutPlanner.refreshShortlisted();
    if (Game.cpu.bucket >= 3000) {
        DefenseManager.scanNukesStaggered(ownedRooms);
        NukeMitigationManager.runStaggered(ownedRooms);
    }

    // Skip LayoutManager when bucket is critically low
    if (Game.cpu.bucket >= 3000) {
        CPUManager.measure('layout', () => LayoutManager.run());
    }

    Memory.lastTickCpu = Game.cpu.getUsed();
});
