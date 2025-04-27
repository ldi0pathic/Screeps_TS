export class CleanUpManager {
    private static cleanupQueue: string[] = [];

    static addToCleanupQueue(creepName: string): void {
        if (!this.cleanupQueue.includes(creepName)) {
            this.cleanupQueue.push(creepName);

            const creep = Game.creeps[creepName];
            if (creep) {
                creep.memory.cleaning = true;
            }
        }
    }

    static processCleanupQueue(): void {
        for (let i = this.cleanupQueue.length - 1; i >= 0; i--) {
            const name = this.cleanupQueue[i];
            const creep = Game.creeps[name];

            if (!creep) {
                this.cleanupQueue.splice(i, 1);
                continue;
            }

            if (this.cleanCreep(creep)) {
                this.cleanupQueue.splice(i, 1);
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