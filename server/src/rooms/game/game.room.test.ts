import { afterAll, beforeAll, expect, it } from 'bun:test';
import { Client, type Room } from '@colyseus/sdk';

import type { PlayerView } from '@amball/contracts';

import { server } from '#config/app.config.ts';
import { MessageType } from './protocol.types.ts';
import { REVEAL_MS } from './game.room.ts';

const PORT = 25671;

beforeAll(async () => {
  await server.listen(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

function connect(room: Room): { views: PlayerView[]; refusals: string[] } {
  const seen = { views: [] as PlayerView[], refusals: [] as string[] };
  room.onMessage(MessageType.View, (view: PlayerView) => seen.views.push(view));
  room.onMessage(MessageType.Refused, (text: string) => seen.refusals.push(text));
  return seen;
}

async function until(condition: () => boolean, timeout = REVEAL_MS + 2000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Не дождались условия');
    await Bun.sleep(10);
  }
}

it('два настоящих клиента играют через комнату и не видят карт друг друга', async () => {
  const client = new Client(`ws://localhost:${PORT}`);
  const hostRoom = await client.create('game', { username: 'Аня', deckType: '36' });
  const host = connect(hostRoom);
  const guestRoom = await client.joinById(hostRoom.roomId, { username: 'Боря' });
  const guest = connect(guestRoom);

  await until(() => host.views.at(-1)?.seats.length === 2);
  guestRoom.send(MessageType.Start);
  await until(() => guest.refusals.length === 1);

  hostRoom.send(MessageType.Start);
  await until(
    () => host.views.at(-1)?.phase === 'playing' && guest.views.at(-1)?.phase === 'playing',
  );

  const hostView = host.views.at(-1)!;
  const guestView = guest.views.at(-1)!;
  expect(hostView.hand).toHaveLength(9);
  const hostIds = new Set(hostView.hand.map((card) => card.id));
  expect(guestView.hand.some((card) => hostIds.has(card.id))).toBe(false);

  const first = hostView.hand[0]!;
  const declared = hostView.ranks.find((rank) => rank !== first.rank)!;
  hostRoom.send(MessageType.Play, { cardIds: [first.id], rank: declared });
  await until(() => guest.views.at(-1)?.canCheck === true);

  guestRoom.send(MessageType.Check);
  await until(() => guest.views.at(-1)?.phase === 'reveal');
  expect(guest.views.at(-1)!.reveal).toMatchObject({
    truthful: false,
    loserId: hostRoom.sessionId,
  });

  await until(() => host.views.at(-1)?.round === 2);
  expect(host.views.at(-1)!.phase).toBe('playing');
  expect(host.views.at(-1)!.currentId).toBe(guestRoom.sessionId);

  await guestRoom.leave();
  await until(() => host.views.at(-1)?.phase === 'finished');
  await hostRoom.leave();
}, 15000);

it('втроём: все за столом, ход идёт по кругу', async () => {
  const client = new Client(`ws://localhost:${PORT}`);
  const a = await client.create('game', { username: 'А' });
  const seenA = connect(a);
  const b = await client.joinById(a.roomId, { username: 'Б' });
  const seenB = connect(b);
  const c = await client.joinById(a.roomId, { username: 'В' });
  const seenC = connect(c);
  a.send(MessageType.Ready);
  await until(() => seenA.views.at(-1)?.seats.length === 3);
  a.send(MessageType.Start);
  await until(() => seenC.views.at(-1)?.phase === 'playing');
  for (const [room, seen] of [
    [a, seenA],
    [b, seenB],
    [c, seenC],
  ] as const) {
    await until(() => seen.views.at(-1)?.currentId === room.sessionId);
    expect(seen.views.at(-1)!.secondsLeft).toBeGreaterThan(0);
    const view = seen.views.at(-1)!;
    expect(view.seats).toHaveLength(3);
    room.send(MessageType.Play, {
      cardIds: [view.hand[0]!.id],
      rank: view.tableRank ?? view.ranks[0],
    });
    await until(() => seen.views.at(-1)?.currentId !== room.sessionId);
  }
  await until(() => seenC.views.at(-1)?.phase === 'shop' && seenA.views.at(-1)?.shop !== null);
  expect(seenA.views.at(-1)!.secondsLeft).toBeGreaterThan(0);
  for (const room of [a, b, c]) room.send(MessageType.ShopReady);
  await until(() => seenA.views.at(-1)?.phase === 'playing');
  await until(() => seenA.views.at(-1)?.currentId === a.sessionId);
  await Promise.all([a.leave(), b.leave(), c.leave()]);
}, 15000);
