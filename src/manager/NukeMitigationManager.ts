import {CPUManager} from "./CPUManager";
import {MAX_GLOBAL_SITES} from "../layouts/LayoutBuilder";

const MAX_NUKE_SITES_PER_ROOM = 3;
const URGENCY_SLOW = 30000;
const URGENCY_MEDIUM = 10000;
const URGENCY_HIGH = 3000;

export class NukeMitigationManager {

    static runStaggered(ownedRooms: string[]): void {
        if (Game.cpu.bucket < 5000) return;

        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`nuke_mit_${ownedRooms[i]}`, 50, i)) continue;
            const room = Game.rooms[ownedRooms[i]];
            if (!room?.controller?.my) continue;

            const plan = room.memory.nukePlan;
            if (!plan?.active) continue;

            this.runPlan(room, plan);
        }
    }

    private static runPlan(room: Room, plan: NukeMitigationPlan): void {
        const ticksToLand = plan.landAt - Game.time;

        if (ticksToLand <= 0) {
            plan.phase = 'recover';
            plan.active = false;
            return;
        }

        switch (plan.phase) {
            case 'scan':
                this.scanAffected(room, plan);
                plan.phase = 'evacuate';
                break;
            case 'evacuate':
                this.planEvacuation(room, plan, ticksToLand);
                break;
            case 'rebuild':
                this.placeSafeReplacements(room, plan, ticksToLand);
                break;
            case 'survive':
                // Nothing to do — just let economy run
                break;
            case 'recover':
                this.clearInvalidIds(room, plan);
                plan.active = false;
                break;
        }
    }

    private static scanAffected(room: Room, plan: NukeMitigationPlan): void {
        const affected: Id<Structure>[] = [];
        for (const nuke of plan.nukes) {
            const structures = room.find(FIND_STRUCTURES);
            for (const s of structures) {
                if (s.pos.getRangeTo(nuke.x, nuke.y) <= 2) {
                    if (!affected.includes(s.id)) affected.push(s.id);
                }
            }
        }
        plan.affectedStructureIds = affected;

        // Build safe plan: find positions outside nuke range
        plan.safePlan = this.buildSafePlan(room, plan);
        plan.phase = 'evacuate';
    }

    private static buildSafePlan(room: Room, plan: NukeMitigationPlan): NukeMitigationPlan['safePlan'] {
        const safePlan: NukeMitigationPlan['safePlan'] = [];
        const nukePositions = plan.nukes.map(n => ({ x: n.x, y: n.y }));

        // For each threatened critical structure, find a safe relocation
        const criticalTypes: StructureConstant[] = [
            STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_STORAGE, STRUCTURE_EXTENSION, STRUCTURE_LINK
        ];

        for (const id of plan.affectedStructureIds) {
            const s = Game.getObjectById(id);
            if (!s) continue;
            if (!criticalTypes.includes(s.structureType)) continue;

            // Find a safe position (range >= 3 from all nukes)
            for (let x = 5; x < 45; x++) {
                for (let y = 5; y < 45; y++) {
                    const isSafe = nukePositions.every(n => Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) >= 3);
                    if (!isSafe) continue;
                    const terrain = room.getTerrain().get(x, y);
                    if (terrain === TERRAIN_MASK_WALL) continue;
                    // Check no existing structure at pos
                    if (room.lookForAt(LOOK_STRUCTURES, x, y).length > 0) continue;

                    safePlan.push({
                        type: s.structureType,
                        x, y,
                        priority: criticalTypes.indexOf(s.structureType as StructureConstant) + 1,
                    });
                    break;
                }
                if (safePlan.find(sp => sp.type === s.structureType)) break;
            }
        }

        return safePlan.sort((a, b) => a.priority - b.priority);
    }

    private static planEvacuation(room: Room, plan: NukeMitigationPlan, ticksToLand: number): void {
        if (plan.resourceEvacuationDone) {
            plan.phase = 'rebuild';
            return;
        }

        // If no terminal or storage at risk, skip evacuation
        const atRisk = plan.affectedStructureIds.some(id => {
            const s = Game.getObjectById(id);
            return s && (s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_TERMINAL);
        });

        if (!atRisk || ticksToLand > URGENCY_MEDIUM) {
            plan.phase = 'rebuild';
            return;
        }

        plan.resourceEvacuationDone = true;
        plan.phase = 'rebuild';
    }

    private static placeSafeReplacements(room: Room, plan: NukeMitigationPlan, ticksToLand: number): void {
        if (Game.cpu.bucket < 5000) return;

        const globalUsed = Object.keys(Game.constructionSites).length;
        if (globalUsed >= MAX_GLOBAL_SITES - 10) return; // reserve 10 slots for emergency

        const roomSites = room.find(FIND_CONSTRUCTION_SITES).length;
        const canPlace = Math.min(MAX_NUKE_SITES_PER_ROOM - roomSites, MAX_GLOBAL_SITES - 10 - globalUsed);
        if (canPlace <= 0) return;

        let placed = 0;
        for (const sp of plan.safePlan) {
            if (placed >= canPlace) break;
            // Check if already placed
            const existing = room.lookForAt(LOOK_CONSTRUCTION_SITES, sp.x, sp.y).length > 0 ||
                room.lookForAt(LOOK_STRUCTURES, sp.x, sp.y).some(s => s.structureType === sp.type);
            if (existing) continue;

            const result = room.createConstructionSite(sp.x, sp.y, sp.type as BuildableStructureConstant);
            if (result === OK) placed++;
        }

        if (ticksToLand <= URGENCY_HIGH) {
            plan.phase = 'survive';
        }
    }

    private static clearInvalidIds(room: Room, plan: NukeMitigationPlan): void {
        plan.affectedStructureIds = plan.affectedStructureIds.filter(
            id => Game.getObjectById(id) !== null
        );
    }
}
