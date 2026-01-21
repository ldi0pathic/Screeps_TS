export class Room {
}

export class Creep {
}

export class Structure {
}

export class StructureLink extends Structure {
}

export const Game: {
    creeps: { [name: string]: any };
    rooms: any;
    spawns: any;
    time: any;
    cpu: any;
} = {
    creeps: {},
    rooms: [],
    spawns: {},
    time: 12345,
    cpu: {
        getUsed: () => 0
    }
};

export const Memory: {
    creeps: { [name: string]: any };
} = {
    creeps: {}
};
