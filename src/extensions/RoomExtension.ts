// Implementierung
import {SourceData} from "../records/SourceData";

export function extendRoom() {
    Room.prototype.getOrFindSource = function (): SourceData[] {
        let ids = this.memory.energySources;

        if (ids && ids.length > 0) {
            return ids;
        }

        const source = Game.rooms[this.name].find(FIND_SOURCES)
        this.memory.energySources = []
        for (let s of source) {
            this.memory.energySources.push(new SourceData(s.id));
        }

        return this.memory.energySources;
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

        Memory.rooms[this.name].state = state;
    };
}

