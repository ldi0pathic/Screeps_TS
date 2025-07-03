//https://screepers.github.io/screeps-tools/#/building-planner
export class LayoutExporter {

    static exportRoomLayout(roomName: string): RoomLayout | null {
        const room: Room | undefined = Game.rooms[roomName];
        if (!room) {
            console.log(`Raum ${roomName} nicht verfügbar`);
            return null;
        }

        const layout: RoomLayout = {
            rcl: room.controller ? room.controller.level : 0,
            buildings: {},
            controller: null,
            terrain: {
                wall: [],
                swamp: []
            },
            sources: [],
            mineral: null
        };

        // Controller Position
        if (room.controller) {
            layout.controller = {
                x: room.controller.pos.x,
                y: room.controller.pos.y
            };
        }

        // Sources sammeln
        const sources: Source[] = room.find(FIND_SOURCES);
        sources.forEach((source: Source) => {
            // @ts-ignore
            layout.sources.push({
                x: source.pos.x,
                y: source.pos.y
            });
        });

        // Mineral sammeln
        const minerals: Mineral[] = room.find(FIND_MINERALS);
        if (minerals.length > 0) {
            const mineral: Mineral = minerals[0];
            layout.mineral = {
                mineralType: mineral.mineralType,
                x: mineral.pos.x,
                y: mineral.pos.y
            };
        }

        // Terrain sammeln
        const terrain: RoomTerrain = new Room.Terrain(roomName);
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                const terrainType: number = terrain.get(x, y);
                if (terrainType & TERRAIN_MASK_WALL) {
                    layout.terrain.wall.push({x, y});
                } else if (terrainType & TERRAIN_MASK_SWAMP) {
                    layout.terrain.swamp.push({x, y});
                }
            }
        }

        // Strukturen sammeln
        const structures: Structure[] = room.find(FIND_STRUCTURES);
        const constructionSites: ConstructionSite[] = room.find(FIND_CONSTRUCTION_SITES);

        // Alle Strukturen und Baustellen zusammenfassen
        const allBuildings: (Structure | ConstructionSite)[] = [...structures, ...constructionSites];

        allBuildings.forEach((structure: Structure | ConstructionSite) => {
            const structureType: StructureConstant = structure.structureType;

            // Mapping für Strukturtypen
            const typeMapping: Record<StructureConstant, string> = {
                [STRUCTURE_SPAWN]: 'spawn',
                [STRUCTURE_EXTENSION]: 'extension',
                [STRUCTURE_ROAD]: 'road',
                [STRUCTURE_WALL]: 'constructedWall',
                [STRUCTURE_RAMPART]: 'rampart',
                [STRUCTURE_KEEPER_LAIR]: 'keeperLair',
                [STRUCTURE_PORTAL]: 'portal',
                [STRUCTURE_CONTROLLER]: 'controller',
                [STRUCTURE_LINK]: 'link',
                [STRUCTURE_STORAGE]: 'storage',
                [STRUCTURE_TOWER]: 'tower',
                [STRUCTURE_OBSERVER]: 'observer',
                [STRUCTURE_POWER_BANK]: 'powerBank',
                [STRUCTURE_POWER_SPAWN]: 'powerSpawn',
                [STRUCTURE_EXTRACTOR]: 'extractor',
                [STRUCTURE_LAB]: 'lab',
                [STRUCTURE_TERMINAL]: 'terminal',
                [STRUCTURE_CONTAINER]: 'container',
                [STRUCTURE_NUKER]: 'nuker',
                [STRUCTURE_FACTORY]: 'factory',
                invaderCore: "invaderCore",
            };

            const mappedType: string = typeMapping[structureType];
            if (mappedType && mappedType !== 'controller') { // Controller wird separat behandelt
                if (!layout.buildings[mappedType]) {
                    layout.buildings[mappedType] = [];
                }
                layout.buildings[mappedType].push({
                    x: structure.pos.x,
                    y: structure.pos.y
                });
            }
        });

        return layout;
    }

    public static exportRoomToConsole(roomName: string): string | null {
        const layout: RoomLayout | null = this.exportRoomLayout(roomName);
        if (layout) {
            console.log(`Room Layout für ${roomName}:`);
            const jsonString: string = JSON.stringify(layout);
            console.log(jsonString);
            return jsonString;
        }
        return null;
    }

    static planRoadNetwork(room: Room): string[] | undefined {
        if (!room.controller?.my) {
            return;
        }

        let sources = room.getOrFindEnergieSource();
        let minerals = room.getOrFindMineralSource();
        let spawns = room.find(FIND_MY_SPAWNS);

        let allConnections: Array<{ spawn: StructureSpawn, target: StructureContainer | StructureController, path: RoomPosition[] }> = [];

        spawns.forEach(spawn => {
            sources.forEach(source => {
                if (source.containerId) {
                    let container = Game.getObjectById(source.containerId);
                    if (container) {
                        const path = PathFinder.search(spawn.pos, {pos: container.pos, range: 1}, {
                            plainCost: 2,
                            roomCallback: (roomName: string) => {
                                if (roomName !== room.name) return false;

                                const costs = new PathFinder.CostMatrix();
                                room.find(FIND_STRUCTURES).forEach(structure => {
                                    if (structure.structureType === STRUCTURE_ROAD) {
                                        costs.set(structure.pos.x, structure.pos.y, 1);
                                    }
                                });
                                return costs;
                            }
                        });
                        allConnections.push({spawn, target: container, path: path.path});

                    }
                }
            });

            if (room.controller) {
                const path = PathFinder.search(spawn.pos, {pos: room.controller.pos, range: 3}, {
                    plainCost: 2,
                    roomCallback: (roomName: string) => {
                        if (roomName !== room.name) return false;

                        const costs = new PathFinder.CostMatrix();
                        room.find(FIND_STRUCTURES).forEach(structure => {
                            if (structure.structureType === STRUCTURE_ROAD) {
                                costs.set(structure.pos.x, structure.pos.y, 1);
                            }
                        });
                        return costs;
                    }
                });
                allConnections.push({spawn, target: room.controller, path: path.path});
            }

            if (room.memory.state >= eRoomState.phase6) { //Mineralabbau :) 
                minerals.forEach(mineral => {
                    if (mineral.containerId) {
                        let container = Game.getObjectById(mineral.containerId);
                        if (container) {
                            const path = PathFinder.search(spawn.pos, {pos: container.pos, range: 1}, {
                                plainCost: 2,
                                roomCallback: (roomName: string) => {
                                    if (roomName !== room.name) return false;

                                    const costs = new PathFinder.CostMatrix();
                                    room.find(FIND_STRUCTURES).forEach(structure => {
                                        if (structure.structureType === STRUCTURE_ROAD) {
                                            costs.set(structure.pos.x, structure.pos.y, 1);
                                        }
                                    });
                                    return costs;
                                }
                            });
                            allConnections.push({spawn, target: container, path: path.path});
                        }
                    }
                })
            }
        });

        return this.calculateOptimizedPaths(room, allConnections);
    }


    private static calculateOptimizedPaths(room: Room, connections: Array<{ spawn: StructureSpawn, target: StructureContainer | StructureController, path: RoomPosition[] }>): string[] {
        let optimizedPaths: RoomPosition[] = [];

        connections.forEach((connection, index) => {
            const path = PathFinder.search(connection.spawn.pos, {
                pos: connection.target.pos,
                range: connection.target.structureType === STRUCTURE_CONTROLLER ? 3 : 1,
            }, {
                plainCost: 2,
                roomCallback: (roomName: string) => {
                    if (roomName !== room.name) return false;

                    const costs = new PathFinder.CostMatrix();

                    room.find(FIND_STRUCTURES).forEach(structure => {
                        if (structure.structureType === STRUCTURE_ROAD) {
                            costs.set(structure.pos.x, structure.pos.y, 1);
                        }
                    });

                    optimizedPaths.forEach(pos => {
                        costs.set(pos.x, pos.y, 1);
                    });

                    return costs;
                }
            });

            optimizedPaths.push(...path.path);
        });

        return [...new Set(optimizedPaths.map(pos => `${pos.x},${pos.y}`))];
    }

}