import {SourceData} from "./records/SourceData";

interface SpawnRequest {
    jobKey: eJobType;
    targetRoom: Room;
    bodyParts: BodyPartConstant[];
    priority: number;
    timestamp: number;
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
