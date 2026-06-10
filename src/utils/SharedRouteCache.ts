import {PathingManager} from "./PathingManager";

// Global per-tick route cache — not stored in Memory
const sharedRoutes: Map<string, PathFinderPath> = new Map();
let cacheTickStamp = -1;

export class SharedRouteCache {

    static clearTickCache(): void {
        if (Game.time !== cacheTickStamp) {
            sharedRoutes.clear();
            cacheTickStamp = Game.time;
        }
    }

    /** Get or compute a PathFinder path, shared within the current tick */
    static getPath(from: RoomPosition, to: RoomPosition, range: number): PathFinderPath {
        this.clearTickCache();
        const key = `${from.roomName}_${from.x}_${from.y}:${to.roomName}_${to.x}_${to.y}:${range}`;
        const cached = sharedRoutes.get(key);
        if (cached) return cached;
        const path = PathingManager.findPath(from, to, range, true);
        sharedRoutes.set(key, path);
        return path;
    }
}
