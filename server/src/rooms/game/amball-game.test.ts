import { describe, expect, it } from 'bun:test';

import {
  AmballGame,
  GameError,
  HAND_SIZE,
  REROLL_COST,
  roundIncome,
  STARTING_COINS,
} from './amball-game.ts';
import type { Card, JokerName, CardRank } from '@amball/contracts';

/** Детерминированный генератор: партия в тесте всегда одна и та же. */
function seeded(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function rawGame(players = 2, deck: '36' | '52' = '36'): AmballGame {
  const game = new AmballGame(deck, seeded());
  for (let i = 0; i < players; i++) game.addPlayer(`p${i}`, `P${i}`);
  game.start('p0');
  return game;
}

/** Для тестов правил хода: витрина закрывается сразу и не мешает. */
function started(players = 2, deck: '36' | '52' = '36'): AmballGame {
  const game = rawGame(players, deck);
  const play = game.play.bind(game);
  game.play = (id, cardIds, rank) => {
    play(id, cardIds, rank);
    game.closeShop();
  };
  return game;
}

function give(game: AmballGame, id: string, name: JokerName): number {
  const joker = { id: 1000 + game.player(id).jokers.length, name };
  game.player(id).jokers.push(joker);
  return joker.id;
}

function setHand(game: AmballGame, id: string, ranks: CardRank[], base = 500): Card[] {
  const hand = ranks.map((rank, i): Card => ({
    id: base + i,
    suit: 'Hearts',
    rank,
    type: 'Default',
  }));
  game.player(id).hand = hand;
  return hand;
}

describe('старт', () => {
  it('раздаёт по 9 карт без джокеров из перемешанной колоды на 36', () => {
    const game = started();
    expect(game.player('p0').hand).toHaveLength(HAND_SIZE);
    expect(game.deckCount).toBe(36 - 18);
    expect(game.player('p0').jokers).toHaveLength(0);
  });

  it('колода на 52 содержит двойки, а старт доступен только создателю и от двух игроков', () => {
    expect(started(2, '52').ranks).toContain('2');
    const game = new AmballGame();
    game.addPlayer('a', 'A');
    expect(() => game.start('a')).toThrow(GameError);
    game.addPlayer('b', 'B');
    expect(() => game.start('b')).toThrow(GameError);
  });
});

describe('ход', () => {
  it('первый ход задаёт достоинство, следующий обязан его держать', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7']);
    setHand(game, 'p1', ['8', '9'], 600);
    game.play('p0', [500], 'Ace');
    expect(game.tableRank).toBe('Ace');
    expect(game.currentId).toBe('p1');
    expect(() => game.play('p1', [600], 'King')).toThrow(GameError);
    game.play('p1', [600], 'Ace');
    expect(game.tableCards).toHaveLength(2);
  });

  it('отказывает чужому ходу, чужой карте и больше чем 4 картам', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7', '8', '9', '10']);
    expect(() => game.play('p1', [500], 'Ace')).toThrow(GameError);
    expect(() => game.play('p0', [999], 'Ace')).toThrow(GameError);
    expect(() => game.play('p0', [500, 501, 502, 503, 504], 'Ace')).toThrow(GameError);
    expect(() => game.play('p0', [500, 500], 'Ace')).toThrow(GameError);
  });
});

it('больше 4 карт можно положить, только если они одного достоинства', () => {
  const game = started();
  setHand(game, 'p0', ['6', '6', '6', '6', '6', '7']);
  game.play('p0', [500, 501, 502, 503, 504], 'Ace');
  expect(game.tableCards).toHaveLength(5);
});

