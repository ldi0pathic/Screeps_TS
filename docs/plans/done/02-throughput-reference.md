# Throughput Reference

## Purpose

Consolidated formula reference for all plans. No implementation — numbers only.

---

## Source Throughput

| Source type | Energy/tick | Ticks to full regen |
|---|---|---|
| Owned / reserved | 10 e/t | 300 ticks (3000 energy) |
| Unreserved remote | 5 e/t | 300 ticks (1500 energy) |
| Reserved remote | 10 e/t | 300 ticks (3000 energy) |

---

## Miner Saturation

A stationary miner needs enough WORK parts to harvest the full regeneration rate:

| Source type | Min WORK | Energy/action | Harvest interval needed |
|---|---|---|---|
| Owned (10 e/t) | 5 WORK | 5 energy | every 2 ticks |
| Unreserved (5 e/t) | 3 WORK | 3 energy | every 1.67 ticks → every 2 ticks |
| Reserved (10 e/t) | 5 WORK | 5 energy | every 2 ticks |

### Endgame Miner Stagger (CPU/Income Trade-off)

**5 WORK on an owned source harvests 10 energy per action** (WORK_HARVEST_ENERGY = 2).
Source regenerates 10 e/t → running every tick = full saturation (10 e/t harvested).

Running every 2 ticks (`roundRobin = 2`):
- 10 energy harvested every 2 ticks = **5 e/t average** — only 50% of available income.
- Source accumulates the other 5 e/t unused between harvests.

This is a **deliberate CPU/income trade-off**, not a free optimization:

| roundRobin | CPU per miner/tick | Income | Use when |
|---|---|---|---|
| 1 (every tick) | ~0.3 CPU | 10 e/t (100%) | Growth phases — income matters |
| 2 (every 2 ticks) | ~0.15 CPU | 5 e/t (50%) | Endgame only — storage full, CPU matters more |

**Only use `roundRobin = 2` when:** storage is consistently full (> 200 000) and upgraders are already capped at 15 WORK. In growth phases (RCL1–6), always use `roundRobin = 1` — losing 50% source income severely slows progression.

With N rooms × 2 sources = 2N miners: switching to roundRobin=2 in endgame saves ~0.15 × 2N CPU/tick at the cost of 50% source income per room. Only worthwhile when storage is consistently full and upgraders are already at their 15 WORK cap.

---

## Miner Body Options

| Body | Energy | Use case |
|---|---|---|
| `[WORK×5, MOVE]` | 550 | Local owned source, container adjacent |
| `[WORK×5, CARRY, MOVE]` | 650 | Local source + small buffer needed |
| `[WORK×3, MOVE]` | 350 | Unreserved remote source |
| `[WORK×5, MOVE×3]` | 700 | Remote, may need repositioning |

---

## Hauler Carry Formula

```
CARRY = ceil(energyPerTick × roundTripTicks / 50)
```

Examples (owned source, 10 e/t):

| Round trip | CARRY parts | Capacity | MOVE (road) | MOVE (plain) |
|---|---|---|---|---|
| 10 ticks | 2 | 100 | 1 | 2 |
| 20 ticks | 4 | 200 | 2 | 4 |
| 30 ticks | 6 | 300 | 3 | 6 |
| 40 ticks | 8 | 400 | 4 | 8 |

Road MOVE ratio: 1 MOVE per 2 loaded non-MOVE parts.
Plain MOVE ratio: 1 MOVE per 1 loaded non-MOVE part.

Build roads on all hauler routes — halves MOVE count, halves body cost.

---

## MOVE Ratios by Terrain

| Terrain | Fatigue per non-MOVE part | MOVE needed (per non-MOVE part) |
|---|---|---|
| Road | 1 | 0.5 |
| Plain | 2 | 1 |
| Swamp | 10 | 5 |

Empty CARRY parts do NOT generate fatigue. Size MOVE based on loaded weight only.

---

## Upgrader Scaling

