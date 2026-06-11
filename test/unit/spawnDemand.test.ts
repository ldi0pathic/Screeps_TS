import {assert} from "chai";
import {SpawnDemandManager} from "../../src/manager/SpawnDemandManager";

describe("SpawnDemandManager", () => {

    describe("needsReplacement", () => {
        const makeCreep = (ticksToLive: number) => ({ ticksToLive } as Creep);

        it("returns false when creep has plenty of ticks left", () => {
            // threshold = 10 * 3 + 0 + 10 = 40
            assert.isFalse(SpawnDemandManager.needsReplacement(makeCreep(100), 10));
        });

        it("returns true when creep is below threshold", () => {
            // threshold = 10 * 3 + 0 + 10 = 40
            assert.isTrue(SpawnDemandManager.needsReplacement(makeCreep(39), 10));
        });

        it("returns false when exactly at threshold", () => {
            // threshold = 40; ticksToLive=40 → 40 < 40 is false
            assert.isFalse(SpawnDemandManager.needsReplacement(makeCreep(40), 10));
        });

        it("includes travel ticks in threshold", () => {
            // threshold = 5 * 3 + 30 + 10 = 55
            assert.isTrue(SpawnDemandManager.needsReplacement(makeCreep(54), 5, 30));
            assert.isFalse(SpawnDemandManager.needsReplacement(makeCreep(55), 5, 30));
        });

        it("defaults ticksToLive to 1500 when undefined", () => {
            const creep = {} as Creep; // no ticksToLive
            assert.isFalse(SpawnDemandManager.needsReplacement(creep, 10));
        });

        it("returns true for a body-50 creep near death", () => {
            // threshold = 50 * 3 + 0 + 10 = 160; ticksToLive = 100 → needs replacement
            assert.isTrue(SpawnDemandManager.needsReplacement(makeCreep(100), 50));
        });
    });
});
