export interface RoomConfig {
    builderCount: number;
    upgraderCount: number;
    workerCount: number;
    wallbuilderCount: number;
    sendMiner: boolean;
    buildRoads: boolean;
    buildBase: boolean;
    sendRemoteMiner: boolean;
    spawnRoom?: string;
}

export const roomConfig: { [roomName: string]: RoomConfig } = {
    "W5N8": {
        builderCount: 2,
        upgraderCount: 1,
        workerCount: 1,
        wallbuilderCount: 1,
        sendMiner: true,
        buildRoads: true,
        buildBase: true,
        sendRemoteMiner: false,
    },
    "W4N8": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W5N9": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W6N8": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    },
    "W5N7": {
        builderCount: 0,
        upgraderCount: 0,
        workerCount: 0,
        wallbuilderCount: 0,
        sendMiner: false,
        buildRoads: false,
        buildBase: false,
        sendRemoteMiner: true,
        spawnRoom: "W5N8"
    }
};