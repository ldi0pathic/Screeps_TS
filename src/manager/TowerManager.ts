export class TowerManager {

    private static hostilesCache: Map<string, { ids: Id<Creep>[], lastUpdate: number }> = new Map();
    private static readonly CACHE_TTL = 5;

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

            // Schneller Check ob wir überhaupt Hostiles haben könnten
            if (!roomMemory.needDefence && Game.time % 5 !== 0) {
                // Wenn wir nicht im Verteidigungsmodus sind, prüfen wir nur alle 5 Ticks auf neue Feinde
                // es sei denn, needDefence wird von außen gesetzt (z.B. durch Events)
            } else {
                const hostiles = this.getHostiles(room);
                if (hostiles.length > 0) {
                    roomMemory.needDefence = true;
                    const target = hostiles.reduce((closest, current) =>
                        room.controller!.pos.getRangeTo(current) < room.controller!.pos.getRangeTo(closest)
                            ? current : closest
                    );

                    for (let i = roomMemory.towers.length - 1; i >= 0; i--) {
                        const towerId = roomMemory.towers[i];
                        const tower = Game.getObjectById(towerId) as StructureTower;
                        if (!tower) {
                            roomMemory.towers.splice(i, 1);
                            continue;
                        }
                        if (tower.store.energy > 0) tower.attack(target);
                    }
                    continue;
                } else {
                    roomMemory.needDefence = false;
                }
            }

            if (roomMemory.repairTarget) {
                const target = Game.getObjectById(roomMemory.repairTarget) as Structure;

                if (!target || target.hits >= target.hitsMax) {
                    roomMemory.repairTarget = undefined;
                    continue;
                }

                let bestTower: StructureTower | null = null;
                let maxEnergy = TOWER_CAPACITY * 0.7;

                for (let i = roomMemory.towers.length - 1; i >= 0; i--) {
                    const towerId = roomMemory.towers[i];
                    const tower = Game.getObjectById(towerId) as StructureTower;
                    if (!tower) {
                        roomMemory.towers.splice(i, 1);
                        continue;
                    }

                    if (tower.store.energy > maxEnergy) {
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

    public static getHostiles(room: Room): Creep[] {
        const cached = this.hostilesCache.get(room.name);
        if (cached && (Game.time - cached.lastUpdate) < this.CACHE_TTL) {
            return cached.ids.map(id => Game.getObjectById(id)).filter(h => h !== null) as Creep[];
        }

        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        this.hostilesCache.set(room.name, {
            ids: hostiles.map(h => h.id),
            lastUpdate: Game.time
        });
        return hostiles;
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