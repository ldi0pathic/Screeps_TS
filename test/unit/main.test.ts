import {assert} from "chai";
import * as _ from "lodash";
import "../../src/global";
import {loop} from "../../src/main";
import {Game, Memory} from "./mock"

describe("main", () => {
    before(() => {
        // runs before all test in this block
    });

    beforeEach(() => {
        // runs before each test in this block
        // @ts-ignore : allow adding Game to global
        global._ = _;
        // @ts-ignore
        global.Room = Room;
        // @ts-ignore
        global.Creep = Creep;
        // @ts-ignore
        global.Structure = Structure;
        // @ts-ignore
        global.StructureLink = StructureLink;
        // @ts-ignore : allow adding Game to global
        global.Game = _.clone(Game);
        // @ts-ignore : allow adding Memory to global
        global.Memory = _.clone(Memory);
    });

    it("should export a loop function", () => {
        assert.isTrue(typeof loop === "function");
    });

    it("should return void when called with no context", () => {
        // @ts-ignore
        global.eJobType = {miner: 'miner'};
        // @ts-ignore
        global.Jobs = {jobs: {}};
        assert.isUndefined(loop());
    });

    it("Automatically delete memory of missing creeps", () => {
        // @ts-ignore
        global.eJobType = {miner: 'miner'};
        // @ts-ignore
        global.Jobs = {
            jobs: {'miner': {jobPrio: 10}},
            createAnt: () => ({
                doJob: () => {
                }
            })
        };

        Memory.creeps.persistValue = {job: 'miner'};
        Memory.creeps.notPersistValue = {job: 'miner'};

        // @ts-ignore
        global.Game.creeps = {
            persistValue: {
                name: 'persistValue',
                memory: Memory.creeps.persistValue,
                spawning: false,
                fatigue: 0,
                ticksToLive: 1500,
                room: {
                    energyAvailable: 300,
                    // @ts-ignore
                    controller: {ticksToDowngrade: 10000},
                    getOrFindEnergieSource: () => []
                }
            }
        };

        const {CleanUpManager} = require("../../src/manager/CleanUpManager");
        CleanUpManager.cleanMemory();

        assert.isDefined(Memory.creeps.persistValue);
        assert.isUndefined(Memory.creeps.notPersistValue);
    });
});
