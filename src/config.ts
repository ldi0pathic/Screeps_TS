export interface RoomConfig {
    builderCount: number;
    upgraderCount: number;
    workerCount: number;
    wallbuilderCount: number;
    sendMiner: boolean;
    buildRoads: boolean;
    buildBase: boolean;
    sendRemoteMiner: boolean;
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
};