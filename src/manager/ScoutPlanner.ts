import {CPUManager} from "./CPUManager";
import {PassivePolicy} from "../policy/PassivePolicy";

const DISCOVER_INTERVAL = 500;
const CANDIDATE_REFRESH = 1000;
const MAX_DEPTH = 6;
const MIN_SETTLEMENT_SCORE = 75;
const BOOTSTRAP_RESERVE = 50000;
const EXPANSION_BUCKET_MIN = 5000;

interface SettlementCandidate {
    roomName: string;
    score: number;
    lastScored: number;
    state: 'queued' | 'scouted' | 'scored' | 'shortlisted' | 'reserved';
}

export class ScoutPlanner {

    static scoutQueue: string[] = [];
    static candidates: SettlementCandidate[] = [];

    /** Discover new rooms via BFS from owned rooms */
    static discoverFrontier(ownedRooms: string[]): void {
        if (!CPUManager.shouldRunEvery('scout_discover', DISCOVER_INTERVAL, 0)) return;
        if (Game.cpu.bucket < 5000) return;

        const visited = new Set<string>(ownedRooms);
        const queue: Array<{ room: string; depth: number }> = ownedRooms.map(r => ({ room: r, depth: 0 }));

        while (queue.length > 0) {
            const { room, depth } = queue.shift()!;
            if (depth >= MAX_DEPTH) continue;

            const exits = Game.map.describeExits(room);
            for (const dir in exits) {
                const neighbor = exits[dir as ExitKey];
                if (!neighbor || visited.has(neighbor)) continue;
                visited.add(neighbor);

                const status = Game.map.getRoomStatus(neighbor);
                if (status.status === 'closed') continue;

                const intel = Memory.intel?.[neighbor];
                if (!intel || Game.time - intel.scannedAt > 2000) {
                    if (!this.scoutQueue.includes(neighbor)) {
                        this.scoutQueue.push(neighbor);
                    }
                } else if (!this.candidates.find(c => c.roomName === neighbor)) {
                    this.scoreCandidate(neighbor);
                }

                queue.push({ room: neighbor, depth: depth + 1 });
            }
        }

        // Trim queue to reasonable size
        this.scoutQueue = this.scoutQueue.slice(0, 30);
    }

    /** Get next scout target (for ScoutAnt) */
    static getNextScoutTarget(): string | undefined {
        return this.scoutQueue[0];
    }

    /** Mark a room as scouted and score it */
    static onRoomScouted(roomName: string): void {
        this.scoutQueue = this.scoutQueue.filter(r => r !== roomName);
        this.scoreCandidate(roomName);
    }

    private static scoreCandidate(roomName: string): void {
        const intel = Memory.intel?.[roomName];
        if (!intel) return;

        // Hard filters
        if (!this.passesHardFilters(roomName, intel)) return;

        const score = this.computeScore(roomName, intel);
        const existing = this.candidates.find(c => c.roomName === roomName);
        if (existing) {
            existing.score = score;
            existing.lastScored = Game.time;
            existing.state = score >= MIN_SETTLEMENT_SCORE ? 'shortlisted' : 'scored';
        } else {
            this.candidates.push({
                roomName,
                score,
                lastScored: Game.time,
                state: score >= MIN_SETTLEMENT_SCORE ? 'shortlisted' : 'scored',
            });
        }
    }

    private static passesHardFilters(roomName: string, intel: RoomIntel): boolean {
        if (intel.sourceCount !== 2) return false;
        if (!intel.controllerPos) return false;
        if (intel.owner !== null) return false;
        if (intel.reservation !== null && intel.reservation !== this.getOwnUsername()) return false;
        if (intel.status === 'closed') return false;
        if (intel.status === 'highway' || intel.status === 'sk') return false;

        // Not adjacent to any used (owned/reserved) room
        const exits = Game.map.describeExits(roomName);
        for (const dir in exits) {
            const neighbor = exits[dir as ExitKey];
            if (!neighbor) continue;
            const room = Game.rooms[neighbor];
            if (room?.controller?.my) return false; // adjacent to owned room
            const neighborIntel = Memory.intel?.[neighbor];
            if (neighborIntel?.owner !== null && neighborIntel?.owner !== undefined) return false;
        }

        return true;
    }

    private static computeScore(roomName: string, intel: RoomIntel): number {
        let score = 0;

        // Logistics distance (10% weight)
        if (intel.routeDistance <= 3) score += 10;
        else if (intel.routeDistance <= 4) score += 7;
        else if (intel.routeDistance <= 6) score += 3;
        else return 0; // too far

        // Economy: 2 sources close to anchor (25% weight)
        score += 15; // basic: 2 sources exist (hard filter already checked)
        if (intel.sourceSlots.every(s => s >= 3)) score += 10;

        // Remote potential (15% weight)
        const exits = Game.map.describeExits(roomName);
        let remoteCount = 0;
        for (const dir in exits) {
            const neighbor = exits[dir as ExitKey];
            if (!neighbor) continue;
            const nIntel = Memory.intel?.[neighbor];
            if (nIntel && nIntel.owner === null && nIntel.sourceCount > 0) remoteCount++;
        }
        if (remoteCount >= 2) score += 15;
        else if (remoteCount >= 1) score += 8;

        // Defense: exit count estimate (35% weight)
        const exitCount = Object.keys(exits).filter(d => exits[d as ExitKey]).length;
        if (exitCount <= 2) score += 35;
        else if (exitCount <= 3) score += 20;
        else score += 5;

        // Mineral (15% weight) — any mineral is ok
        score += 10; // basic bonus for having a mineral (would check type with full intel)

        return Math.min(score, 100);
    }

    /** Return the best expansion target if criteria are met */
    static getBestExpansionTarget(ownedRooms: string[]): string | undefined {
        if (Game.cpu.bucket < EXPANSION_BUCKET_MIN) return undefined;

        const supportRoom = ownedRooms.find(r => {
            const room = Game.rooms[r];
            return (room?.storage?.store.energy ?? 0) >= BOOTSTRAP_RESERVE;
        });
        if (!supportRoom) return undefined;

        const shortlisted = this.candidates
            .filter(c => c.state === 'shortlisted' && c.score >= MIN_SETTLEMENT_SCORE)
            .sort((a, b) => b.score - a.score);

        return shortlisted[0]?.roomName;
    }

    private static getOwnUsername(): string {
        for (const name in Game.spawns) {
            return Game.spawns[name].owner.username;
        }
        return '';
    }

    /** Refresh stale shortlisted candidates */
    static refreshShortlisted(): void {
        if (!CPUManager.shouldRunEvery('scout_refresh', CANDIDATE_REFRESH, 0)) return;
        for (const c of this.candidates) {
            if (c.state === 'shortlisted' && Game.time - c.lastScored > CANDIDATE_REFRESH) {
                this.scoutQueue.unshift(c.roomName); // re-scout for fresh intel
            }
        }
    }
}
