export class CleanUpManager {
    static addToCleanupQueue(creepName: string): void {
        if (!Memory.cleanupQueue) Memory.cleanupQueue = [];

        if (!Memory.cleanupQueue.includes(creepName)) {
            Memory.cleanupQueue.push(creepName);
            const creep = Game.creeps[creepName];
            if (creep) {
                creep.memory.cleaning = true;
            }
        }
    }

    static processCleanupQueue(): void {

        if (!Memory.cleanupQueue) Memory.cleanupQueue = [];

        const toProcess = Memory.cleanupQueue.splice(0, 1);

        for (const name of toProcess) {
            const creep = Game.creeps[name];
            if (!creep) continue;

            if (!this.cleanCreep(creep)) {
                Memory.cleanupQueue.unshift(name);
            }
        }

    }

    public static cleanMemory(): void {
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }
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
                if (creep.transfer(target, resourceType) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
                }
                return false;
            }

            for (const resourceType in creep.store) {
                creep.drop(resourceType as ResourceConstant);
            }
        }

        console.log(`🗑️ Entferne ungültigen Creep ${creep.name}`);
        delete Memory.creeps[creep.name];
        creep.suicide();
        return true;
    }
}