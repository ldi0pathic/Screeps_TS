interface LinkCategories {
    sourceLinks: TargetLink[];
    upgraderLink?: TargetLink;
    storageLink?: TargetLink;
    remoteLinks: TargetLink[];
}

export class LinkStorage {
    private static instance: LinkStorage;
    private linkCache: Map<string, { categories: LinkCategories, lastUpdate: number }> = new Map();
    private linkCountCache: Map<string, { count: number, lastCheck: number }> = new Map();
    private readonly CACHE_TTL = 250;
    private readonly QUICK_CHECK_TTL = 500;

    private constructor() {
    }

    static getInstance(): LinkStorage {
        if (!this.instance) {
            this.instance = new LinkStorage();
        }
        return this.instance;
    }

    hasLinks(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room) return false;

        const cached = this.linkCountCache.get(roomName);
        const currentTick = Game.time;

        if (cached && (currentTick - cached.lastCheck) < this.QUICK_CHECK_TTL) {
            return cached.count > 0;
        }

        const count = room.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_LINK}
        }).length;

        this.linkCountCache.set(roomName, {
            count,
            lastCheck: currentTick
        });

        return count > 0;
    }

    private scanAndCacheLinks(roomName: string): LinkCategories {
        const room = Game.rooms[roomName];
        if (!room) {
            return {sourceLinks: [], upgraderLink: undefined, storageLink: undefined, remoteLinks: []};
        }

        const links = room.find(FIND_MY_STRUCTURES, {
            filter: {structureType: STRUCTURE_LINK}
        }) as StructureLink[];

        this.linkCountCache.set(roomName, {
            count: links.length,
            lastCheck: Game.time
        });

        if (links.length === 0) {
            return {sourceLinks: [], upgraderLink: undefined, storageLink: undefined, remoteLinks: []};
        }

        const controller = room.controller;
        const storage = room.storage;
        const sources = room.find(FIND_SOURCES);

        const categories: LinkCategories = {
            sourceLinks: [],
            upgraderLink: undefined,
            storageLink: undefined,
            remoteLinks: []
        };


        for (let link of links) {
            let categorized = false;

            if (!categorized) {
                for (const source of sources) {
                    if (this.isInRange(link.pos, source.pos, 2)) {
                        categories.sourceLinks.push({
                            linkId: link.id,
                            priority: 8,
                            type: 'source'
                        });
                        categorized = true;
                        break;
                    }
                }
            }

            if (!categorized && controller && this.isInRange(link.pos, controller.pos, 3)) {
                categories.upgraderLink = {
                    linkId: link.id,
                    priority: 10,
                    type: 'upgrader'
                }
                categorized = true;
            }

            if (!categorized && storage && this.isInRange(link.pos, storage.pos, 2)) {
                categories.storageLink = {
                    linkId: link.id,
                    priority: 5,
                    type: 'storage'
                };
                categorized = true;
            }

            if (!categorized) {
                categories.remoteLinks.push({
                    linkId: link.id,
                    priority: 1,
                    type: 'remote'
                });
            }
        }

        return categories;
    }

    private isInRange(pos1: RoomPosition, pos2: RoomPosition, range: number): boolean {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return Math.max(dx, dy) <= range;
    }

    getLinkCategories(roomName: string): LinkCategories {
        const cached = this.linkCache.get(roomName);
        const currentTick = Game.time;

        if (cached && (currentTick - cached.lastUpdate) < this.CACHE_TTL) {
            return cached.categories;
        }

        const categories = this.scanAndCacheLinks(roomName);
        this.linkCache.set(roomName, {
            categories,
            lastUpdate: currentTick
        });

        return categories;
    }

    getLinksByType(roomName: string, type: 'source' | 'upgrader' | 'storage' | 'remote'): TargetLink[] {
        const categories = this.getLinkCategories(roomName);

        switch (type) {
            case 'source':
                return categories.sourceLinks;
            case 'upgrader':
                return categories.upgraderLink ? [categories.upgraderLink] : [];
            case 'storage':
                return categories.storageLink ? [categories.storageLink] : [];
            case 'remote':
                return categories.remoteLinks;
            default:
                return [];
        }
    }

    invalidateRoomCache(roomName: string): void {
        this.linkCache.delete(roomName);
        this.linkCountCache.delete(roomName);
    }

}
