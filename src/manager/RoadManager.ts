import {roomConfig} from "../config";

export class RoadManager {

    static buildRoads() {
        for (const name in roomConfig) {
            if (roomConfig[name].buildRoads) {
                const room = Game.rooms[name];
                if (room.memory.state < eRoomState.phase2) {
                    continue;
                }
                if (
                    room.controller?.my &&
                    room.controller.level < 8 &&
                    room.find(FIND_MY_SPAWNS).length > 0
                )
                    this.planRoadNetwork(room);
                this.buildPlannedRoads(room);
            }
        }
    }


    static planRoadNetwork(room: Room) {
        if (!room.controller?.my) {
            return;
        }

        if (room.memory.plannedRoads && room.memory.plannedRoads.length > 0) {
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

        this.calculateOptimizedPaths(room, allConnections);
    }

    static buildPlannedRoads(room: Room) {
        if (!room.controller?.my) {
            return;
        }

        if (!room.memory.plannedRoads || room.memory.plannedRoads.length === 0) {
            return;
        }

        // Begrenze die Anzahl der Baustellen
        const existingRoadSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        });

        if (existingRoadSites.length >= 5) {
            return;
        }

        // Finde bereits gebaute Straßen
        const existingRoads = room.find(FIND_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_ROAD
        });

        // Finde noch zu bauende Straßen
        const toBuild: RoomPosition[] = [];
        room.memory.plannedRoads.forEach(roadPosString => {
            const [x, y] = roadPosString.split(',').map(Number);
            const pos = new RoomPosition(x, y, room.name);

            const hasRoad = pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_ROAD);
            const hasRoadSite = pos.lookFor(LOOK_CONSTRUCTION_SITES).some(s => s.structureType === STRUCTURE_ROAD);

            if (!hasRoad && !hasRoadSite) {
                toBuild.push(pos);
            }
        });

        if (toBuild.length === 0) return;

        // Finde nächste Straße zu bereits gebauten Straßen
        let nextRoad: RoomPosition | null = null;

        if (existingRoads.length > 0) {
            // Finde Straße, die am nächsten zu bestehenden Straßen ist
            let minDistance = Infinity;
            toBuild.forEach(pos => {
                existingRoads.forEach(road => {
                    const distance = pos.getRangeTo(road.pos);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nextRoad = pos;
                    }
                });
            });
        } else {
            // Keine Straßen vorhanden, starte bei einem Spawn
            const spawn = room.find(FIND_MY_SPAWNS)[0];
            if (spawn) {
                let minDistance = Infinity;
                toBuild.forEach(pos => {
                    const distance = pos.getRangeTo(spawn.pos);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nextRoad = pos;
                    }
                });
            }
        }

        // Baue die nächste Straße
        if (nextRoad) {
            const result = room.createConstructionSite(nextRoad, STRUCTURE_ROAD);
            if (result !== OK) {
                console.log(" neue Straße kann nicht gebaut werden, weil >>" + result);
            }
        }
    }

    private static calculateOptimizedPaths(room: Room, connections: Array<{ spawn: StructureSpawn, target: StructureContainer | StructureController, path: RoomPosition[] }>) {
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

        room.memory.plannedRoads = [...new Set(optimizedPaths.map(pos => `${pos.x},${pos.y}`))];
    }
}