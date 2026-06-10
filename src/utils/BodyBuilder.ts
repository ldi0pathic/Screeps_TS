/**
 * Centralized body part formulas per plan 09 and plan 10.
 * All body builders use exact formulas from the throughput reference.
 */
export class BodyBuilder {

    static emergencyWorker(): BodyPartConstant[] {
        return [WORK, CARRY, MOVE];
    }

    static bootstrapWorker(maxEnergy: number): BodyPartConstant[] {
        if (maxEnergy >= 400) return [WORK, WORK, CARRY, MOVE];
        return [WORK, CARRY, MOVE];
    }

    /**
     * Stationary miner body.
     * owned/reserved source: 5 WORK + optional CARRY + 1 MOVE
     * unreserved remote: 3 WORK + CARRY + 1 MOVE
     */
    static miner(ownedOrReserved: boolean, withCarry: boolean = false): BodyPartConstant[] {
        if (ownedOrReserved) {
            const body: BodyPartConstant[] = [WORK, WORK, WORK, WORK, WORK, MOVE];
            if (withCarry) body.splice(5, 0, CARRY);
            return body;
        }
        return [WORK, WORK, WORK, CARRY, MOVE];
    }

    /**
     * Hauler body sized to route.
     * CARRY = ceil(energyPerTick * roundTripTicks / 50)
     * MOVE = ceil(CARRY / 2) on roads, CARRY on plains
     */
    static hauler(energyPerTick: number, roundTripTicks: number, onRoad: boolean = true): BodyPartConstant[] {
        const carry = Math.ceil(energyPerTick * roundTripTicks / 50);
        const move = onRoad ? Math.ceil(carry / 2) : carry;
        const body: BodyPartConstant[] = [];
        for (let i = 0; i < carry; i++) body.push(CARRY);
        for (let i = 0; i < move; i++) body.push(MOVE);
        // Enforce 50-part cap
        return this.cap50(body);
    }

    /** Filler: short-route CARRY+MOVE pairs */
    static filler(pairs: number = 2): BodyPartConstant[] {
        const body: BodyPartConstant[] = [];
        for (let i = 0; i < pairs; i++) {
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    }

    /**
     * Upgrader body scaled by storage energy surplus.
     * workParts = floor((storageEnergy - 20000) / 10000), capped at 15
     */
    static upgrader(storageEnergy: number, rcl8: boolean, linkFed: boolean = false): BodyPartConstant[] {
        let workParts = Math.max(1, Math.floor((storageEnergy - 20000) / 10000));
        if (rcl8) workParts = Math.min(workParts, 15);
        workParts = Math.min(workParts, 25); // global cap before 50-part rule

        const body: BodyPartConstant[] = [];
        for (let i = 0; i < workParts; i++) body.push(WORK);
        if (linkFed) {
            body.push(CARRY);
            body.push(MOVE);
        } else {
            const carry = Math.ceil(workParts / 2);
            const move = Math.ceil(workParts / 2);
            for (let i = 0; i < carry; i++) body.push(CARRY);
            for (let i = 0; i < move; i++) body.push(MOVE);
        }
        return this.cap50(body);
    }

    /** Builder/Repairer body: WORK+CARRY+MOVE triplets */
    static builder(maxEnergy: number): BodyPartConstant[] {
        const triplets = Math.min(Math.floor(maxEnergy / 200), 10);
        const body: BodyPartConstant[] = [];
        for (let i = 0; i < Math.max(1, triplets); i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return this.cap50(body);
    }

    /** Remote miner body */
    static remoteMiner(reserved: boolean): BodyPartConstant[] {
        if (reserved) return [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
        return [WORK, WORK, WORK, CARRY, MOVE, MOVE];
    }

    /** Reserver body: CLAIM + MOVE pairs */
    static reserver(highROI: boolean = false): BodyPartConstant[] {
        if (highROI) return [CLAIM, CLAIM, MOVE, MOVE];
        return [CLAIM, MOVE];
    }

    /** Claimer: single CLAIM + MOVE */
    static claimer(): BodyPartConstant[] {
        return [CLAIM, MOVE];
    }

    /** Basic NPC-defense melee */
    static defenseMelee(): BodyPartConstant[] {
        return [TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE];
    }

    /** Endgame upgrader: 15 WORK link-fed, stationary */
    static endgameUpgrader(maxEnergy: number): BodyPartConstant[] {
        const work = Math.min(15, Math.floor((maxEnergy - 50) / 100));
        const body: BodyPartConstant[] = [];
        for (let i = 0; i < Math.max(1, work); i++) body.push(WORK);
        body.push(CARRY);
        body.push(MOVE);
        return this.cap50(body);
    }

    static bodyCost(body: BodyPartConstant[]): number {
        return body.reduce((sum, part) => sum + BODYPART_COST[part], 0);
    }

    static cap50(body: BodyPartConstant[]): BodyPartConstant[] {
        return body.slice(0, 50);
    }
}
