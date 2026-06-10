import {assert} from "chai";
import {BodyBuilder} from "../../src/utils/BodyBuilder";

describe("BodyBuilder", () => {

    describe("emergencyWorker", () => {
        it("returns [WORK, CARRY, MOVE]", () => {
            assert.deepEqual(BodyBuilder.emergencyWorker(), ['work', 'carry', 'move']);
        });
    });

    describe("bootstrapWorker", () => {
        it("returns minimal body when energy < 400", () => {
            assert.deepEqual(BodyBuilder.bootstrapWorker(300), ['work', 'carry', 'move']);
        });
        it("returns 2-WORK body when energy >= 400", () => {
            assert.deepEqual(BodyBuilder.bootstrapWorker(400), ['work', 'work', 'carry', 'move']);
        });
    });

    describe("miner", () => {
        it("owned: 5 WORK + 1 MOVE", () => {
            assert.deepEqual(BodyBuilder.miner(true), ['work','work','work','work','work','move']);
        });
        it("owned with carry: 5 WORK + 1 CARRY + 1 MOVE", () => {
            assert.deepEqual(BodyBuilder.miner(true, true), ['work','work','work','work','work','carry','move']);
        });
        it("unowned remote: 3 WORK + CARRY + MOVE", () => {
            assert.deepEqual(BodyBuilder.miner(false), ['work','work','work','carry','move']);
        });
    });

    describe("hauler", () => {
        it("calculates carry and move from energyPerTick and roundTripTicks (on road)", () => {
            // carry = ceil(10 * 20 / 50) = 4, move = ceil(4/2) = 2
            const body = BodyBuilder.hauler(10, 20, true);
            const carry = body.filter(p => p === 'carry').length;
            const move = body.filter(p => p === 'move').length;
            assert.equal(carry, 4);
            assert.equal(move, 2);
        });
        it("doubles move parts off-road", () => {
            // carry = 4, move = 4 (off-road: move === carry)
            const body = BodyBuilder.hauler(10, 20, false);
            const carry = body.filter(p => p === 'carry').length;
            const move = body.filter(p => p === 'move').length;
            assert.equal(carry, 4);
            assert.equal(move, 4);
        });
        it("caps at 50 parts", () => {
            // very large route: carry = ceil(50 * 200 / 50) = 200 → capped
            const body = BodyBuilder.hauler(50, 200, true);
            assert.isAtMost(body.length, 50);
        });
    });

    describe("filler", () => {
        it("returns pairs × CARRY+MOVE", () => {
            const body = BodyBuilder.filler(2);
            assert.deepEqual(body, ['carry','move','carry','move']);
        });
        it("filler(3) has 3 carry parts", () => {
            const body = BodyBuilder.filler(3);
            assert.equal(body.filter(p => p === 'carry').length, 3);
            assert.equal(body.length, 6);
        });
    });

    describe("upgrader", () => {
        it("scales work parts by storage energy", () => {
            // storageEnergy=50000 → workParts = floor((50000-20000)/10000) = 3
            const body = BodyBuilder.upgrader(50000, false, false);
            const work = body.filter(p => p === 'work').length;
            assert.equal(work, 3);
        });
        it("caps work at 15 for RCL8", () => {
            // storageEnergy=500000 → uncapped = 48, capped at 15 for rcl8
            const body = BodyBuilder.upgrader(500000, true, false);
            const work = body.filter(p => p === 'work').length;
            assert.equal(work, 15);
        });
        it("link-fed upgrader has only 1 CARRY + 1 MOVE overhead", () => {
            const body = BodyBuilder.upgrader(50000, false, true);
            assert.equal(body.filter(p => p === 'carry').length, 1);
            assert.equal(body.filter(p => p === 'move').length, 1);
        });
        it("minimum 1 WORK part when storage is zero", () => {
            const body = BodyBuilder.upgrader(0, false, false);
            assert.isAtLeast(body.filter(p => p === 'work').length, 1);
        });
    });

    describe("builder", () => {
        it("returns at least 1 triplet for any energy", () => {
            const body = BodyBuilder.builder(50);
            assert.deepEqual(body, ['work','carry','move']);
        });
        it("scales triplets up to 10", () => {
            // 3000 energy → triplets = floor(3000/200) = 15, capped at 10
            const body = BodyBuilder.builder(3000);
            assert.equal(body.filter(p => p === 'work').length, 10);
        });
        it("caps at 50 parts", () => {
            assert.isAtMost(BodyBuilder.builder(99999).length, 50);
        });
    });

    describe("remoteMiner", () => {
        it("reserved: 5 WORK + CARRY + 3 MOVE", () => {
            const body = BodyBuilder.remoteMiner(true);
            assert.equal(body.filter(p => p === 'work').length, 5);
            assert.equal(body.filter(p => p === 'move').length, 3);
        });
        it("unreserved: 3 WORK + CARRY + 2 MOVE", () => {
            const body = BodyBuilder.remoteMiner(false);
            assert.equal(body.filter(p => p === 'work').length, 3);
            assert.equal(body.filter(p => p === 'move').length, 2);
        });
    });

    describe("reserver", () => {
        it("standard: [CLAIM, MOVE]", () => {
            assert.deepEqual(BodyBuilder.reserver(false), ['claim', 'move']);
        });
        it("highROI: [CLAIM, CLAIM, MOVE, MOVE]", () => {
            assert.deepEqual(BodyBuilder.reserver(true), ['claim', 'claim', 'move', 'move']);
        });
    });

    describe("endgameUpgrader", () => {
        it("scales WORK to 15 at max energy 1550", () => {
            // work = min(15, floor((1550-50)/100)) = min(15,15) = 15
            const body = BodyBuilder.endgameUpgrader(1550);
            assert.equal(body.filter(p => p === 'work').length, 15);
        });
        it("minimum 1 WORK at low energy", () => {
            const body = BodyBuilder.endgameUpgrader(100);
            assert.isAtLeast(body.filter(p => p === 'work').length, 1);
        });
        it("always ends with CARRY + MOVE", () => {
            const body = BodyBuilder.endgameUpgrader(1550);
            assert.equal(body[body.length - 2], 'carry');
            assert.equal(body[body.length - 1], 'move');
        });
    });

    describe("bodyCost", () => {
        it("calculates cost correctly", () => {
            assert.equal(BodyBuilder.bodyCost(['work', 'carry', 'move']), 200);
        });
        it("empty body costs 0", () => {
            assert.equal(BodyBuilder.bodyCost([]), 0);
        });
        it("5x WORK + MOVE = 550", () => {
            assert.equal(BodyBuilder.bodyCost(['work','work','work','work','work','move']), 550);
        });
    });

    describe("cap50", () => {
        it("leaves short bodies unchanged", () => {
            const body: BodyPartConstant[] = Array(10).fill('work');
            assert.equal(BodyBuilder.cap50(body).length, 10);
        });
        it("truncates bodies over 50", () => {
            const body: BodyPartConstant[] = Array(60).fill('carry');
            assert.equal(BodyBuilder.cap50(body).length, 50);
        });
    });
});
