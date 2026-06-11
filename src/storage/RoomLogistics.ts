import {LinkStorage} from "./LinkStorage";

type WithdrawPurpose = 'builder' | 'upgrader' | 'hauler' | 'filler';
type DepositPurpose = 'spawn' | 'tower' | 'storage' | 'hauler';

export interface ControllerLogisticsTargets {
    container?: StructureContainer;
    link?: StructureLink;
}

export class RoomLogistics {
    static invalidate(roomName: string): void {
        const roomMemory = Memory.rooms[roomName];
        if (roomMemory) {
            roomMemory.storage = undefined;
            roomMemory.targetLinkIds = [];
        }
        LinkStorage.getInstance().invalidateRoomCache(roomName);
    }

    static getEnergyWithdrawTargets(room: Room, purpose: WithdrawPurpose): AnyStoreStructure[] {
        const targets: AnyStoreStructure[] = [];
        const storage = room.storage;
        const minStorageEnergy = purpose === 'filler' ? 100 : 500;

        if (storage && storage.store[RESOURCE_ENERGY] > minStorageEnergy) {
            targets.push(storage);
        }

        const roomStorage = room.getOrFindRoomStorage?.();
        const containerIds = roomStorage?.storageContainerId ?? [];
        for (const id of containerIds) {
            const container = Game.getObjectById(id) as StructureContainer | null;
            if (container && container.store[RESOURCE_ENERGY] > 0) {
                targets.push(container);
            }
        }

        if (purpose === 'upgrader') {
            const controller = this.getControllerLogistics(room);
            if (controller.link && controller.link.store[RESOURCE_ENERGY] > 0) targets.unshift(controller.link);
            if (controller.container && controller.container.store[RESOURCE_ENERGY] > 0) targets.unshift(controller.container);
        }

        return this.uniqueById(targets);
    }

    static getEnergyDepositTargets(room: Room, purpose: DepositPurpose, carriedEnergy: number = 0): AnyStoreStructure[] {
        const targets: AnyStoreStructure[] = [];

        if (purpose === 'spawn' || purpose === 'hauler') {
            targets.push(...room.find(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
                    (s as AnyStoreStructure).store.getFreeCapacity(RESOURCE_ENERGY) > 0
            }) as AnyStoreStructure[]);

            if (purpose === 'spawn' || ((room.storage && room.storage.store[RESOURCE_ENERGY] < 3000) && targets.length > 0)) {
                return this.uniqueById(targets);
            }
        }

        if (purpose === 'tower' || purpose === 'hauler') {
            targets.push(...room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER &&
                    (s as StructureTower).store[RESOURCE_ENERGY] < 900 &&
                    (s as StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 0
            }) as AnyStoreStructure[]);
        }

        if (purpose === 'storage' || purpose === 'hauler') {
            const roomStorage = room.getOrFindRoomStorage?.();
            if (roomStorage?.storageId) {
                const storage = Game.getObjectById(roomStorage.storageId) as StructureStorage | null;
                if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) targets.push(storage);
            }

            for (const id of roomStorage?.storageContainerId ?? []) {
                const container = Game.getObjectById(id) as StructureContainer | null;
                if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) > Math.max(0, carriedEnergy)) {
                    targets.push(container);
                }
            }
        }

        return this.uniqueById(targets);
    }

    static getBestEnergyDepositTarget(room: Room, pos: RoomPosition, purpose: DepositPurpose, carriedEnergy: number = 0): AnyStoreStructure | undefined {
        const targets = this.getEnergyDepositTargets(room, purpose, carriedEnergy);
        if (targets.length === 0) return undefined;
        return pos.findClosestByRange(targets) as AnyStoreStructure | undefined;
    }

    static getBestEnergyWithdrawTarget(room: Room, pos: RoomPosition, purpose: WithdrawPurpose): AnyStoreStructure | undefined {
        const targets = this.getEnergyWithdrawTargets(room, purpose);
        if (targets.length === 0) return undefined;
        return pos.findClosestByRange(targets) as AnyStoreStructure | undefined;
    }

    static getControllerLogistics(room: Room): ControllerLogisticsTargets {
        const controller = room.controller;
        if (!controller) return {};

        let container = room.memory.controllerContainerId
            ? Game.getObjectById(room.memory.controllerContainerId) as StructureContainer | null
            : null;

        if (!container) {
            container = (controller.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: s => s.structureType === STRUCTURE_CONTAINER
            })[0] as StructureContainer | undefined) ?? null;
            room.memory.controllerContainerId = container?.id;
        }

        const linkId = LinkStorage.getInstance().getLinksByType(room.name, 'upgrader')[0]?.linkId;
        const link = linkId ? Game.getObjectById(linkId) as StructureLink | null : null;

        return {
            container: container ?? undefined,
            link: link ?? undefined,
        };
    }

    private static uniqueById<T extends { id: string }>(items: T[]): T[] {
        const seen = new Set<string>();
        return items.filter(item => {
            if (!item || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }
}
