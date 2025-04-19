import {Ant} from "../roles/Ant";
import {WorkerAnt} from "../roles/WorkerAnt";
import {MinerAnt} from "../roles/MinerAnt";
import {UpgraderAnt} from "../roles/UpgraderAnt";
import {BuilderAnt} from "../roles/BuilderAnt";
import {roomConfig} from "../config";


export class Jobs {

    private static jobs: Ants = {
        Worker: new WorkerAnt(),
        Miner: new MinerAnt(),
        Upgrader: new UpgraderAnt(),
        Builder: new BuilderAnt(),
    }
    
    static loop() {
        for (const creepName in Game.creeps) {
            const creep = Game.creeps[creepName];
            let job: Ant = Jobs.jobs[creep.memory.job];
            if (!job) {
                creep.suicide()
                continue;
            }
            job.doJob(creep)
        }
    }

    static spawn() {
        for (const spawnName in Game.spawns) {
            let spawn = Game.spawns[spawnName];

            if (spawn.spawning) {
                continue;
            }

            for (const name in roomConfig) {
                const room = Game.rooms[name];

                for (let jobName in Jobs.jobs) {
                    let job: Ant = Jobs.jobs[jobName];
                    job.spawn(spawn, room);
                }
            }
        }
    }
}