import {CPUManager} from "./CPUManager";
import {BodyBuilder} from "../utils/BodyBuilder";
import {PassivePolicy} from "../policy/PassivePolicy";

const SCAN_INTERVAL = 200;
const CANDIDATE_TTL = 500;
const BLOCKED_TTL = 2000;
const DANGER_RECHECK = 50;

export class RemotePlanner {

    /** Evaluate one remote room per tick, staggered by owned-room index */
    static runStaggered(ownedRooms: string[]): void {
        if (Game.cpu.bucket < 3000) return;

        for (let i = 0; i < ownedRooms.length; i++) {
            if (!CPUManager.shouldRunEvery(`remotePlan_${ownedRooms[i]}`, SCAN_INTERVAL, i)) continue;
            this.evaluateRemotesForRoom(ownedRooms[i]);
        }

        // Expire danger cooldowns and advance safe candidates
        this.expireDangerCooldowns();
        this.activateReadyCandidates();
    }

    private static evaluateRemotesForRoom(homeRoom: string): void {
        if (!Memory.remoteIntel) Memory.remoteIntel = {};

        const home = Game.rooms[homeRoom];
        if (!home?.controller?.my) return;
        if ((home.storage?.store.energy ?? 0) < 50000) return; // not ready for remotes

        const exits = Game.map.describeExits(homeRoom);
        for (const dir in exits) {
            const roomName = exits[dir as ExitKey];
            if (!roomName) continue;

            const existing = Memory.remoteIntel[roomName];
            const intel = Memory.intel?.[roomName];

            // Skip if blocked and not yet time to recheck
            if (existing?.state === 'blocked' &&
                Game.time - (existing.scannedAt ?? 0) < BLOCKED_TTL) continue;

            // Skip if danger and cooldown not expired
            if (existing?.state === 'danger' &&
                Game.time < (existing.dangerCooldownUntil ?? 0)) continue;

            // Skip if recent fresh candidate/mining entry; stale candidates are re-evaluated.
            if ((existing?.state === 'mining' || existing?.state === 'candidate') &&
                Game.time - (existing.scannedAt ?? 0) < CANDIDATE_TTL) continue;

            if (!intel) {
                // Mark as unknown — needs scouting
                Memory.remoteIntel[roomName] = {
                    roomName,
                    state: 'unknown',
                    homeRoom,
                    scannedAt: 0,
                    sourceCount: 0,
                    reserved: false,
                    reservationExpires: 0,
                    netIncome: 0,
                    routeDistance: 1,
                    dangerCooldownUntil: 0,
                    invaderCoreExpires: 0,
                };
                continue;
            }

            // Hard filters
            if (intel.owner !== null || intel.status === 'highway' || intel.status === 'sk') {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'blocked' };
                continue;
            }
            if (intel.invaderCore && intel.coreExpires > Game.time) {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'danger', dangerCooldownUntil: intel.coreExpires };
                continue;
            }
            if (intel.threat === 'player' && intel.threatExpires > Game.time) {
                Memory.remoteIntel[roomName] = { ...this.baseEntry(roomName, homeRoom), state: 'danger', dangerCooldownUntil: intel.threatExpires };
                continue;
            }

            // Calculate ROI
            const sourceCount = intel.sourceCount;
            const reserved = intel.reservation === this.getOwnUsername();
            const gross = sourceCount * (reserved ? 10 : 5);

            const routeDistance = intel.routeDistance;
            const roundTrip = routeDistance * 6;
            const minerBody = BodyBuilder.remoteMiner(reserved);
            const haulerBody = BodyBuilder.hauler(reserved ? 10 : 5, roundTrip, true);
            const reserverBody = BodyBuilder.reserver(false);

            const minerCost = BodyBuilder.bodyCost(minerBody) / 1500 * sourceCount;
            const haulerCost = BodyBuilder.bodyCost(haulerBody) / 1500 * sourceCount;
            const reserverCost = reserved ? BodyBuilder.bodyCost(reserverBody) / 600 : 0;
            const containerMaint = reserved ? 0.1 * sourceCount : 0.5 * sourceCount;
            const roadMaint = routeDistance * 10 * 0.001;

            const net = gross - minerCost - haulerCost - reserverCost - containerMaint - roadMaint;

            const state: RemoteState = net >= 3 ? 'candidate' : 'blocked';

            Memory.remoteIntel[roomName] = {
                roomName,
                state,
                homeRoom,
                scannedAt: Game.time,
                sourceCount,
                reserved,
                reservationExpires: intel.reservation ? Game.time + 5000 : 0,
                netIncome: net,
                routeDistance,
                dangerCooldownUntil: 0,
                invaderCoreExpires: intel.coreExpires,
            };
        }
    }

    private static expireDangerCooldowns(): void {
        if (!Memory.remoteIntel) return;
        for (const [roomName, remote] of Object.entries(Memory.remoteIntel)) {
            if (remote.state === 'danger' && Game.time >= remote.dangerCooldownUntil) {
                remote.state = 'candidate';
            }
        }
    }

    private static activateReadyCandidates(): void {
        if (!Memory.remoteIntel) return;

        for (const [roomName, remote] of Object.entries(Memory.remoteIntel)) {
            if (remote.state !== 'candidate') continue;
            if (remote.netIncome < 3) continue;
            if (remote.dangerCooldownUntil > Game.time) continue;

            const home = Game.rooms[remote.homeRoom];
            if (!home?.controller?.my) continue;
            if ((home.storage?.store.energy ?? 0) < 50000) continue;

            const intel = Memory.intel?.[roomName];
            if (!intel) continue;
            if (Game.time - intel.scannedAt > CANDIDATE_TTL) continue;
            if (intel.owner !== null) continue;
            if (intel.threat === 'player' && intel.threatExpires > Game.time) continue;
            if (intel.invaderCore && intel.coreExpires > Game.time) continue;

            remote.state = 'mining';
            remote.scannedAt = Game.time;
        }
    }

    private static baseEntry(roomName: string, homeRoom: string): RemoteRoomIntel {
        return {
            roomName,
            state: 'unknown',
            homeRoom,
            scannedAt: Game.time,
            sourceCount: 0,
            reserved: false,
            reservationExpires: 0,
            netIncome: 0,
            routeDistance: 1,
            dangerCooldownUntil: 0,
            invaderCoreExpires: 0,
        };
    }

    private static getOwnUsername(): string {
        for (const name in Game.spawns) {
            return Game.spawns[name].owner.username;
        }
        return '';
    }

    /** Activate a candidate remote as mining once all conditions are met */
    static activateCandidate(roomName: string): void {
        const entry = Memory.remoteIntel?.[roomName];
        if (!entry || entry.state !== 'candidate') return;
        entry.state = 'mining';
    }
}