describe('проверка', () => {
  it('блеф: стол забирает блефовавший, раунд начинает проверяющий', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7']);
    game.play('p0', [500], 'Ace');
    game.check('p1');
    expect(game.phase).toBe('reveal');
    expect(game.reveal).toMatchObject({ truthful: false, loserId: 'p0' });
    game.resolveReveal();
    expect(game.player('p0').hand.map((c) => c.id)).toContain(500);
    expect(game.currentId).toBe('p1');
    expect(game.round).toBe(2);
    expect(game.tableRank).toBeNull();
  });

  it('правда: стол забирает проверяющий, раунд начинает следующий за ним', () => {
    const game = started(3);
    setHand(game, 'p0', ['Ace', '7']);
    game.play('p0', [500], 'Ace');
    game.check('p1');
    expect(game.reveal).toMatchObject({ truthful: true, loserId: 'p1' });
    game.resolveReveal();
    expect(game.currentId).toBe('p2');
  });

  it('нельзя проверить свой ход и пустой стол; новый раунд добирает руку до 9', () => {
    const game = started();
    expect(() => game.check('p0')).toThrow(GameError);
    setHand(game, 'p0', ['6', '7']);
    game.play('p0', [500], 'Ace');
    game.check('p1');
    game.resolveReveal();
    expect(game.player('p1').hand.length).toBe(HAND_SIZE);
  });
});

describe('сброс', () => {
  it('сбрасывает ровно четыре одинаковых и оставляет ход', () => {
    const game = started();
    setHand(game, 'p0', ['6', '6', '6', '6', '7']);
    expect(() => game.drop('p0', [500, 501, 502])).toThrow(GameError);
    game.drop('p0', [500, 501, 502, 503]);
    expect(game.player('p0').hand).toHaveLength(1);
    expect(game.currentId).toBe('p0');
  });

  it('отказывает в разных достоинствах', () => {
    const game = started();
    setHand(game, 'p0', ['6', '6', '6', '7']);
    expect(() => game.drop('p0', [500, 501, 502, 503])).toThrow(GameError);
  });
});

describe('конец игры', () => {
  it('заканчивается, когда карты остались у одного, и первым идёт избавившийся', () => {
    const game = started();
    (game as unknown as { deck: Card[] }).deck = [];
    setHand(game, 'p0', ['Ace']);
    setHand(game, 'p1', ['6', '7'], 600);
    game.play('p0', [500], 'Ace');
    game.check('p1');
    game.resolveReveal();
    expect(game.phase).toBe('finished');
    expect(game.placements).toEqual(['p0', 'p1']);
  });

  it('выход соперника при двух игроках завершает партию', () => {
    const game = started();
    game.removePlayer('p1');
    expect(game.phase).toBe('finished');
    expect(game.placements).toEqual(['p0']);
  });

  it('выход текущего игрока передаёт ход', () => {
    const game = started(3);
    game.removePlayer('p0');
    expect(game.currentId).toBe('p1');
  });

  it('если проверить некому, стол уходит из игры и партия не зависает', () => {
    const game = started();
    (game as unknown as { deck: Card[] }).deck = [];
    setHand(game, 'p0', ['Ace', '7']);
    game.player('p1').hand = [];
    game.play('p0', [500], 'Ace');
    expect(game.tableCards).toHaveLength(0);
    expect(game.phase).toBe('finished');
  });
});

describe('выдача джокеров', () => {
  it('Разворот меняет направление хода, а ход остаётся у применившего', () => {
    const game = started(3);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Reverse') });
    expect(game.currentId).toBe('p0');
    expect(game.viewFor('p1').direction).toBe(-1);
    game.play('p0', [game.player('p0').hand[0]!.id], 'Ace');
    expect(game.currentId).toBe('p2');
    game.useJoker('p2', { jokerId: give(game, 'p2', 'Reverse') });
    game.play('p2', [game.player('p2').hand[0]!.id], 'Ace');
    expect(game.currentId).toBe('p0');
  });

  it('вдвоём Разворот не тратится', () => {
    const game = started(2);
    const id = give(game, 'p0', 'Reverse');
    expect(() => game.useJoker('p0', { jokerId: id })).toThrow(GameError);
    expect(game.player('p0').jokers.some((j) => j.id === id)).toBe(true);
  });

  it('Обменщик после Разворота передаёт руки в обратную сторону', () => {
    const game = started(3);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Reverse') });
    setHand(game, 'p0', ['6'], 500);
    setHand(game, 'p1', ['7'], 600);
    setHand(game, 'p2', ['8'], 700);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Exchanger') });
    expect(game.player('p0').hand[0]!.id).toBe(600);
    expect(game.player('p2').hand[0]!.id).toBe(500);
  });

  it('Обменщик не передаёт руку игроку, который только что выложил все карты', () => {
    const game = started(3);
    setHand(game, 'p0', ['6'], 500);
    setHand(game, 'p1', ['7', '7'], 600);
    setHand(game, 'p2', ['8', '8'], 700);
    game.play('p0', [500], 'Ace');
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Exchanger') });
    expect(game.player('p0').hand).toHaveLength(0);
    expect(game.player('p1').hand[0]!.id).toBe(700);
    expect(game.player('p2').hand[0]!.id).toBe(600);
  });

  it('Разворот нельзя применить, если карты остались только у двоих', () => {
    const game = started(3);
    setHand(game, 'p0', ['6'], 500);
    game.play('p0', [500], 'Ace');
    expect(() => game.useJoker('p1', { jokerId: give(game, 'p1', 'Reverse') })).toThrow(GameError);
  });

  it('Шпион показывает 2 карты одного соперника только применившему', () => {
    const game = started(3);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Spy') });
    const spied = game.viewFor('p0').spied!;
    expect(spied.ownerId).not.toBe('p0');
    expect(spied.ownerName).toBe(game.player(spied.ownerId).name);
    expect(spied.cards).toHaveLength(2);
    const hand = game.player(spied.ownerId).hand;
    expect(spied.cards.every((card) => hand.includes(card))).toBe(true);
    expect(game.viewFor('p1').spied).toBeNull();
    game.play('p0', [game.player('p0').hand[0]!.id], 'Ace');
    expect(game.viewFor('p0').spied).toBeNull();
  });
});

