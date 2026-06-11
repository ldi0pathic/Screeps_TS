# Market And Terminal

Use this for terminal transfers, market decisions, and end-game resource trading.

Sources:

- https://docs.screeps.com/market.html
- https://docs.screeps.com/api/
- https://docs.screeps.com/power.html

## Terminal Basics

Official:

- Terminals transfer resources instantly between rooms at any distance.
- Transfer cost is paid in energy by the sender/executing room.
- Terminal capacity is 300000.
- Terminal cooldown is 10 ticks.
- Terminal unlocks at RCL6.

Energy transfer cost:

```ts
Math.ceil(amount * (1 - Math.exp(-distanceBetweenRooms / 30)))
```

Rules:

- Every `send` or `deal` costs terminal energy regardless of transferred resource type.
- `Game.market.calcTransactionCost(amount, roomA, roomB)` estimates the cost.
- `OPERATE_TERMINAL` can reduce transfer energy cost and cooldown by 10/20/30/40/50%.

## Market Orders

Official:

- Orders are buy/sell orders tied to terminals.
- Creating an order costs 5% fee in credits.
- Extending an order costs `price * addAmount * 0.05`.
- Market order limit is 300 by constants, but API `createOrder` can return full at 50 orders on official docs page; verify live API if order automation matters.
- Executing a deal charges transfer energy and terminal cooldown to the player executing the deal.
- Max 10 deals per tick.
- If multiple players execute same order, shortest distance wins.

Implementation:

- Always include transfer cost in effective price.
- Prefer filtered `getAllOrders({ type, resourceType })`; full or function-filter scans are slow.
- Cache market snapshots; do not evaluate all orders every tick.

## Effective Price

Derived:

```text
effective_buy_cost = credits + terminal_energy_cost * local_energy_value
effective_sell_value = credits - terminal_energy_cost * local_energy_value
```

For energy trades, terminal transfer cost can erase most apparent profit at distance.

## NPC Terminals

Official:

- Highway crossroads contain NPC terminals.
- They allow surplus conversion but are not necessarily competitive.
- NPC orders replenish by rules.

Use:

- Bootstrap first credits.
- Emergency resource conversion when player market liquidity is poor.

## Power Economy

Official:

- Power can be mined from power banks or bought.
- Power spawn processes 1 power/tick.
- Processing cost is 50 energy per 1 power.
- `OPERATE_POWER` increases power processing speed by 1/2/3/4/5 per tick.

Derived:

- Base full-time processing consumes 50 energy/tick.
- Treat GPL processing as an RCL8 surplus-energy sink.
