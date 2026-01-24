import {LinkStorage} from '../storage/LinkStorage';

export class LinkManager {
    private readonly roomName: string;
    private readonly linkStorage: LinkStorage;

    constructor(roomName: string) {
        this.roomName = roomName;
        this.linkStorage = LinkStorage.getInstance();
    }

    public run() {
        if (!this.linkStorage.hasLinks(this.roomName)) {
            return
        }

        this.manageEnergyTransfers(this.roomName);
    }

    manageEnergyTransfers(roomName: string) {

        const senders = this.getReadySenders(roomName);
        if (senders.length === 0) return 0;

        const targets = this.getPriorityTargets(roomName);
        if (targets.length === 0) return 0;

        let targetIndex = 0;

        for (const sender of senders) {
            if (targetIndex >= targets.length) break;

            const target = targets[targetIndex];

            // Verhindere Selbst-Transfer
            if (sender.id === target.id) {
                targetIndex++;
                continue;
            }

            const freeSpace = 800 - target.store[RESOURCE_ENERGY];
            const senderEnergy = sender.store[RESOURCE_ENERGY];

            if (freeSpace >= senderEnergy) {
                sender.transferEnergy(target);
            }
            targetIndex++
        }

        return
    }

    /**
     * CPU-effiziente Sender-Ermittlung
     */
    getReadySenders(roomName: string, minEnergy: number = 600): StructureLink[] {
        if (!this.linkStorage.hasLinks(roomName)) return [];

        const categories = this.linkStorage.getLinkCategories(roomName);
        const senders: StructureLink[] = [];

        for (const sourceLink of categories.sourceLinks) {
            let link = Game.getObjectById(sourceLink.linkId) as StructureLink;
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
                continue;
            }
            if (link.store[RESOURCE_ENERGY] >= minEnergy &&
                link.cooldown === 0) {
                senders.push(link);
            }
        }

        for (const remoteLink of categories.remoteLinks) {
            let link = Game.getObjectById(remoteLink.linkId) as StructureLink;
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
                continue;
            }
            if (link.store[RESOURCE_ENERGY] >= minEnergy &&
                link.cooldown === 0) {
                senders.push(link);
            }
        }

        return senders;
    }

    /**
     * CPU-effiziente Target-Ermittlung mit Prioritäten
     */
    getPriorityTargets(roomName: string): StructureLink[] {
        if (!this.linkStorage.hasLinks(roomName)) return [];

        const categories = this.linkStorage.getLinkCategories(roomName);
        const targets: { prio: number, link: StructureLink }[] = [];
        const room = Game.rooms[roomName];

        // Upgrader Links - dynamische Priorität
        if (categories.upgraderLink) {
            let link = Game.getObjectById(categories.upgraderLink.linkId) as StructureLink | undefined;
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
            } else if (link.store[RESOURCE_ENERGY] < 100) {
                targets.push({prio: room?.controller?.level === 8 ? 3 : 1, link});
            }
        }

        // Storage Links
        if (categories.storageLink) {
            let link = Game.getObjectById(categories.storageLink.linkId) as StructureLink | undefined;
            if (!link) {
                this.linkStorage.invalidateRoomCache(roomName);
            } else if (link.store[RESOURCE_ENERGY] < 100) {
                targets.push({prio: 2, link: link})
            }
        }

        // Sortiere nach Priorität (niedrigere Zahl = höhere Priorität)
        return targets.sort((a, b) => a.prio - b.prio).map(target => target.link);
    }
}
