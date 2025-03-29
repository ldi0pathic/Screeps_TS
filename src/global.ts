const enum eJobType {
    harvester = 'Harvester',
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
}