describe('витрина и монеты', () => {
  const playOne = (game: AmballGame, id: string): void =>
    game.play(id, [game.player(id).hand[0]!.id], 'Ace');

  function openShop(players = 2): AmballGame {
    const game = rawGame(players);
    for (let i = 0; i < players; i++) playOne(game, `p${i}`);
    expect(game.phase).toBe('shop');
    return game;
  }

  it('открывается всем через N ходов и останавливает игру', () => {
    const game = rawGame(3);
    playOne(game, 'p0');
    playOne(game, 'p1');
    expect(game.phase).toBe('playing');
    playOne(game, 'p2');
    expect(game.phase).toBe('shop');
    expect(() => playOne(game, 'p0')).toThrow(GameError);
    expect(game.viewFor('p2').shop!.offers).toHaveLength(3);
    const names = game.viewFor('p0').shop!.offers.map((o) => o!.name);
    expect(new Set(names).size).toBe(3);
  });

  it('закрывается, когда готовы все, и ход не теряется', () => {
    const game = openShop();
    game.shopReady('p0');
    expect(game.phase).toBe('shop');
    game.shopReady('p1');
    expect(game.phase).toBe('playing');
    expect(game.currentId).toBe('p0');
  });

  it('покупка списывает цену, а монет и места должно хватать', () => {
    const game = openShop();
    const player = game.player('p0');
    player.coins = 100;
    const cost = game.viewFor('p0').shop!.offers[0]!.cost;
    game.shopBuy('p0', 0);
    expect(player.coins).toBe(100 - cost);
    expect(player.jokers).toHaveLength(1);
    expect(game.viewFor('p0').shop!.offers[0]).toBeNull();
    expect(() => game.shopBuy('p0', 0)).toThrow(GameError);
    player.coins = 0;
    expect(() => game.shopBuy('p0', 1)).toThrow(GameError);
    player.coins = 100;
    for (let i = 0; i < 5; i++) player.jokers.push({ id: 900 + i, name: 'Scout' });
    expect(() => game.shopBuy('p0', 1)).toThrow(GameError);
  });

  it('один реролл на партию бесплатный, следующие платные', () => {
    const game = openShop();
    const player = game.player('p0');
    player.coins = 3;
    expect(game.viewFor('p0').shop!.rerollCost).toBe(0);
    game.shopReroll('p0', 0);
    expect(player.coins).toBe(3);
    expect(game.viewFor('p0').shop!.rerollCost).toBe(REROLL_COST);
    game.shopReroll('p0', 1);
    expect(player.coins).toBe(3 - REROLL_COST);
    expect(() => game.shopReroll('p0', 2)).toThrow(GameError);
    const names = game.viewFor('p0').shop!.offers.map((o) => o!.name);
    expect(new Set(names).size).toBe(3);
  });

  it('игрок без карт не участвует в витрине и не входит в N', () => {
    const game = rawGame(3);
    setHand(game, 'p0', ['6'], 500);
    game.play('p0', [500], 'Ace');
    playOne(game, 'p1');
    expect(game.phase).toBe('shop');
    expect(game.viewFor('p0').shop).toBeNull();
    expect(game.viewFor('p1').shop!.total).toBe(2);
  });

  it('выход последнего неготового закрывает витрину', () => {
    const game = openShop(3);
    game.shopReady('p0');
    game.shopReady('p1');
    game.removePlayer('p2');
    expect(game.phase).toBe('playing');
    expect(game.currentId).toBe('p0');
  });

  it('новый раунд приносит монеты, и доход растёт', () => {
    const game = started();
    expect(game.player('p0').coins).toBe(STARTING_COINS);
    expect(roundIncome(3)).toBeGreaterThan(roundIncome(2));
    playOne(game, 'p0');
    game.check('p1');
    game.resolveReveal();
    expect(game.player('p0').coins).toBe(STARTING_COINS + roundIncome(2));
    expect(game.player('p1').coins).toBe(STARTING_COINS + roundIncome(2));
  });

  it('вдвоём Разворот не предлагается', () => {
    const game = openShop();
    for (let i = 0; i < 40; i++) {
      game.player('p0').coins = 100;
      game.shopReroll('p0', 0);
      expect(game.viewFor('p0').shop!.offers[0]!.name).not.toBe('Reverse');
    }
  });

  it('Песочные часы вдвое сокращают только следующий ход следующего игрока', () => {
    const game = started(3);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Hourglass') });
    expect(game.turnDuration(30000)).toBe(30000);
    playOne(game, 'p0');
    expect(game.turnDuration(30000)).toBe(15000);
    expect(game.turnDuration(30000)).toBe(30000);
  });

  it('истёкший ход кладёт случайную карту объявленного достоинства', () => {
    const game = started();
    playOne(game, 'p0');
    const before = game.player('p1').hand.length;
    game.autoPlay();
    expect(game.player('p1').hand).toHaveLength(before - 1);
    expect(game.tableRank).toBe('Ace');
  });
});

