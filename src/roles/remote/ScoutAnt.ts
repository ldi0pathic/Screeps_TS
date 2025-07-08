import {Ant} from "../base/Ant";
import {Movement} from "../../utils/Movement";
import {EnergieSourceData} from "../../records/EnergieSourceData";
import {MineralSourceData} from "../../records/MineralSourceData";
import {roomConfig} from "../../config";


export class ScoutAnt extends Ant<ScoutCreepMemory> {
    doJob(): boolean {

        if (!this.memory.scoutRoom) {
            this.assignNextTarget();
            return true;
        }

        if (this.creep.room.name == this.memory.scoutRoom) {
            this.scoutCurrentRoom();
            this.assignNextTarget();
            return true;
        }

        if (this.creep.room.name !== this.memory.scoutRoom) {
            const result = Movement.moveToRoom(this.creep, this.memory.scoutRoom);
            if (result === OK) {
                return true;
            }
        }

        return true;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        return [MOVE]
    }

    public override createSpawnMemory(spawn: StructureSpawn, roomname: string): ScoutCreepMemory {
        let base = super.createSpawnMemory(spawn, roomname);
        return {
            ...base,
        } as ScoutCreepMemory;
    }

    public override getJob(): eJobType {
        return eJobType.scout;
    }

    public override getMaxCreeps(workroom: string): number {
        return 1;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }

        const roomState = Memory.rooms[workroom]?.state;
        const scoutState = Memory.rooms[workroom]?.scoutState;
        if (!roomState || roomState < eRoomState.phase2) {
            return false; // Erst ab Phase 1
        }

        //somit startet einmalig eine suche, wenn  der status sich ändert :) 
        if (scoutState && scoutState >= roomState) {
            return false;
        }

        const scoutRadius = this.getScoutRadius(roomState);
        const unexploredRooms = this.findUnexploredRooms(workroom, scoutRadius);

        if (unexploredRooms.length == 0) {
            Memory.rooms[workroom].scoutState = roomState;
        }

        return unexploredRooms.length > 0;

    }

    private assignNextTarget(): void {
        const workroom = Game.rooms[this.memory.workRoom];
        if (!workroom) return;

        const roomState = Memory.rooms[workroom.name]?.state;
        if (!roomState) return;

        const scoutRadius = this.getScoutRadius(roomState);
        const unexploredRooms = this.findUnexploredRooms(workroom.name, scoutRadius);

        if (unexploredRooms.length > 0) {
            this.memory.scoutRoom = unexploredRooms[0];
            console.log(`Scout ${this.creep.name} erkundet jetzt ${this.memory.scoutRoom}`);
        } else {
            this.creep.suicide();
        }
    }

    private scoutCurrentRoom(): void {

        const room = Game.rooms[this.creep.room.name];
        if (!room) return;

        Memory.rooms[room.name] = {
            energySources: [],
            mineralSources: [],
            storage: undefined,
            state: eRoomState.neutral,
            invaderCore: false,
            needDefence: false,
        };

        if (room.controller?.owner?.username == "Invader") {
            room.memory.state = eRoomState.invader;
        } else {
            room.memory.state = eRoomState.otherPlayer;
        }

        const source = room.find(FIND_SOURCES);
        for (let s of source) {
            room.memory.energySources.push(new EnergieSourceData(s.id));
        }

        const mineral = room.find(FIND_MINERALS);
        for (let m of mineral) {
            room.memory.mineralSources.push(new MineralSourceData(m.id, m.mineralType));
        }

    }

    private getScoutRadius(roomState: eRoomState): number {
        if (roomState >= eRoomState.phase3) return 2; // Ab Phase 3: Radius 2
        if (roomState >= eRoomState.phase1) return 1; // Ab Phase 1: Radius 1 (Nachbarn)
        return 0;
    }

    private findUnexploredRooms(startRoom: string, radius: number): string[] {
        const unexplored: string[] = [];
        const visited = new Set<string>();

        this.exploreRadius(startRoom, radius, 0, visited, unexplored);

        return unexplored;
    }

    private exploreRadius(currentRoom: string, maxRadius: number, currentDepth: number, visited: Set<string>, unexplored: string[]): void {
        if (currentDepth > maxRadius || visited.has(currentRoom)) {
            return;
        }

        visited.add(currentRoom);

        if (currentDepth > 0 && !Memory.rooms[currentRoom]) {
            unexplored.push(currentRoom);
        }

        if (currentDepth < maxRadius) {
            const exits = Game.map.describeExits(currentRoom);
            if (exits) {
                for (const direction in exits) {
                    const neighborRoom = exits[direction as keyof ExitsInformation];
                    if (neighborRoom) {
                        this.exploreRadius(neighborRoom, maxRadius, currentDepth + 1, visited, unexplored);
                    }
                }
            }
        }
    }

}