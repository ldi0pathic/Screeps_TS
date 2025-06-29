export interface RoomConfig {
    builderCount: number;
    upgraderCount: number;
    workerCount: number;
    sendMiner: boolean;
    buildRoads: boolean;
    buildBase: boolean;
}

export const roomConfig: { [roomName: string]: RoomConfig } = {
    "W5N8": {
        builderCount: 5,
        upgraderCount: 1,
        workerCount: 1,
        sendMiner: true,
        buildRoads: true,
        buildBase: true,
    },
};