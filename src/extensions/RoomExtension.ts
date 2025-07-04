import {EnergieSourceData} from "../records/EnergieSourceData";
import {MineralSourceData} from "../records/MineralSourceData";
import {RoomStorage} from "../records/RoomStorage";

export function extendRoom() {
    Room.prototype.getOrFindEnergieSource = function (): EnergieSourceData[] {
        let ids = this.memory.energySources;

        if (ids && ids.length > 0) {
            return ids;
        }

        const source = Game.rooms[this.name].find(FIND_SOURCES)
        this.memory.energySources = []
        for (let s of source) {
            this.memory.energySources.push(new EnergieSourceData(s.id));
        }


        return this.memory.energySources;
    }

    Room.prototype.getMaxAvailableEnergy = function (): number {
        const room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return 0;
        }

        const controllerLevel = room.controller.level;

        // Spawns: Level 1+ = 1 Spawn, Level 7+ = 2 Spawns, Level 8 = 3 Spawns
        let maxSpawns = 1;
        if (controllerLevel >= 7) maxSpawns = 2;
        if (controllerLevel >= 8) maxSpawns = 3;

        // Extensions basierend auf Controller Level
        const maxExtensionsByLevel = [0, 0, 5, 10, 20, 30, 40, 50, 60];
        const maxExtensions = maxExtensionsByLevel[controllerLevel] || 0;

        // Aktuelle Spawns und Extensions zählen (aber maximal erlaubte)
        const actualSpawns = room.find(FIND_MY_SPAWNS);
        const actualExtensions = room.find(FIND_MY_STRUCTURES, {
            filter: (structure: Structure) => structure.structureType === STRUCTURE_EXTENSION
        });

        const usableSpawns = Math.min(actualSpawns.length, maxSpawns);
        const usableExtensions = Math.min(actualExtensions.length, maxExtensions);

        if (room.memory.spawnPrioBlock) {
            return (usableSpawns * 150) + (usableExtensions * 25)
        }

        // Berechne verfügbare Energie
        return (usableSpawns * 300) + (usableExtensions * 50);
    }

    Room.prototype.findAllContainersNearSpawns = function (): StructureContainer[] {
        const spawns = Game.rooms[this.name].find(FIND_MY_SPAWNS);
        const containers: StructureContainer[] = [];

        for (const spawn of spawns) {
            const nearbyContainers = spawn.pos.findInRange(FIND_STRUCTURES, 2, {
                filter: (structure: Structure) => {
                    return structure.structureType === STRUCTURE_CONTAINER;
                }
            }) as StructureContainer[];

            // Duplikate vermeiden
            for (const container of nearbyContainers) {
                if (!containers.find(c => c.id === container.id)) {
                    containers.push(container);
                }
            }
        }

        return containers;
    }

    Room.prototype.findAllContainersNearController = function (): StructureContainer[] {

        let room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return [];
        }

        const containers: StructureContainer[] = [];

        const nearbyContainers = Game.rooms[this.name].controller?.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: (structure: Structure) => {
                return structure.structureType === STRUCTURE_CONTAINER;
            }
        }) as StructureContainer[];

        // Duplikate vermeiden
        for (const container of nearbyContainers) {
            if (!containers.find(c => c.id === container.id)) {
                containers.push(container);
            }
        }

        return containers;
    }

    Room.prototype.findAllLinksNearController = function (): StructureLink[] {
        let room = Game.rooms[this.name];
        if (!room.controller || !room.controller.my) {
            return [];
        }

        const links: StructureLink[] = [];

        const nearby = Game.rooms[this.name].controller?.pos.findInRange(FIND_STRUCTURES, 3, {
            filter: (structure: Structure) => {
                return structure.structureType === STRUCTURE_LINK;
            }
        }) as StructureLink[];

        // Duplikate vermeiden
        for (const link of nearby) {
            if (!links.find(c => c.id === link.id)) {
                links.push(link);
            }
        }

        return links;
    }

    Room.prototype.findAllLinksNearSpawns = function (): StructureLink[] {
        const spawns = Game.rooms[this.name].find(FIND_MY_SPAWNS);
        const links: StructureLink[] = [];

        for (const spawn of spawns) {
            const nearby = spawn.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: (structure: Structure) => {
                    return structure.structureType === STRUCTURE_LINK;
                }
            }) as StructureLink[];

            // Duplikate vermeiden
            for (const link of nearby) {
                if (!links.find(c => c.id === link.id)) {
                    links.push(link);
                }
            }
        }

        return links;
    }

    Room.prototype.getOrFindRoomStorage = function (): RoomStorage | undefined {
        const room = Game.rooms[this.name];

        if (!this.memory.storage) {
            this.memory.storage = {
                storageContainerId: [],
                storageId: room.storage?.id
            };

            const containers = [
                ...room.findAllContainersNearSpawns(),
                ...room.findAllContainersNearController()
            ];

            const uniqueContainers = containers.filter((container, index, arr) =>
                arr.findIndex(c => c.id === container.id) === index
            );

            this.memory.storage.storageContainerId = uniqueContainers.map(c => c.id);
        }

        if (this.memory.state >= eRoomState.phase4 && !this.memory.storage.storageId) {
            this.memory.storage.storageId = room.storage?.id;
        }

        return this.memory.storage;
    }
    Room.prototype.getOrFindTargetLinks = function (): Id<StructureLink>[] {
        if (this.memory.state < eRoomState.phase5) {
            return [];
        }
        const room = Game.rooms[this.name];

        if (!this.memory.targetLinkIds) {
            this.memory.targetLinkIds = [];

            const links = [
                ...room.findAllLinksNearSpawns(),
                ...room.findAllLinksNearController()
            ];

            const unique = links.filter((link, index, arr) =>
                arr.findIndex(c => c.id === link.id) === index
            );

            this.memory.targetLinkIds = unique.map(c => c.id);
        }

        return this.memory.targetLinkIds;
    }


    Room.prototype.getOrFindMineralSource = function (): MineralSourceData[] {
        let ids = this.memory.mineralSources;

        if (ids && ids.length > 0) {
            return ids;
        }

        const mineral = Game.rooms[this.name].find(FIND_MINERALS);
        for (let m of mineral) {
            this.memory.mineralSources.push(new MineralSourceData(m.id, m.mineralType));
        }

        return this.memory.mineralSources;
    }

    Room.prototype.setRoomState = function (controller: StructureController): void {
        let state = eRoomState.neutral;

        if (!controller.my && controller.owner != undefined) {
            state = eRoomState.otherPlayer;
        }

        switch (controller.level) {
            case 1:
                state = eRoomState.phase1;
                break;
            case 2:
                state = eRoomState.phase2;
                break;
            case 3:
                state = eRoomState.phase3;
                break;
            case 4:
                state = eRoomState.phase4;
                break;
            case 5:
                state = eRoomState.phase5;
                break;
            case 6:
                state = eRoomState.phase6;
                break;
            case 7:
                state = eRoomState.phase7;
                break;
            case 8:
                state = eRoomState.phase8;
                break;
        }

        if (state != this.memory.state) { //bei jedem wechsel wird alles zurückgesetzt
            this.memory.storage = {storageId: undefined, storageContainerId: []};
            this.memory.targetLinkIds = [];
            this.memory.state = state;
        }
    };
}

