import {Ant} from "./roles/base/Ant";
import {EnergieSourceData} from "./records/EnergieSourceData";
import {MineralSourceData} from "./records/MineralSourceData";

export {};


declare global {
    const enum eJobType {
        miner = 'Miner',
        worker = 'Worker',
        upgrader = 'Upgrader',
        builder = 'Builder',
        transporter = 'Transporter',
        scout = 'Scout',
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
        invader
    }

    const enum eJobState {
        harvest,
        work
    }

    interface JobDef {
        antClass: new (creep: Creep) => Ant<any>;
        jobPrio: number;
        spawnPrio: number;
    }

    interface CreepMemory {
        job: eJobType;
        state: eJobState;
        spawn: string;
        workroom: string;
        minTicksToLive: number;
        roundRobin: number;
        roundRobinOffset?: number;
        moving: boolean;
        targetPos?: {
            x: number;
            y: number;
            roomName: string;
        };

        lastJobCost?: number;
        jobEfficiency?: number;
        emergencySkipped?: boolean;
        priorityBoost?: number;
    }

    interface BuilderCreepMemory extends HarvesterCreepMemory {
        constructionId: Id<ConstructionSite> | undefined;
    }

    interface StationaryCreepMemory extends CreepMemory {
        onPosition: boolean;
        ticksToPos: number;
        finalLocation: RoomPosition;
    }

    interface HarvesterCreepMemory extends CreepMemory {
        harvestContainerId?: Id<StructureContainer>;
        harvestStorageId?: Id<StructureStorage>;
        havestSourceId?: Id<Source>;
        havestLinkId?: Id<StructureLink>;
        harvestDroppedId?: Id<Resource>;
        harvestTombstoneId?: Id<Tombstone>;
    }

    interface TransporterCreepMemory extends CreepMemory {
        harvestContainerId: Id<StructureContainer> | undefined;
    }

    interface UpgraderCreepMemory extends CreepMemory {
        energySourceId: Id<Source> | undefined;
    }

    interface ScoutCreepMemory extends CreepMemory {
        scoutRoom?: string;
    }


    interface MinerMemory extends StationaryCreepMemory {
        energySourceId: Id<Source> | undefined;
        containerId: Id<StructureContainer> | undefined;
        containerConstructionId: Id<ConstructionSite> | undefined;
        linkId: Id<StructureLink> | undefined;
    }

    interface Room {
        setRoomState(controller: StructureController): void;

        getOrFindEnergieSource(): EnergieSourceData[];

        getOrFindMineralSource(): MineralSourceData[];
    }

    interface Creep {
        goToFinalPos(): boolean;

        findNearestContainerWithResource(resourceType: ResourceConstant): StructureContainer | null;
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
        jobOffsets?: Record<string, number>;
        jobCosts?: Record<string, JobCostStats>;
        jobPerformance?: JobPerformanceData;
        emergencyMode?: EmergencyModeData;
    }

    interface JobCostStats {
        total: number;
        count: number;
        avg: number;
        lastReset: number;
        peak: number;
    }

    interface JobPerformanceData {
        lastTick: number;
        ticksWithHighCPU: number;
        totalEmergencyActivations: number;
        lastEmergencyTick: number;
        avgCreepsPerTick: number;
        cpuHistory: number[];
    }

    interface EmergencyModeData {
        active: boolean;
        activatedTick: number;
        reason: 'cpu_critical' | 'bucket_low' | 'manual';
        skipCount: number;
        criticalJobsOnly: boolean;
    }

    interface RoomMemory {
        energySources: EnergieSourceData[],
        mineralSources: MineralSourceData[],
        state: eRoomState;
        scoutState?: eRoomState;
        plannedRoads?: string[];
        plannedBuildings?: PlannedBuilding[];
        spawnPrioBlock?: boolean;
    }

    interface PlannedBuilding {
        x: number;
        y: number;
        structureType: BuildableStructureConstant;
        phase: eRoomState;
    }

    interface Position {
        x: number;
        y: number;
    }

    interface BuildingPositions {
        [key: string]: Position[];
    }

    interface TerrainData {
        wall: Position[];
        swamp: Position[];
    }

    interface MineralData {
        mineralType: MineralConstant;
        x: number;
        y: number;
    }

    interface RoomLayout {
        rcl: number;
        buildings: BuildingPositions;
        controller: Position | null;
        terrain: TerrainData;
        sources: Position[];
        mineral: MineralData | null;
    }

    interface MinRoomLayout {
        buildings: BuildingPositions;
    }

    interface BuildResult {
        success: number;
        failed: number;
        errors: string[];
    }

}