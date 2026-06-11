// Shared CostMatrix cache — rebuilt per tick on demand (not stored in Memory)
const costMatrixCache: Map<string, CostMatrix> = new Map();
let cacheTickStamp = -1;

export class PathingManager {

    /** Clear per-tick cache at start of each tick */
    static clearTickCache(): void {
        if (Game.time !== cacheTickStamp) {
            costMatrixCache.clear();
            cacheTickStamp = Game.time;
        }
    }

    /** Get or build a CostMatrix for the given room */
    static getCostMatrix(roomName: string): CostMatrix {
        this.clearTickCache();
        const cached = costMatrixCache.get(roomName);
        if (cached) return cached;

        const matrix = new PathFinder.CostMatrix();
        const room = Game.rooms[roomName];
        if (room) {
            const roads = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_ROAD
            });
            for (const road of roads) {
                matrix.set(road.pos.x, road.pos.y, 1);
            }

            const blockers = room.find(FIND_STRUCTURES, {
                filter: s =>
                    s.structureType !== STRUCTURE_CONTAINER &&
                    s.structureType !== STRUCTURE_ROAD &&
                    s.structureType !== STRUCTURE_RAMPART
            });
            for (const s of blockers) {
                matrix.set(s.pos.x, s.pos.y, 255);
            }

            // Own ramparts are walkable; hostile ramparts block
            const ramparts = room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_RAMPART
            }) as StructureRampart[];
            for (const r of ramparts) {
                if (!r.my) matrix.set(r.pos.x, r.pos.y, 255);
            }
        }

        costMatrixCache.set(roomName, matrix);
        return matrix;
    }

    /**
     * Find a path using PathFinder.search with shared CostMatrix.
     * Replaces the old findPathTo-based calculateNewPath.
     */
    static findPath(
        from: RoomPosition,
        to: RoomPosition,
        range: number,
        ignoreCreeps: boolean = true
    ): PathFinderPath {
        return PathFinder.search(from, { pos: to, range }, {
            plainCost: 2,
            swampCost: 10,
            roomCallback: (roomName) => {
                const matrix = this.getCostMatrix(roomName).clone();
                if (!ignoreCreeps) {
                    const room = Game.rooms[roomName];
                    if (room) {
                        for (const creep of room.find(FIND_CREEPS)) {
                            matrix.set(creep.pos.x, creep.pos.y, 255);
                        }
                    }
                }
                return matrix;
            },
        });
    }

    /** Serialize a PathFinder path to a string for memory storage */
    static serialize(path: RoomPosition[]): string {
        return Room.serializePath(path.map(p => ({
            x: p.x,
            y: p.y,
            dx: 0,
            dy: 0,
            direction: TOP as DirectionConstant
        })));
    }
}
