import {HarvesterAnt} from "./base/HarvesterAnt";
import {roomConfig} from "../config";

export class WallBuilderAnt extends HarvesterAnt<WallBuilderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            if (this.memory.state == eJobState.harvest) {
                this.memory.repairId = undefined;
                this.memory.constructionId = undefined;
            }
            return true;
        }

        let Repair: Structure | undefined;
        let ConstructionSite: ConstructionSite | undefined;

        if (this.memory.repairId) {
            Repair = Game.getObjectById(this.memory.repairId) as Structure;
        } else {
            if (this.memory.constructionId) {
                ConstructionSite = Game.getObjectById(this.memory.constructionId) as ConstructionSite;
            } else {
                ConstructionSite = this.findBuildTarget() as ConstructionSite | undefined;
            }
            this.memory.constructionId = ConstructionSite?.id;

            if (!ConstructionSite) {
                Repair = this.findRepairTarget();
                this.memory.repairId = Repair?.id;
            }
        }

        if (ConstructionSite) {
            this.creep.say('🪚');
            let status = this.creep.build(ConstructionSite);
            switch (status) {
                case ERR_NOT_IN_RANGE: {
                    this.moveTo(ConstructionSite);
                    break;
                }
                case OK: {
                    const found = this.creep.pos.findInRange(FIND_STRUCTURES, 3, {
                        filter: (structure: Structure) => {
                            return structure.structureType === STRUCTURE_RAMPART && structure.hits < 100;
                        }
                    });
                    if (found.length > 0) {
                        this.memory.repairId = found[0].id;
                        this.memory.constructionId = undefined;
                    }
                }
            }
            return true;
        }

        if (Repair) {
            if (this.creep.repair(Repair) === ERR_NOT_IN_RANGE) {
                this.moveTo(Repair);
            }
            return true;
        }

        return true;
    }

    private findBuildTarget(): ConstructionSite | null {
        const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (site: ConstructionSite) => {
                return site.structureType === STRUCTURE_RAMPART;
            }
        });

        return todos.length > 0 ? todos[0] : null;
    }

    private findRepairTarget(): Structure | undefined {

        const structures = this.creep.room.find(FIND_STRUCTURES, {
            filter: (structure: Structure) => {
                return (structure.structureType === STRUCTURE_WALL ||
                        structure.structureType === STRUCTURE_RAMPART) &&
                    structure.hits < structure.hitsMax;
            }
        });

        if (structures.length === 0) {
            return undefined;
        }

        // Teile in zwei Gruppen: Ramparts unter 100 HP und alle anderen
        const criticalRamparts: Structure[] = [];
        const otherStructures: Structure[] = [];

        for (const structure of structures) {
            if (structure.structureType === STRUCTURE_RAMPART && structure.hits < 100) {
                criticalRamparts.push(structure);
            } else {
                otherStructures.push(structure);
            }
        }

        if (criticalRamparts.length > 0) {
            criticalRamparts.sort((a, b) => a.hits - b.hits);
            return criticalRamparts[0];
        }

        // Alle anderen Strukturen nach HP sortieren
        otherStructures.sort((a, b) => a.hits - b.hits);
        return otherStructures[0];
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): WallBuilderCreepMemory {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        } as WallBuilderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

        const workPerSet = 3;
        const carryPerSet = 2;
        const movePerSet = 2;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];

        const maxSets = Math.floor((availableEnergy - BODYPART_COST[MOVE]) / setCost);
        const numberOfSets = Math.min(7, maxSets);

        const body = [MOVE];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }

        return body;
    }

    public override getJob(): eJobType {
        return eJobType.wallBuilder;
    }

    public override getMaxCreeps(workroom: string): number {
        let max = roomConfig[workroom].wallbuilderCount || 0;

        const room = Game.rooms[workroom];

        if (room && room.storage) {
            if (room.memory.state < eRoomState.phase8 && room.memory.state > eRoomState.phase4) {

                if (room.storage.store[RESOURCE_ENERGY] > 5000) {
                    max++;
                }
                if (room.storage.store[RESOURCE_ENERGY] > 7500) {
                    max++;
                }
            }

            if (room.storage.store[RESOURCE_ENERGY] < 10000) {
                max = 0;
            }
        }

        return max;
    }

    protected shouldSpawn(workroom: string): boolean {
        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }
        const todos = room.find(FIND_STRUCTURES, {
            filter: (structure: Structure) => {
                return (structure.structureType === STRUCTURE_RAMPART ||
                        structure.structureType === STRUCTURE_WALL) &&
                    structure.hits < structure.hitsMax
            }
        });
        return todos.length > 0;
    }
}