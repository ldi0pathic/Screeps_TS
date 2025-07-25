﻿export class TowerManager {

    public static runTowers(): void {
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];

            if (!room.controller?.my) continue;

            const roomMemory = room.memory

            if (!roomMemory.towers || roomMemory.towers.length === 0) {
                roomMemory.towers = room.find(FIND_MY_STRUCTURES, {
                    filter: (s) => s.structureType === STRUCTURE_TOWER
                }).map(t => t.id) as Id<StructureTower>[]

                if (roomMemory.towers.length === 0) continue;
            }

            if (roomMemory.needDefence) {
                const hostiles = room.find(FIND_HOSTILE_CREEPS);
                if (hostiles.length === 0) {
                    roomMemory.needDefence = false;
                    continue;
                }

                const target = hostiles.reduce((closest, current) =>
                    room.controller!.pos.getRangeTo(current) < room.controller!.pos.getRangeTo(closest)
                        ? current : closest
                );

                for (const towerId of roomMemory.towers) {
                    const tower = Game.getObjectById(towerId) as StructureTower;
                    if (tower?.store.energy > 0) tower.attack(target);
                }

                continue;
            }

            if (roomMemory.repairTarget) {
                const target = Game.getObjectById(roomMemory.repairTarget) as Structure;

                if (!target || target.hits >= target.hitsMax) {
                    roomMemory.repairTarget = undefined;
                    continue;
                }

                let bestTower: StructureTower | null = null;
                let maxEnergy = TOWER_CAPACITY * 0.7;

                for (const towerId of roomMemory.towers) {
                    const tower = Game.getObjectById(towerId) as StructureTower;
                    if (tower?.store.energy > maxEnergy) {
                        maxEnergy = tower.store.energy;
                        bestTower = tower;
                    }
                }

                if (bestTower) {
                    bestTower.repair(target);
                }
            } else {
                roomMemory.repairTarget = this.findBestRepairTarget(room);
            }
        }
    }

    private static findBestRepairTarget(room: Room): Id<Structure> | undefined {
        const structures = room.find(FIND_STRUCTURES, {
            filter: (s) => {
                const type = s.structureType;
                return (type === STRUCTURE_CONTAINER ||
                        type === STRUCTURE_ROAD) &&
                    s.hits < (s.hitsMax * 0.9);
            }
        });

        if (structures.length === 0) return undefined;

        const mostDamaged = structures.reduce((worst, current) => {
            const currentDamage = (current.hitsMax - current.hits) / current.hitsMax;
            const worstDamage = (worst.hitsMax - worst.hits) / worst.hitsMax;

            if (Math.abs(currentDamage - worstDamage) < 0.01) {
                return room.controller!.pos.getRangeTo(current) < room.controller!.pos.getRangeTo(worst)
                    ? current : worst;
            }

            return currentDamage > worstDamage ? current : worst;
        });

        return mostDamaged.id;
    }
}