| Condition | WORK parts | Notes |
|---|---|---|
| Storage < 20 000 | 1–2 | Minimal; economy first |
| Storage 20 000–100 000 | 4–8 | Scale proportionally |
| Storage > 100 000 | 10–15 | Max out |
| RCL8 | ≤ 15 (hard cap) | No benefit beyond 15 WORK/tick |

Upgrader WORK formula: `floor((storage.energy - 20000) / 10000)`, capped at 15.

---

## Spawn Load

```
spawnLoad = (bodyParts × 3) / 1500
```

| Body parts | Spawn ticks | Spawn load |
|---|---|---|
| 5 | 15 | 1% |
| 15 | 45 | 3% |
| 30 | 90 | 6% |
| 50 (max) | 150 | 10% |

One spawn can support continuous spawning up to 10 full 50-part creeps.
At 10 rooms: spawn utilization must stay < 70% to allow emergency spawns.

---

## Link Economics

- 3% energy lost per transfer (fixed).
- Cooldown = 1 tick per tile of linear distance between links.
- Source link → storage link: replaces hauler route for owned rooms at RCL5+.
- CPU saving: 0 hauler movement = ~0.5–1.0 CPU saved per room.
- Energy loss: 3% × 10 e/t = 0.3 e/t. Worth it for CPU savings at 20 CPU budget.

---

## Remote Maintenance Costs

| Structure | Decay | Passive cost |
|---|---|---|
| Container (unowned room) | 5000 hits / 100 ticks | 0.5 e/t |
| Container (reserved room) | 5000 hits / 500 ticks | 0.1 e/t |
| Road (plain) | 100 hits / 1000 ticks | 0.001 e/t per tile |
| Road (swamp) | 500 hits / 1000 ticks | 0.005 e/t per tile |

A remote room with 1 container + 15 road tiles (plain): ~0.5 + 0.015 = 0.515 e/t maintenance.
Reserve the room to cut container cost from 0.5 to 0.1 e/t.

---

## Remote Net Income Formula

```
gross         = sourceCount × (reserved ? 10 : 5)
minerCost     = bodyCost(miners)  / 1500
haulerCost    = bodyCost(haulers) / 1500
reserverCost  = 650 / 600                          [= 1.08 e/t for basic reserver]
containerMaint= 0.1 per container (if reserved)
roadMaint     = tileCount × 0.001 (plain roads)
net           = gross - minerCost - haulerCost - reserverCost - containerMaint - roadMaint
```

Minimum acceptable: net > 3 e/t. Reject if uncertain.

---

## Tower Damage Estimate

| Range | Damage/tick |
|---|---|
| ≤ 5 | 600 |
| 10 | ~450 |
| 15 | ~300 |
| ≥ 20 | 150 |

Single tower kills standard NPC invader (1500 HP, no tough) in 3–10 ticks depending on range.
Boosted player attacker (12 TOUGH + boosts) may absorb > 1000 HP — tower alone insufficient.

---

## Repair Efficiency

| Repair method | Hits/action | Energy/action | Hits/energy |
|---|---:|---:|---:|
| Creep `repair` | 100 per `WORK` | 1 per `WORK` | 100 |
| Tower repair range <=5 | 800 | 10 | 80 |
| Tower repair range 15 | 400 | 10 | 40 |
| Tower repair range >=20 | 200 | 10 | 20 |

Conclusion:

- Creep repair is always more energy-efficient.
- Tower repair can still be CPU-/latency-efficient because it needs no creep travel.
- Use tower repair for emergencies, small local repairs, and surplus-energy maintenance.
- Use creep repair for planned peacetime maintenance, distant structures, roads, containers, ramparts, and walls.

---

## Construction Site Budget

Global limit: **100 construction sites** per account.

Reserve allocation (example for N owned + M remote rooms):
- Owned rooms (N × 5 active sites max per room)
- Remote roads and containers (M × 3 active sites max per remote)
- Emergency/bootstrap reserves: 10 slots
- Stop placing new sites when global total > 80 (leaves headroom for remote rooms)

See plan 12 for the full global construction site management policy.

LayoutManager must check `Object.keys(Game.constructionSites).length` before placing new sites.
See plan 12 for global construction site management.
