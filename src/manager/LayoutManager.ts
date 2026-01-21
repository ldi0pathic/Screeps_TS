import {roomConfig} from "../config";
import {LayoutBuilder} from "../layouts/LayoutBuilder";
import {W5N8} from "../layouts/W5N8Layout";


export class LayoutManager {

    private static getLayout(name: string): MinRoomLayout | undefined {

        switch (name) {
            case  "W5N8":
                return W5N8
        }

        return undefined;

    }

    static run() {
        // Layout-Planung ist teuer, nur alle 20 Ticks ausführen (oder 50 in Phase 8)
        const checkInterval = Game.cpu.limit <= 20 ? 40 : 20;
        if (Game.time % checkInterval !== 0) return;

        for (const name in roomConfig) {
            if (roomConfig[name].buildBase) {
                const room = Game.rooms[name];
                if (room.memory.state < eRoomState.phase2 || room.memory.state > eRoomState.phase8) {
                    continue;
                }

                if (room.memory.state == eRoomState.phase8) {
                    if (Game.time % 50 !== 0) {
                        return;
                    }
                }

                const layout = this.getLayout(name);
                if (!layout) continue;

                let builder = new LayoutBuilder(name, layout);

                builder.visualizeUnbuiltLayout();

                let info = builder.getLayoutInfo();
                if (info.buildableAtCurrentRCL == 0 || info.totalBuilding > 25) {
                    return;
                }

                let count = builder.buildAll();
                if (count > 0) {
                    console.log("Es wurden " + count + " neue Baustellen eingeplant")
                }

            }
        }

    }

}