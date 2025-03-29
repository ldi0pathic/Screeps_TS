export interface RoomConfig {
    harvesterCount: number;
    upgraderCount: number;
    workerCount: number;
}

export const roomConfig: { [roomName: string]: RoomConfig } = {
    "W5N8": {
        harvesterCount: 0,
        upgraderCount: 2,
        workerCount: 1,
    },
};