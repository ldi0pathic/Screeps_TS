import {roomConfig} from "../config";
import {Movement} from "../utils/Movement";
import {HarvesterAnt} from "./base/HarvesterAnt";
import _ from "lodash";

export class BuilderAnt extends HarvesterAnt<BuilderCreepMemory> {

    doJob(): boolean {

        if (super.doJob()) {
            return true;
        }

        let buildId = this.memory.constructionId;

        if (!buildId) {
            const todos = this.creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: (site: ConstructionSite) => {
                    return site.structureType !== STRUCTURE_RAMPART;
                }
            });
            if (todos.length > 0) {
                // Sortiere nach Priorität: Container zuerst, dann Rest
                todos.sort((a, b) => {
                    const priorityA = a.structureType === STRUCTURE_CONTAINER ? 0 : 1;
                    const priorityB = b.structureType === STRUCTURE_CONTAINER ? 0 : 1;
                    return priorityA - priorityB;
                });

                buildId = todos[0].id;
                this.memory.constructionId = buildId;
            }
        }

        if (buildId) {
            const build = Game.getObjectById(buildId);
            if (build) {
                this.creep.say('🪚');
                if (this.creep.build(build) === ERR_NOT_IN_RANGE) {
                    this.moveTo(build);
                }
                return true;
            }
            this.memory.constructionId = undefined;
        }

        if (this.creep.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (site: ConstructionSite) => {
                return site.structureType !== STRUCTURE_RAMPART;
            }
        }).length == 0) {
            const controller = this.creep.room.controller;
            if (controller && this.creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                this.moveTo(controller);
                return true;
            }
        }
        return true;
    }

    public createSpawnMemory(spawn: StructureSpawn, workroom: string): BuilderCreepMemory {
        let base = super.createSpawnMemory(spawn, workroom);
        return {
            ...base,
            constructionId: undefined,
        } as BuilderCreepMemory;
    }

    public override getProfil(workroom: Room): BodyPartConstant[] {
        if (workroom.memory.state < eRoomState.phase3) {
            return [WORK, CARRY, MOVE]
        }

        const availableEnergy = workroom.getMaxAvailableEnergy();

        const workPerSet = 3;
        const carryPerSet = 2;
        const movePerSet = 2;
        const setCost = workPerSet * BODYPART_COST[WORK] + carryPerSet * BODYPART_COST[CARRY] + movePerSet * BODYPART_COST[MOVE];

        const maxSets = Math.floor(availableEnergy / setCost);
        const numberOfSets = Math.min(7, maxSets);

        const body = [];
        for (let i = 0; i < numberOfSets; i++) {
            body.push(...Array(workPerSet).fill(WORK));
            body.push(...Array(carryPerSet).fill(CARRY));
            body.push(...Array(movePerSet).fill(MOVE));
        }

        return body;
    }

    public override getJob(): eJobType {
        return eJobType.builder;
    }

    public override getMaxCreeps(workroom: string): number {
        return roomConfig[workroom].builderCount || 0;
    }

    protected shouldSpawn(workroom: string): boolean {

        if (roomConfig[workroom].spawnRoom != undefined) {
            return false;
        }

        const creeps = _.filter(Game.creeps, creep =>
            creep.memory.job == this.getJob() &&
            creep.memory.workRoom == workroom
        );

        if (creeps.length >= this.getMaxCreeps(workroom)) {
            return false;
        }

        const room = Game.rooms[workroom];
        if (!room) {
            return false;
        }

        const todos = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType != STRUCTURE_RAMPART
        });
        
        return todos.length > 0;
    }
}