describe('событие джокера', () => {
  it('Текстильщик сообщает применившему исходную карту и копию, остальным нет', () => {
    const game = started();
    setHand(game, 'p0', ['6']);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Textiler'), cardIds: [500] });
    const mine = game.viewFor('p0').jokerEvent!;
    expect(mine).toMatchObject({ name: 'Textiler', origin: 'card', originCardId: 500 });
    expect(mine.newCardIds).toHaveLength(1);
    expect(game.viewFor('p1').jokerEvent).toMatchObject({ originCardId: null, newCardIds: [] });
  });
});

describe('приватность', () => {
  it('вид не содержит чужую руку и закрытые карты стола', () => {
    const game = started();
    const secret = setHand(game, 'p0', ['Ace', '7'])[1]!;
    game.play('p0', [500], 'Ace');
    const json = JSON.stringify(game.viewFor('p1'));
    expect(game.viewFor('p1').hand.map((c) => c.id)).not.toContain(secret.id);
    expect(json).not.toContain(`"id":${secret.id},`);
    expect(json).not.toContain('"id":500,');
    expect(game.viewFor('p1').seats[0]!.cardCount).toBe(1);
  });
});

describe('джокеры', () => {
  function turnWithTable(cards: CardRank[] = ['6', '7', '8']): AmballGame {
    const game = started();
    setHand(game, 'p0', cards);
    game.play(
      'p0',
      cards.map((_, i) => 500 + i),
      'Ace',
    );
    setHand(game, 'p1', ['9', '10', 'Jack', 'Queen'], 600);
    return game;
  }

  it('тратится при успехе и не тратится при отказе', () => {
    const game = started();
    const id = give(game, 'p0', 'Scout');
    const before = game.player('p0').jokers.length;
    expect(() => game.useJoker('p0', { jokerId: id })).toThrow(GameError);
    expect(game.player('p0').jokers).toHaveLength(before);
  });

  it('Джокер превращает карту в объявленное достоинство', () => {
    const game = turnWithTable();
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Joker'), cardIds: [600] });
    expect(game.player('p1').hand[0]!.rank).toBe('Ace');
  });

  it('Текстильщик добавляет копию карты', () => {
    const game = started();
    setHand(game, 'p0', ['6']);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Textiler'), cardIds: [500] });
    expect(game.player('p0').hand.map((c) => c.rank)).toEqual(['6', '6']);
  });

  it('Шулер делает карту стеклянной, и она проходит проверку', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7']);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Cheater'), cardIds: [500] });
    game.play('p0', [500], 'Ace');
    game.check('p1');
    expect(game.reveal!.truthful).toBe(true);
  });

  it('Разведчик показывает карту стола только применившему', () => {
    const game = turnWithTable();
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Scout') });
    expect(game.viewFor('p1').scouted).not.toBeNull();
    expect(game.viewFor('p0').scouted).toBeNull();
  });

  it('Обменщик сдвигает руки по кругу', () => {
    const game = started(3);
    setHand(game, 'p0', ['6'], 500);
    setHand(game, 'p1', ['7'], 600);
    setHand(game, 'p2', ['8'], 700);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Exchanger') });
    expect(game.player('p0').hand[0]!.id).toBe(700);
    expect(game.player('p1').hand[0]!.id).toBe(500);
  });

  it('Налогосборщик уничтожает одну случайную карту своей руки', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7']);
    game.useJoker('p0', { jokerId: give(game, 'p0', 'TaxCollector') });
    expect(game.player('p0').hand).toHaveLength(1);
  });

  it('Налогосборщик нельзя применить к последней карте, и он не тратится', () => {
    const game = started();
    setHand(game, 'p0', ['6']);
    const id = give(game, 'p0', 'TaxCollector');
    expect(() => game.useJoker('p0', { jokerId: id })).toThrow(GameError);
    expect(game.player('p0').hand).toHaveLength(1);
    expect(game.player('p0').jokers.some((j) => j.id === id)).toBe(true);
  });

  it('Обменщик перезапускает отсчёт хода', () => {
    const game = started();
    const before = game.stamp;
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Exchanger') });
    expect(game.stamp).not.toBe(before);
    expect(game.currentId).toBe('p0');
  });

  it('Монохром красит от 1 до 3 выбранных карт', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7', '8', '9']);
    const id = give(game, 'p0', 'Monochrome');
    expect(() => game.useJoker('p0', { jokerId: id, cardIds: [] })).toThrow(GameError);
    expect(() => game.useJoker('p0', { jokerId: id, cardIds: [500, 501, 502, 503] })).toThrow(
      GameError,
    );
    game.useJoker('p0', { jokerId: id, cardIds: [500, 501] });
    expect(game.player('p0').hand.map((c) => c.type)).toEqual([
      'Mono',
      'Mono',
      'Default',
      'Default',
    ]);
  });

  it('Разведчик на монохромной карте забирает весь стол, и это видят все', () => {
    const game = started(3);
    const mono = setHand(game, 'p0', ['6', '7'], 500);
    mono[0]!.type = 'Mono';
    game.play('p0', [500], 'Ace');
    const size = game.player('p1').hand.length;
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Scout') });
    expect(game.player('p1').hand).toHaveLength(size + 1);
    expect(game.tableCards).toHaveLength(0);
    expect(game.tableRank).toBeNull();
    expect(game.currentId).toBe('p1');
    expect(game.viewFor('p1').scouted!.id).toBe(500);
    expect(game.viewFor('p2').scouted).toBeNull();
    expect(game.viewFor('p2').jokerEvent!.trapCount).toBe(1);
    expect(game.viewFor('p1').jokerEvent!.newCardIds).toEqual([500]);
  });

  it('Разведчик на обычной карте ловушку не включает', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7'], 500);
    game.play('p0', [500], 'Ace');
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Scout') });
    expect(game.tableCards).toHaveLength(1);
    expect(game.viewFor('p1').jokerEvent!.trapCount).toBe(0);
  });

  it('Алхимик золотит ровно 2 карты, а каждая на столе приносит 5 монет только хозяину', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7', '8']);
    const id = give(game, 'p0', 'Alchemist');
    expect(() => game.useJoker('p0', { jokerId: id, cardIds: [500] })).toThrow(GameError);
    game.useJoker('p0', { jokerId: id, cardIds: [500, 501] });
    const coins = game.player('p0').coins;
    game.play('p0', [500, 501, 502], 'Ace');
    expect(game.player('p0').coins).toBe(coins + 10);
    expect(game.viewFor('p0').goldPayout!.amount).toBe(10);
    expect(game.viewFor('p1').goldPayout).toBeNull();
  });

  it('Дилер перемешивает стол, сохраняя размеры ходов', () => {
    const game = turnWithTable();
    const before = game.tableCards.map((c) => c.id).sort();
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Dealer') });
    expect(game.tableCards.map((c) => c.id).sort()).toEqual(before);
    expect(game.viewFor('p1').lastTurn!.count).toBe(3);
  });

  it('А я знал... проверяет предпоследний ход', () => {
    const game = started(3);
    setHand(game, 'p0', ['6', '7']);
    setHand(game, 'p1', ['Ace', '8'], 600);
    setHand(game, 'p2', ['9'], 700);
    game.play('p0', [500], 'Ace');
    game.play('p1', [600], 'Ace');
    game.useJoker('p2', { jokerId: give(game, 'p2', 'IKnew') });
    expect(game.reveal).toMatchObject({ ownerId: 'p0', truthful: false, loserId: 'p0' });
  });

  it('Новое дыхание меняет достоинство стола', () => {
    const game = turnWithTable();
    game.useJoker('p1', { jokerId: give(game, 'p1', 'NewBreathe'), rank: 'King' });
    expect(game.tableRank).toBe('King');
    game.play('p1', [600], 'King');
  });

  it('Добавка берёт две карты из колоды', () => {
    const game = started();
    const count = game.player('p0').hand.length;
    game.useJoker('p0', { jokerId: give(game, 'p0', 'Additive') });
    expect(game.player('p0').hand).toHaveLength(count + 2);
  });

  it('Вор берёт две карты со стола и запрещает проверку на этот ход', () => {
    const game = turnWithTable();
    game.useJoker('p1', { jokerId: give(game, 'p1', 'Thief') });
    expect(game.tableCards).toHaveLength(1);
    expect(game.player('p1').hand).toHaveLength(6);
    expect(() => game.check('p1')).toThrow(GameError);
    expect(game.viewFor('p1').canCheck).toBe(false);
  });

  it('Избиратель уничтожает ровно две выбранные карты', () => {
    const game = started();
    setHand(game, 'p0', ['6', '7', '8', '9']);
    const id = give(game, 'p0', 'Elector');
    expect(() => game.useJoker('p0', { jokerId: id, cardIds: [500] })).toThrow(GameError);
    game.useJoker('p0', { jokerId: id, cardIds: [500, 501] });
    expect(game.player('p0').hand).toHaveLength(2);
  });
});

