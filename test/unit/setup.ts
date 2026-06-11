/**
 * Screeps global setup for unit tests.
 * Required before any test file loads — sets up all globals that src/ files expect.
 */
const g = global as any;

// --- Screeps classes (needed for prototype extensions in loadExtensions) ---
g.Room = class Room {};
g.Creep = class Creep {};
g.Structure = class Structure {};
g.StructureLink = class StructureLink extends g.Structure {};
g.RoomPosition = class RoomPosition {
    constructor(public x: number, public y: number, public roomName: string) {}
};

// --- Body part constants ---
g.WORK = 'work';
g.CARRY = 'carry';
g.MOVE = 'move';
g.CLAIM = 'claim';
g.TOUGH = 'tough';
g.ATTACK = 'attack';
g.RANGED_ATTACK = 'ranged_attack';
g.HEAL = 'heal';

g.BODYPART_COST = {
    move: 50,
    work: 100,
    carry: 50,
    attack: 80,
    ranged_attack: 150,
    heal: 250,
    claim: 600,
    tough: 10,
};

// --- Resource / direction constants ---
g.RESOURCE_ENERGY = 'energy';
g.TOP = 1; g.TOP_RIGHT = 2; g.RIGHT = 3; g.BOTTOM_RIGHT = 4;
g.BOTTOM = 5; g.BOTTOM_LEFT = 6; g.LEFT = 7; g.TOP_LEFT = 8;

// --- Structure type constants ---
g.STRUCTURE_CONTAINER = 'container';
g.STRUCTURE_LINK = 'link';
g.STRUCTURE_STORAGE = 'storage';
g.STRUCTURE_TOWER = 'tower';
g.STRUCTURE_SPAWN = 'spawn';
g.STRUCTURE_EXTENSION = 'extension';
g.STRUCTURE_TERMINAL = 'terminal';
g.STRUCTURE_EXTRACTOR = 'extractor';
g.STRUCTURE_RAMPART = 'rampart';
g.STRUCTURE_ROAD = 'road';
g.STRUCTURE_WALL = 'constructedWall';
g.STRUCTURE_OBSERVER = 'observer';
g.STRUCTURE_INVADER_CORE = 'invaderCore';
g.STRUCTURE_NUKER = 'nuker';

// --- Find/Look constants ---
g.FIND_STRUCTURES = 107;
g.FIND_MY_STRUCTURES = 108;
g.FIND_HOSTILE_STRUCTURES = 109;
g.FIND_SOURCES = 105;
g.FIND_SOURCES_ACTIVE = 104;
g.FIND_DROPPED_RESOURCES = 111;
g.FIND_TOMBSTONES = 117;
g.FIND_RUINS = 118;
g.FIND_MY_SPAWNS = 101;
g.FIND_CONSTRUCTION_SITES = 109;
g.FIND_MY_CONSTRUCTION_SITES = 110;
g.FIND_HOSTILE_CREEPS = 104;
g.FIND_CREEPS = 102;
g.FIND_FLAGS = 112;
g.FIND_NUKES = 122;
g.FIND_EXIT = 10;

g.LOOK_STRUCTURES = 'structure';
g.LOOK_CONSTRUCTION_SITES = 'constructionSite';
g.LOOK_CREEPS = 'creep';
g.LOOK_TERRAIN = 'terrain';

// --- Terrain ---
g.TERRAIN_MASK_WALL = 1;
g.TERRAIN_MASK_SWAMP = 2;

// --- Error codes ---
g.OK = 0;
g.ERR_NOT_OWNER = -1;
g.ERR_NO_PATH = -2;
g.ERR_BUSY = -4;
g.ERR_NOT_ENOUGH_ENERGY = -6;
g.ERR_NOT_ENOUGH_RESOURCES = -6;
g.ERR_NOT_IN_RANGE = -9;
g.ERR_TIRED = -8;
g.ERR_INVALID_TARGET = -7;
g.ERR_FULL = -8;
g.ERR_GCL_NOT_ENOUGH = -15;

// --- Color constants ---
g.COLOR_WHITE = 1;
g.COLOR_RED = 3;
g.COLOR_YELLOW = 6;

// --- Effect constants ---
g.EFFECT_INVULNERABILITY = 1003;

// --- Game object (minimal) ---
g.Game = {
    creeps: {},
    rooms: {},
    spawns: {},
    time: 12345,
    cpu: { getUsed: () => 0, bucket: 10000, limit: 20 },
    constructionSites: {},
    getObjectById: (_id: string) => null,
    map: {
        describeExits: (_room: string) => ({}),
        getRoomLinearDistance: (_a: string, _b: string) => 1,
        getRoomStatus: (_room: string) => ({ status: 'normal' }),
    },
};

g.Memory = {
    creeps: {},
    rooms: {},
    spawnQueue: [],
};

g.PathFinder = {
    search: () => ({ path: [], ops: 0, cost: 0, incomplete: false }),
    CostMatrix: class CostMatrix {
        set(_x: number, _y: number, _val: number) {}
        get(_x: number, _y: number) { return 0; }
        clone() { return new g.PathFinder.CostMatrix(); }
    },
};
