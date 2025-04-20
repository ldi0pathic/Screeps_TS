export class Mem {

    static clean() {
        this.cleanCreeps()
    }

    private static cleanCreeps() {
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }
    }
}