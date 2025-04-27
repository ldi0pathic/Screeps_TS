import {SourceData} from "./records/SourceData";

interface JobDef {
    ant: import("./roles/Ant").Ant;
    jobPrio: number;
    spawnPrio: number;
}


interface RoomConfig {
    [roomName: string]: any;
}

interface Room {
    setRoomState(controller: StructureController): void;

    getOrFindSource(): SourceData[];
}

interface Creep {
    goToFinalPos(): void;
}


interface RoomMemory {
    energySources: SourceData[],
    energySourceIds: Id<Source>[];
    state: eRoomState;
}
