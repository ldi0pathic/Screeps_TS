export interface RoomConfig {
    upgraderCount: number;
    workerCount: number;
    sendMiner: boolean;
}

export const roomConfig: { [roomName: string]: RoomConfig } = {
    "W5N8": {
        upgraderCount: 1,
        workerCount: 1,
        sendMiner: true
    },
};