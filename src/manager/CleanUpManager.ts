﻿import {CreepStorage} from "../storage/CreepStorage";

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
                continue;
            }

            if (!this.cleanCreep(creep)) {
                Memory.cleanupQueue.unshift(name);
            }
        }
    }

    public static cleanMemory(): void {
        const creepStorage = CreepStorage.getInstance();
        Object.keys(Memory.creeps).forEach(creepName => {
            if (!Game.creeps[creepName]) {
                const deadCreepMemory = Memory.creeps[creepName];
                creepStorage.onCreepDied(deadCreepMemory);
                delete Memory.creeps[creepName];
            }
        });
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

        console.log(`🧹 Job Memory cleanup completed - ${cleanedJobs} jobs cleaned (Tick ${Game.time})`);
    }

    static runAllCleanup(): void {
        this.cleanMemory();
        this.processCleanupQueue();
        this.cleanupJobMemory();
        this.cleanUpManagers()
    }

    static cleanUpManagers(): void {
        if (Game.time % 50 !== 0) {
            return;
        }
        const creepStorage = CreepStorage.getInstance();
        creepStorage.cleanupCache();
    }


    private static cleanCreep(creep: Creep): boolean {
        const resourceType = Object.keys(creep.store)[0] as ResourceConstant;
        if (creep.store[resourceType] > 0) {
            const target = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: structure => {
                    return (structure.structureType === STRUCTURE_CONTAINER ||
                            structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity() > creep.store[resourceType];
                }
            });

            if (target) {
                const transferResult = creep.transfer(target, resourceType);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
                    return false;
                } else if (transferResult === OK) {
                    console.log(`📦 ${creep.name} dropped off ${resourceType} to ${target.structureType}`);
                    return creep.store[resourceType] == 0;
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
        creep.suicide();
        delete Memory.creeps[creep.name];

        return true;
    }

}