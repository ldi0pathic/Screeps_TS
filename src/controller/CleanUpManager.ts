import {roomConfig} from "../config";

export class CleanUpManager {

    static addToCleanupQueue(creepName: string): void {
        if (!Memory.cleanupQueue) Memory.cleanupQueue = [];

        if (!Memory.cleanupQueue.includes(creepName)) {
            Memory.cleanupQueue.push(creepName);
            console.log(`🗑️ Added ${creepName} to cleanup queue`);
        }
    }

    static processCleanupQueue(): void {
        if (!Memory.cleanupQueue || Memory.cleanupQueue.length === 0) return;

        const toProcess = Memory.cleanupQueue.splice(0, 1);

        for (const name of toProcess) {
            const creep = Game.creeps[name];
            if (!creep) {
                console.log(`⚠️ Creep ${name} not found in Game.creeps during cleanup`);
                continue;
            }

            if (!this.cleanCreep(creep)) {
                Memory.cleanupQueue.unshift(name);
            }
        }
    }

    public static cleanMemory(): void {
        let cleanedCount = 0;

        // Clean dead creeps from memory
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
                cleanedCount++;
            }
        }

        if (Memory.rooms) {
            for (const roomName in Memory.rooms) {
                if (!roomConfig[roomName]) {
                    delete Memory.rooms[roomName];
                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned ${cleanedCount} dead objects from memory`);
        }
    }

    static cleanupJobMemory(): void {
        if (Game.time % 1500 !== 0) return;

        let cleanedJobs = 0;

        // Cleanup Job Offsets von toten Creeps
        if (Memory.jobOffsets) {
            Object.keys(Memory.jobOffsets).forEach(key => {
                const creepName = key.split('_')[0];
                if (!Game.creeps[creepName]) {
                    delete Memory.jobOffsets![key];
                    cleanedJobs++;
                }
            });
        }

        // Reset Job Cost Statistics (Soft Reset)
        if (Memory.jobCosts) {
            Object.keys(Memory.jobCosts).forEach(jobType => {
                const stats = Memory.jobCosts![jobType];
                if (Game.time - stats.lastReset > 1500) {
                    stats.total = stats.avg * 10;
                    stats.count = 10;
                    stats.lastReset = Game.time;
                    stats.peak = stats.avg * 1.5;
                }
            });
        }

        console.log(`🧹 Job Memory cleanup completed - ${cleanedJobs} jobs cleaned (Tick ${Game.time})`);
    }

    private static cleanCreep(creep: Creep): boolean {
        if (creep.store.getUsedCapacity() > 0) {
            const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: structure => {
                    return (structure.structureType === STRUCTURE_CONTAINER ||
                            structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity() > 0;
                }
            });

            if (target) {
                const resourceType = Object.keys(creep.store)[0] as ResourceConstant;
                const transferResult = creep.transfer(target, resourceType);

                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
                    return false;
                } else if (transferResult === OK) {
                    console.log(`📦 ${creep.name} dropped off ${resourceType} to ${target.structureType}`);
                    return creep.store.getUsedCapacity() === 0;
                }
            }

            for (const resourceType in creep.store) {
                creep.drop(resourceType as ResourceConstant);
            }
        }

        console.log(`🗑️ Removing invalid creep ${creep.name}`);
        if (Memory.jobOffsets) {
            Object.keys(Memory.jobOffsets).forEach(key => {
                if (key.startsWith(creep.name + '_')) {
                    if (Memory.jobOffsets && Memory.jobOffsets[key] != undefined) {
                        delete Memory.jobOffsets[key];
                    }
                }
            });
        }
        delete Memory.creeps[creep.name];
        creep.suicide();
        return true;
    }

    static runAllCleanup(): void {
        this.cleanMemory();
        this.processCleanupQueue();
        this.cleanupJobMemory();
    }

}