it('случайные партии заканчиваются или идут без ошибок и потерь карт', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const random = seeded(seed);
    const game = new AmballGame('36', random);
    const players = 2 + (seed % 3);
    for (let i = 0; i < players; i++) game.addPlayer(`p${i}`, `P${i}`);
    game.start('p0');
    for (let step = 0; step < 2000 && game.phase !== 'finished'; step++) {
      if (game.phase === 'reveal') {
        game.resolveReveal();
        continue;
      }
      if (game.phase === 'shop') {
        game.closeShop();
        continue;
      }
      const id = game.currentId!;
      const view = game.viewFor(id);
      expect(view.hand.length).toBeGreaterThan(0);
      const liar = random() < 0.4;
      if (view.canCheck && random() < 0.35) {
        game.check(id);
        continue;
      }
      const rank = view.tableRank ?? view.ranks[Math.floor(random() * view.ranks.length)]!;
      const honest = view.hand.filter((card) => card.rank === rank).slice(0, 4);
      const cards =
        !liar && honest.length > 0 ? honest : view.hand.slice(0, 1 + Math.floor(random() * 2));
      game.play(
        id,
        cards.map((card) => card.id),
        rank,
      );
    }
    if (game.phase === 'finished') {
      expect(game.placements.length).toBe(players);
      expect(game.currentId).toBeNull();
    }
  }
});
