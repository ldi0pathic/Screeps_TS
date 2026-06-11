import {assert} from "chai";
import {SpawnDemandManager} from "../../src/manager/SpawnDemandManager";

describe("SpawnDemandManager remote demand", () => {
    beforeEach(() => {
        (global as any).Game.creeps = {};
        (global as any).Game.spawns = { Spawn1: { owner: { username: 'me' } } };
        (global as any).Game.time = 1000;
        (global as any).Memory.intel = {
            W1N2: {
                scannedAt: 1000,
                owner: null,
                reservation: null,
                sourceIds: ['source1', 'source2'],
                sourceCount: 2,
                sourceSlots: [3, 3],
                storageId: null,
                linkIds: [],
                invaderCore: false,
                coreExpires: 0,
                threat: 'none',
                threatExpires: 0,
                status: 'normal',
                routeDistance: 1,
                lastPlayerActivity: 0,
            }
        };
        (global as any).Memory.remoteIntel = {
            W1N2: {
                roomName: 'W1N2',
                state: 'candidate',
                homeRoom: 'W1N1',
                scannedAt: 1000,
                sourceCount: 2,
                reserved: false,
                reservationExpires: 0,
                netIncome: 5,
                routeDistance: 2,
                dangerCooldownUntil: 0,
                invaderCoreExpires: 0,
            }
        };
    });

    it("queues miner, hauler and reserver demands for a safe profitable remote", () => {
        const room: any = { name: 'W1N1' };
        const spawnRoom: any = { name: 'W1N1' };

        const demands = SpawnDemandManager.collectRemoteDemands(room, spawnRoom, 2000);

        assert.sameMembers(demands.map(d => d.role as any), ['RemoteMiner', 'RemoteHauler', 'Reserver']);
        assert.includeMembers(demands.map(d => d.reason), [
            'candidate remote miner missing',
            'remote hauling capacity missing',
            'profitable remote should be reserved',
        ]);
    });

    it("does not queue demands for a player-threatened remote", () => {
        (global as any).Memory.intel.W1N2.threat = 'player';
        (global as any).Memory.intel.W1N2.threatExpires = 1500;

        const demands = SpawnDemandManager.collectRemoteDemands({ name: 'W1N1' } as any, { name: 'W1N1' } as any, 2000);

        assert.deepEqual(demands, []);
    });
});
