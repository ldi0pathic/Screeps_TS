const enum eJobType {
    miner = 'Miner',
    worker = 'Worker',
    upgrader = 'Upgrader',
}

const enum eJobState {
    harvest,
    work
}

interface CreepMemory {
    job: eJobType;
    state: eJobState;

    workroom: string;
    spawn: string;

    energySourceId: Id<Source> | undefined;
    containerId: Id<StructureContainer> | undefined
    buildId: Id<ConstructionSite> | undefined
    onPosition: boolean | undefined;
    finalLocation: RoomPosition | undefined;
}

interface RoomMemory {
    energySourceIds: Id<Source>[];
}   