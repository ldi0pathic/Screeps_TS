import {roomConfig} from "./config";
import {jobs} from './jobs';
import {Ant} from "./ants/Ant";

export function loop(): void {


    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        let job: Ant = jobs[creep.memory.job];
        if (!job) {
            creep.suicide()
            continue;
        }
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