import {assert} from "chai";
import {RoomLogistics} from "../../src/storage/RoomLogistics";

function makeStore(energy: number, free: number = 1000): any {
    return {
        energy,
        getFreeCapacity: (resource?: string) => resource === 'energy' || resource === undefined ? free : 0,
        getUsedCapacity: (resource?: string) => resource === 'energy' || resource === undefined ? energy : 0,
    };
}

describe("RoomLogistics", () => {
    beforeEach(() => {
        (global as any).Game.rooms = {};
        (global as any).Memory.rooms = {};
        (global as any).Game.getObjectById = (_id: string) => null;
    });

    it("prioritizes spawn and extension targets during spawn deposit", () => {
        const spawnTarget = { id: 'spawn1', structureType: 'spawn', store: makeStore(0, 300) };
        const towerTarget = { id: 'tower1', structureType: 'tower', store: makeStore(100, 900) };
        const room: any = {
            storage: { store: makeStore(5000, 1000) },
            find: (_type: number, opts: any) => [spawnTarget, towerTarget].filter(s => opts.filter(s)),
            getOrFindRoomStorage: () => undefined,
            memory: {},
            name: 'W1N1',
        };

        const targets = RoomLogistics.getEnergyDepositTargets(room, 'spawn', 100);

        assert.deepEqual(targets.map(t => t.id), ['spawn1']);
    });

    it("includes towers and storage targets for hauler deposits after spawn targets", () => {
        const towerTarget = { id: 'tower1', structureType: 'tower', store: makeStore(100, 900) };
        const storageTarget = { id: 'storage1', structureType: 'storage', store: makeStore(5000, 1000) };
        const room: any = {
            storage: storageTarget,
            find: (_type: number, opts: any) => [towerTarget].filter(s => opts.filter(s)),
            getOrFindRoomStorage: () => ({ storageId: 'storage1', storageContainerId: [] }),
            memory: {},
            name: 'W1N1',
        };
        (global as any).Game.getObjectById = (id: string) => id === 'storage1' ? storageTarget : null;

        const targets = RoomLogistics.getEnergyDepositTargets(room, 'hauler', 100);

        assert.deepEqual(targets.map(t => t.id), ['tower1', 'storage1']);
    });
});
