import {Ant} from "./roles/Ant";
import {SourceData} from "./records/SourceData";

export {};


declare global {
    const enum eJobType {
        miner = 'Miner',
        worker = 'Worker',
        upgrader = 'Upgrader',
        builder = 'Builder',
        transporter = 'Transporter'
    }

    const enum eRoomState {
        neutral,
        // gehört niemanden

        phase1,
        //  max 1 Spawn
        //  max 300 Energie
        //  max 0 Extensions

        phase2,
        //  max 1 Spawn
        //  max 550 Energie
        //  max 5 Extensions
        //  Ramparts
        // Walls

        phase3,
        //  max 1 Spawn
        //  max 800 Energie
        //  max 10 Extensions
        //  max 1 Tower

        phase4,
        //  max 1 Spawn
        //  max 1300 Energie
        //  max 20 Extensions
        //  max 1 Tower
        //  Storage

        phase5,
        //  max 1 Spawn
        //  max 1800 Energie
        //  max 30 Extensions
        //  max 2 Tower
        //  max 2 Link
        //  Storage

        phase6,
        //  max 1 Spawn
        //  max 2300 Energie
        //  max 40 Extensions
        //  max 2 Tower
        //  max 3 Link
        //  max 3 Labs 
        //  Storage
        //  Extractor
        // Terminal

        phase7,
        //  max 2 Spawn
        //  max 5600 Energie
        //  max 50 Extensions
        //  max 3 Tower
        //  max 4 Link
        //  max 6 Labs
        //  Storage
        //  Extractor
        // Factory
        // Terminal

        phase8,
        //  max 3 Spawn
        //  max 5600 Energie
        //  max 60 Extensions
        //  max 6 Tower
        //  max 6 Link
        //  max 10 Labs 
        //  Observer
        //  Storage
        //  Extractor
        //  Factory
        //  Nuker
        //  PowerSpawn
        // Terminal

        otherPlayer,
    }

    const enum eJobState {
        harvest,
        work
    }

    interface JobDef {
        ant: Ant<any>;
        jobPrio: number;
        spawnPrio: number
    }

    interface CreepMemory {
        job: eJobType;
        state: eJobState;
        spawn: string;
        workroom: string;
        minTicksToLive: number;
    }

    /**
     * ticktToPos: number;
     *         roundRobin: number | undefined;
     *         cleaning?: boolean;
     *         energySourceId: Id<Source> | undefined;
     *         containerId: Id<StructureContainer> | undefined
     *         linkId: Id<StructureLink> | undefined
     *         buildId: Id<ConstructionSite> | undefined
     *         onPosition: boolean | undefined;
     *         finalLocation: RoomPosition | undefined;
     */
    interface BuilderMemory extends CreepMemory {
        energySourceId: Id<Source> | undefined;
        buildId: Id<ConstructionSite> | undefined
    }

    interface StationaryCreepMemory extends CreepMemory {
        onPosition: boolean;
        ticksToPos: number;
        finalLocation: RoomPosition;
    }

    interface MinerMemory extends StationaryCreepMemory {
        energySourceId: Id<Source> | undefined;
        containerId: Id<StructureContainer> | undefined;
        buildId: Id<ConstructionSite> | undefined;
        linkId: Id<StructureLink> | undefined;
    }

    interface Room {
        setRoomState(controller: StructureController): void;

        getOrFindSource(): SourceData[];
    }

    interface Creep {
        goToFinalPos(): boolean;
    }

    interface SpawnRequest {
        jobKey: eJobType;
        targetRoom: string;
        bodyParts: BodyPartConstant[];
        priority: number;
        timestamp: number;
    }

    interface Memory {
        spawnQueue: SpawnRequest[];
        cleanupQueue: string[];
        cpuHistory: number[];
        lastCpuTick: number;
        lastTickCpu: number;
    }

    interface RoomMemory {
        energySources: SourceData[],
        energySourceIds: Id<Source>[];
        state: eRoomState;
    }
}