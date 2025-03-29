﻿import {Worker} from './creep/Worker';
import {RoomConfig, roomConfig} from "./config";
import {jobs} from './jobs';
import {Ant} from "./creep/Ant";

export function loop(): void {


    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        let job: Ant = jobs[creep.memory.job];
        job.doJob(creep)
    }
    for (const spawnName in Game.spawns) {
        let spawn = Game.spawns[spawnName];

        if (spawn.spawning) {
            continue;
        }

        for (const name in roomConfig) {
            const room = Game.rooms[name];

            for (let jobName in jobs) {
                let job: Ant = jobs[jobName];
                job.spawn(spawn, room);
            }
        }
    }
}