import {roomConfig} from "../config";
import {LayoutBuilder, MAX_GLOBAL_SITES, MAX_SITES_PER_ROOM} from "../layouts/LayoutBuilder";
import {W5N8} from "../layouts/W5N8Layout";
import {CPUManager} from "./CPUManager";

const LAYOUT_INTERVAL = 50;

export class LayoutManager {

    private static getLayout(name: string): MinRoomLayout | undefined {
        switch (name) {
            case "W5N8":
                return W5N8;
        }
        return undefined;
    }

    static run() {
        const globalUsed = Object.keys(Game.constructionSites).length;
        if (globalUsed >= MAX_GLOBAL_SITES) return; // global budget exhausted

        const ownedRooms = Object.keys(roomConfig).filter(name => {
            const room = Game.rooms[name];
            return room?.controller?.my && roomConfig[name].buildBase;
        });

        for (let i = 0; i < ownedRooms.length; i++) {
            const name = ownedRooms[i];
            if (!CPUManager.shouldRunEvery(`layout_${name}`, LAYOUT_INTERVAL, i)) continue;

            const room = Game.rooms[name];
            if (!room) continue;

            // Skip phase 1 and phase 8 rooms entirely
            if (room.memory.state < eRoomState.phase2 || room.memory.state === eRoomState.phase8) continue;

            // Per-room site count check
            const roomSites = room.find(FIND_CONSTRUCTION_SITES).length;
            if (roomSites >= MAX_SITES_PER_ROOM) continue;

            const layout = this.getLayout(name);
            if (!layout) continue;

            const builder = new LayoutBuilder(name, layout);

            if (Memory.debug?.visuals) {
                builder.visualizeUnbuiltLayout();
            }

            const info = builder.getLayoutInfo();
            if (info.buildableAtCurrentRCL === 0) continue;

            // Respect per-room limit and global limit
            const maxNewSites = Math.min(
                MAX_SITES_PER_ROOM - roomSites,
                MAX_GLOBAL_SITES - globalUsed
            );
            if (maxNewSites <= 0) continue;

            const count = builder.buildAll();
            if (count > 0) {
                console.log(`[Layout] ${name}: placed ${count} sites`);
            }

            // Only process one room per call to spread CPU
            break;
        }
    }
}
