import {extendRoom} from "./RoomExtension";
import {extendCreep} from "./CreepExtensions";

export function loadExtensions() {
    extendRoom();
    extendCreep();

}