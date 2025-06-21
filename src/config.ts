export interface RoomConfig {
    builderCount: number;
    upgraderCount: number;
    workerCount: number;
    sendMiner: boolean;
    buildRoads: boolean;
}

export const roomConfig: { [roomName: string]: RoomConfig } = {
    "W5N8": {
        builderCount: 1,
        upgraderCount: 1,
        workerCount: 1,
        sendMiner: true,
        buildRoads: true,
    },
};