import type {
  Card,
  CardType,
  DeckType,
  JokerCard,
  CardOrigin,
  JokerEvent,
  JokerName,
  Phase,
  PlayerView,
  CardRank,
  RevealView,
  ShopView,
  CardSuit,
} from '@amball/contracts';

import type { JokerMessage } from './protocol.types.ts';

const SUITS: CardSuit[] = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];
const RANKS_52: CardRank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'Jack',
  'Queen',
  'King',
  'Ace',
];
const RANKS_36: CardRank[] = RANKS_52.slice(4);

export const HAND_SIZE = 9;
export const MAX_PLAY = 4;
export const DROP_SIZE = 4;
export const MIN_PLAYERS = 2;
export const MAX_JOKERS = 5;
const SPY_CARDS = 2;
const MAX_MONO_CARDS = 3;
const ALCHEMIST_CARDS = 2;
export const GOLD_CARD_COINS = 5;
export const SHOP_OFFERS = 3;
export const STARTING_COINS = 5;
export const REROLL_COST = 2;

/** Цена отражает силу: дороже всего то, что прямо избавляет от карт или ломает чужой блеф. */
export const JOKER_COSTS: Record<JokerName, number> = {
  Additive: 2,
  Thief: 3,
  Scout: 3,
  Reverse: 3,
  Textiler: 3,
  Spy: 4,
  Hourglass: 4,
  Monochrome: 4,
  Alchemist: 6,
  TaxCollector: 4,
  Joker: 5,
  Cheater: 5,
  Dealer: 5,
  Exchanger: 6,
  NewBreathe: 6,
  IKnew: 6,
  Elector: 12,
};

/** Доход растёт с каждым раундом: второй раунд даёт 4 монеты, третий 5 и так далее. */
export function roundIncome(round: number): number {
  return 2 + round;
}
const LOG_SIZE = 6;

const JOKER_NAMES: JokerName[] = [
  'Joker',
  'Textiler',
  'Cheater',
  'Scout',
  'Exchanger',
  'TaxCollector',
  'Dealer',
  'IKnew',
  'NewBreathe',
  'Additive',
  'Thief',
  'Elector',
  'Reverse',
  'Spy',
  'Hourglass',
  'Monochrome',
  'Alchemist',
];

const JOKER_TITLES: Record<JokerName, string> = {
  Joker: 'Джокер',
  Textiler: 'Текстильщик',
  Cheater: 'Шулер',
  Scout: 'Разведчик',
  Exchanger: 'Обменщик',
  TaxCollector: 'Налогосборщик',
  Dealer: 'Дилер',
  IKnew: 'А я знал...',
  NewBreathe: 'Новое дыхание',
  Additive: 'Добавка',
  Thief: 'Вор',
  Elector: 'Избиратель',
  Reverse: 'Разворот',
  Spy: 'Шпион',
  Hourglass: 'Песочные часы',
  Monochrome: 'Монохром',
  Alchemist: 'Алхимик',
};

export class GameError extends Error {}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  jokers: JokerCard[];
  isOut: boolean;
  left: boolean;
  coins: number;
  freeRerollUsed: boolean;
}

interface Turn {
  playerId: string;
  rank: CardRank;
  cards: Card[];
}

export class AmballGame {
  public phase: Phase = 'lobby';
  public round = 1;
  public currentId: string | null = null;
  public hostId: string | null = null;
  public tableRank: CardRank | null = null;
  public reveal: RevealView | null = null;
  public placements: string[] = [];
  /** Меняется с каждым новым ходом и витриной: по нему комната перезапускает отсчёт. */
  public stamp = 0;
  /** Время окончания отсчёта; его ставит комната. */
  public deadlineAt: number | null = null;

  private players: Player[] = [];
  private deck: Card[] = [];
  private turns: Turn[] = [];
  private log: string[] = [];
  private scouted = new Map<string, Card>();
  private spied = new Map<string, { ownerId: string; cards: Card[] }>();
  private checkBlocked = false;
  private nextCardId = 0;
  private nextJokerId = 0;
  private playsMade = 0;
  private hurriedId: string | null = null;
  private jokerBag: JokerName[] = [];
  private direction: 1 | -1 = 1;
  private fxSeq = 0;
  private jokerEvent: (JokerEvent & { newByPlayer: Map<string, number[]> }) | null = null;
  private shop: Map<string, { offers: (JokerName | null)[]; ready: boolean }> | null = null;
  private fxOrigin: CardOrigin = 'deck';
  private fxOriginCardId: number | null = null;
  private fxNew = new Map<string, number[]>();
  private fxTrap = 0;
  private goldPayouts = new Map<string, { seq: number; amount: number }>();

  constructor(
    public readonly deckType: DeckType = '36',
    private readonly random: () => number = Math.random,
  ) {}

  public get ranks(): CardRank[] {
    return this.deckType === '52' ? RANKS_52 : RANKS_36;
  }

  public get tableCards(): Card[] {
    return this.turns.flatMap((turn) => turn.cards);
  }

  public get deckCount(): number {
    return this.deck.length;
  }

  public player(id: string): Player {
    const player = this.players.find((p) => p.id === id);
    if (player === undefined) throw new GameError('Игрок не найден');
    return player;
  }

  public addPlayer(id: string, name: string): void {
    if (this.phase !== 'lobby') throw new GameError('Игра уже идёт');
    this.players.push({
      id,
      name,
      hand: [],
      jokers: [],
      isOut: false,
      left: false,
      coins: 0,
      freeRerollUsed: false,
    });
    this.hostId ??= id;
  }

  public removePlayer(id: string): void {
    if (this.phase === 'lobby') {
      this.players = this.players.filter((p) => p.id !== id);
      if (this.hostId === id) this.hostId = this.players[0]?.id ?? null;
      return;
    }
    const player = this.player(id);
    player.left = true;
    player.hand = [];
    player.jokers = [];
    this.scouted.delete(id);
    this.spied.delete(id);
    if (this.hostId === id) this.hostId = this.players.find((p) => !p.left)?.id ?? null;
    this.addLog(`${player.name} вышел из игры`);
    if (this.phase !== 'playing' && this.phase !== 'shop') return;

    if (this.withCards().length <= 1) {
      this.turns = [];
      this.finish();
      return;
    }
    if (this.currentId === id) this.advanceTurn(id);
    this.shop?.delete(id);
    this.closeShopIfDone();
  }

  public start(byId: string): void {
    if (this.phase !== 'lobby') throw new GameError('Игра уже идёт');
    if (byId !== this.hostId) throw new GameError('Начать игру может только создатель');
    if (this.players.length < MIN_PLAYERS) throw new GameError('Нужно минимум два игрока');

    this.deck = this.shuffle(
      SUITS.flatMap((suit) => this.ranks.map((rank) => this.createCard(suit, rank, 'Default'))),
    );
    for (const player of this.players) this.draw(player, HAND_SIZE);
    for (const player of this.players) {
      player.coins = STARTING_COINS;
      player.freeRerollUsed = false;
    }
    this.stamp += 1;
    this.phase = 'playing';
    this.currentId = this.players[0]!.id;
    this.addLog('Игра началась');
  }

  /** Новая партия тем же составом: вернуться в лобби можно только из конца игры. */
  public rematch(byId: string): void {
    if (this.phase !== 'finished') throw new GameError('Игра ещё не закончена');
    if (byId !== this.hostId) throw new GameError('Начать заново может только создатель');
    this.players = this.players
      .filter((p) => !p.left)
      .map((p) => ({ ...p, hand: [], jokers: [], isOut: false }));
    this.phase = 'lobby';
    this.round = 1;
    this.currentId = null;
    this.tableRank = null;
    this.reveal = null;
    this.placements = [];
    this.turns = [];
    this.deck = [];
    this.log = [];
    this.scouted.clear();
    this.spied.clear();
    this.checkBlocked = false;
    this.playsMade = 0;
    this.jokerBag = [];
    this.goldPayouts.clear();
    this.hurriedId = null;
    this.direction = 1;
    this.jokerEvent = null;
    this.start(byId);
  }

  public play(id: string, cardIds: number[], rank: CardRank): void {
    const player = this.requireTurn(id);
    if (cardIds.length < 1) throw new GameError('Выберите карты');
    // Больше обычного предела можно только картами одного настоящего достоинства.
    if (
      cardIds.length > MAX_PLAY &&
      new Set(this.findInHand(player, cardIds).map((c) => c.rank)).size !== 1
    ) {
      throw new GameError(`Больше ${MAX_PLAY} карт можно положить только одного достоинства`);
    }
    if (!this.ranks.includes(rank)) throw new GameError('Такого достоинства нет в колоде');
    if (this.tableRank !== null && this.tableRank !== rank) {
      throw new GameError('Достоинство уже объявлено');
    }
    const cards = this.takeFromHand(player, cardIds);
    this.tableRank = rank;
    this.turns.push({ playerId: id, rank, cards });
    this.addLog(`${player.name}: ${cards.length} × ${rank}`);
    const gold = cards.filter((card) => card.type === 'Gold').length;
    if (gold > 0) {
      player.coins += gold * GOLD_CARD_COINS;
      this.goldPayouts.set(id, { seq: ++this.fxSeq, amount: gold * GOLD_CARD_COINS });
    }
    // Витрина открывается раз в круг: каждые N ходов, где N — игроков с картами.
    this.playsMade += 1;
    const shopDue = this.playsMade >= this.withCards().length;
    this.advanceTurn(id);
    if (shopDue) {
      this.playsMade = 0;
      if (this.phase === 'playing') this.openShop();
    }
  }

  public check(id: string): void {
    const player = this.requireTurn(id);
    if (this.checkBlocked) throw new GameError('После «Вора» проверять нельзя до конца хода');
    const turn = this.turns.at(-1);
    if (turn === undefined || turn.playerId === id) throw new GameError('Проверять нечего');
    this.startReveal(player, turn);
  }

  public drop(id: string, cardIds: number[]): void {
    const player = this.requireTurn(id);
    if (cardIds.length !== DROP_SIZE)
      throw new GameError(`Сбросить можно ровно ${DROP_SIZE} карты`);
    const selected = this.findInHand(player, cardIds);
    if (new Set(selected.map((card) => card.rank)).size !== 1) {
      throw new GameError('Карты должны быть одного достоинства');
    }
    this.takeFromHand(player, cardIds);
    this.addLog(`${player.name} сбрасывает четыре ${selected[0]!.rank}`);
    if (player.hand.length === 0) this.advanceTurn(id);
  }

  public useJoker(id: string, { jokerId, cardIds = [], rank }: JokerMessage): void {
    const player = this.requireTurn(id);
    const joker = player.jokers.find((j) => j.id === jokerId);
    if (joker === undefined) throw new GameError('У вас нет такого джокера');

    // Эффект бросает до снятия джокера: отказ его не тратит.
    this.fxOrigin = 'deck';
    this.fxOriginCardId = null;
    this.fxNew = new Map();
    this.fxTrap = 0;
    this.applyJoker(player, joker.name, cardIds, rank);
    this.jokerEvent = {
      seq: ++this.fxSeq,
      name: joker.name,
      playerId: id,
      origin: this.fxOrigin,
      originCardId: this.fxOriginCardId,
      newCardIds: [],
      trapCount: this.fxTrap,
      newByPlayer: this.fxNew,
    };
    player.jokers = player.jokers.filter((j) => j.id !== jokerId);
    this.addLog(`${player.name} применяет «${JOKER_TITLES[joker.name]}»`);

    // Выбранный джокером ход уже идёт проверкой, а пустая рука ходить не может.
    if (this.phase === 'playing' && this.player(id).hand.length === 0 && this.currentId === id) {
      this.advanceTurn(id);
    }
  }

  /** Вскрытие уже показано игрокам: стол достаётся проигравшему, начинается новый раунд. */
  public resolveReveal(): void {
    const reveal = this.reveal;
    if (reveal === null) throw new GameError('Вскрытия нет');
    const table = this.tableCards;
    const loser = reveal.loserId === null ? undefined : this.player(reveal.loserId);
    if (loser !== undefined) {
      loser.hand.push(...table);
      this.addLog(`${loser.name} забирает стол: ${table.length}`);
    }
    this.reveal = null;
    this.phase = 'playing';
    const starter = reveal.truthful ? this.nextAfter(reveal.inspectorId) : reveal.inspectorId;
    this.nextRound(starter);
  }

  /** Время хода вышло: игра кладёт случайную карту, чтобы стол не простаивал. */
  public autoPlay(): void {
    const id = this.currentId;
    if (id === null || this.phase !== 'playing') return;
    const player = this.player(id);
    if (player.hand.length === 0) {
      this.advanceTurn(id);
      return;
    }
    this.addLog(`${player.name} не успел: случайная карта`);
    const card = this.pick(player.hand);
    this.play(id, [card.id], this.tableRank ?? card.rank);
  }

  /** Длительность начавшегося хода: «Песочные часы» срабатывают на нём один раз. */
  public turnDuration(baseMs: number): number {
    if (this.currentId !== this.hurriedId) return baseMs;
    this.hurriedId = null;
    return baseMs / 2;
  }

  public shopBuy(id: string, slot: number): void {
    const { player, entry, offer } = this.requireOffer(id, slot);
    if (player.jokers.length >= MAX_JOKERS)
      throw new GameError(`Больше ${MAX_JOKERS} джокеров держать нельзя`);
    if (player.coins < JOKER_COSTS[offer]) throw new GameError('Не хватает монет');
    player.coins -= JOKER_COSTS[offer];
    player.jokers.push({ id: this.nextJokerId++, name: offer });
    entry.offers[slot] = null;
  }

  public shopReroll(id: string, slot: number): void {
    const { player, entry } = this.requireOffer(id, slot);
    if (player.freeRerollUsed) {
      if (player.coins < REROLL_COST) throw new GameError('Не хватает монет');
      player.coins -= REROLL_COST;
    }
    player.freeRerollUsed = true;
    entry.offers[slot] = this.drawJoker(player, entry.offers);
  }

  public shopReady(id: string): void {
    const entry = this.shop?.get(id);
    if (this.phase !== 'shop' || entry === undefined) throw new GameError('Витрина закрыта');
    entry.ready = true;
    this.closeShopIfDone();
  }

  public closeShop(): void {
    if (this.phase !== 'shop') return;
    this.shop = null;
    this.phase = 'playing';
    this.stamp += 1;
  }

  public viewFor(id: string): PlayerView {
    const you = this.players.find((p) => p.id === id);
    const isCurrent = this.phase === 'playing' && this.currentId === id;
    const last = this.turns.at(-1);
    const previous = this.turns.at(-2);
    return {
      phase: this.phase,
      direction: this.direction,
      youId: id,
      hostId: this.hostId,
      deckType: this.deckType,
      ranks: this.ranks,
      round: this.round,
      seats: this.players
        .filter((p) => !p.left)
        .map((p) => ({
          id: p.id,
          name: p.name,
          cardCount: p.hand.length,
          jokerCount: p.jokers.length,
          isOut: p.isOut,
        })),
      currentId: this.currentId,
      hand: you?.hand ?? [],
      jokers: you?.jokers ?? [],
      deckCount: this.deck.length,
      tableCount: this.tableCards.length,
      tableRank: this.tableRank,
      lastTurn:
        last === undefined
          ? null
          : { playerId: last.playerId, rank: last.rank, count: last.cards.length },
      canCheck: isCurrent && !this.checkBlocked && last !== undefined && last.playerId !== id,
      canCheckPrevious: isCurrent && previous !== undefined && previous.playerId !== id,
      reveal: this.reveal,
      scouted: this.scouted.get(id) ?? null,
      spied: this.spiedFor(id),
      jokerEvent: this.eventFor(id),
      coins: you?.coins ?? 0,
      goldPayout: this.goldPayouts.get(id) ?? null,
      shop: you === undefined ? null : this.shopFor(you),
      secondsLeft:
        this.deadlineAt === null
          ? null
          : Math.max(0, Math.ceil((this.deadlineAt - Date.now()) / 1000)),
      placements: this.placements,
      log: this.log,
    };
  }

  private spiedFor(id: string): PlayerView['spied'] {
    const spied = this.spied.get(id);
    return spied === undefined ? null : { ...spied, ownerName: this.player(spied.ownerId).name };
  }

  private eventFor(id: string): JokerEvent | null {
    if (this.jokerEvent === null) return null;
    const { newByPlayer, ...event } = this.jokerEvent;
    return {
      ...event,
      originCardId: event.playerId === id ? event.originCardId : null,
      newCardIds: newByPlayer.get(id) ?? [],
    };
  }

  /** Вдвоём «Разворот» ничего не меняет, поэтому такой джокер не выпадает. */
  private jokerPool(): JokerName[] {
    return this.withCards().length < 3
      ? JOKER_NAMES.filter((name) => name !== 'Reverse')
      : JOKER_NAMES;
  }

  /** Мешок: пока не вышли все виды, повторов нет; не дублирует витрину и руку игрока. */
  private drawJoker(player: Player, shown: (JokerName | null)[] = []): JokerName {
    const pool = this.jokerPool();
    const fresh = (name: JokerName): boolean =>
      pool.includes(name) && !shown.includes(name) && !player.jokers.some((j) => j.name === name);
    if (!this.jokerBag.some(fresh)) this.jokerBag.push(...this.shuffle(JOKER_NAMES));
    const name = this.jokerBag.find(fresh)!;
    this.jokerBag.splice(this.jokerBag.indexOf(name), 1);
    return name;
  }

  private openShop(): void {
    const entries = this.withCards().map((player) => {
      const offers: (JokerName | null)[] = [];
      for (let i = 0; i < SHOP_OFFERS; i++) offers.push(this.drawJoker(player, offers));
      return [player.id, { offers, ready: false }] as const;
    });
    this.shop = new Map(entries);
    this.phase = 'shop';
    this.stamp += 1;
    this.addLog('Открыта витрина джокеров');
  }

  private closeShopIfDone(): void {
    if (this.shop !== null && [...this.shop.values()].every((entry) => entry.ready))
      this.closeShop();
  }

  private shopFor(player: Player): ShopView | null {
    const entry = this.shop?.get(player.id);
    if (this.shop == null || entry === undefined) return null;
    return {
      offers: entry.offers.map((name) =>
        name === null ? null : { name, cost: JOKER_COSTS[name] },
      ),
      rerollCost: player.freeRerollUsed ? REROLL_COST : 0,
      ready: entry.ready,
      readyCount: [...this.shop.values()].filter((e) => e.ready).length,
      total: this.shop.size,
    };
  }

  private requireOffer(
    id: string,
    slot: number,
  ): {
    player: Player;
    entry: { offers: (JokerName | null)[]; ready: boolean };
    offer: JokerName;
  } {
    const entry = this.shop?.get(id);
    if (this.phase !== 'shop' || entry === undefined) throw new GameError('Витрина закрыта');
    if (entry.ready) throw new GameError('Вы уже закончили покупки');
    const offer = entry.offers[slot];
    if (offer == null) throw new GameError('Этого джокера уже нет');
    return { player: this.player(id), entry, offer };
  }

  private applyJoker(player: Player, name: JokerName, cardIds: number[], rank?: CardRank): void {
    const table = this.tableCards;
    switch (name) {
      case 'Joker': {
        if (this.tableRank === null) throw new GameError('Достоинство ещё не объявлено');
        this.oneCard(player, cardIds).rank = this.tableRank;
        return;
      }
      case 'Textiler': {
        const card = this.oneCard(player, cardIds);
        const copy = this.createCard(card.suit, card.rank, card.type);
        player.hand.push(copy);
        this.fxOrigin = 'card';
        this.fxOriginCardId = card.id;
        this.fxNew.set(player.id, [copy.id]);
        return;
      }
      case 'Cheater': {
        this.oneCard(player, cardIds).type = 'Glass';
        return;
      }
      case 'Scout': {
        if (table.length < 1) throw new GameError('На столе нет карт');
        const seen = this.pick(table);
        this.scouted.set(player.id, seen);
        if (seen.type === 'Mono') {
          // Ловушка: увидевший монохромную карту забирает весь стол, ход остаётся у него.
          player.hand.push(...table);
          this.turns = [];
          this.tableRank = null;
          this.fxOrigin = 'table';
          this.fxNew.set(
            player.id,
            table.map((card) => card.id),
          );
          this.fxTrap = table.length;
          this.addLog(`${player.name} попал в ловушку и забирает стол: ${table.length}`);
        }
        return;
      }
      case 'Exchanger': {
        // Руки идут туда же, куда и ход.
        const seated = this.withCards();
        if (this.direction === -1) seated.reverse();
        const hands = seated.map((p) => p.hand);
        this.fxOrigin = 'seat';
        // Рука новая: отсчёт хода начинается заново.
        this.stamp += 1;
        seated.forEach((p, index) => {
          p.hand = hands[(index + hands.length - 1) % hands.length]!;
          this.fxNew.set(
            p.id,
            p.hand.map((card) => card.id),
          );
        });
        return;
      }
      case 'TaxCollector': {
        if (player.hand.length < 2)
          throw new GameError('Налогосборщик не забирает последнюю карту');
        const card = this.pick(player.hand);
        player.hand = player.hand.filter((c) => c !== card);
        return;
      }
      case 'Dealer': {
        if (table.length < 3) throw new GameError('Нужно минимум 3 карты на столе');
        const shuffled = this.shuffle(table);
        // Размеры ходов сохраняются: проверка вскроет столько же карт, но уже других.
        for (const turn of this.turns) turn.cards = shuffled.splice(0, turn.cards.length);
        return;
      }
      case 'IKnew': {
        const previous = this.turns.at(-2);
        if (previous === undefined || previous.playerId === player.id) {
          throw new GameError('Нужен предыдущий ход другого игрока');
        }
        this.startReveal(player, previous);
        return;
      }
      case 'NewBreathe': {
        if (table.length < 1) throw new GameError('На столе нет карт');
        if (rank === undefined || !this.ranks.includes(rank)) {
          throw new GameError('Выберите достоинство');
        }
        this.tableRank = rank;
        return;
      }
      case 'Additive': {
        if (this.deck.length < 2) throw new GameError('В колоде меньше 2 карт');
        this.draw(player, 2);
        return;
      }
      case 'Thief': {
        if (table.length < 2) throw new GameError('На столе меньше 2 карт');
        this.fxOrigin = 'table';
        this.fxNew.set(player.id, []);
        for (let i = 0; i < 2; i++) {
          const card = this.pick(this.tableCards);
          this.fxNew.get(player.id)!.push(card.id);
          for (const turn of this.turns) turn.cards = turn.cards.filter((c) => c !== card);
          player.hand.push(card);
        }
        this.turns = this.turns.filter((turn) => turn.cards.length > 0);
        this.checkBlocked = true;
        return;
      }
      case 'Elector': {
        if (cardIds.length !== 2) throw new GameError('Выберите ровно 2 карты');
        this.takeFromHand(player, cardIds);
        return;
      }
      case 'Spy': {
        const targets = this.withCards().filter((p) => p !== player);
        if (targets.length === 0) throw new GameError('Подсматривать не у кого');
        const target = this.pick(targets);
        this.spied.set(player.id, {
          ownerId: target.id,
          cards: this.shuffle(target.hand).slice(0, SPY_CARDS),
        });
        return;
      }
      case 'Alchemist': {
        if (cardIds.length !== ALCHEMIST_CARDS)
          throw new GameError(`Выберите ровно ${ALCHEMIST_CARDS} карты`);
        for (const card of this.findInHand(player, cardIds)) card.type = 'Gold';
        return;
      }
      case 'Monochrome': {
        if (cardIds.length < 1 || cardIds.length > MAX_MONO_CARDS) {
          throw new GameError(`Выберите от 1 до ${MAX_MONO_CARDS} карт`);
        }
        for (const card of this.findInHand(player, cardIds)) card.type = 'Mono';
        return;
      }
      case 'Hourglass': {
        const next = this.nextAfter(player.id);
        if (next === null || next === player.id) throw new GameError('Некого торопить');
        this.hurriedId = next;
        return;
      }
      case 'Reverse': {
        if (this.withCards().length < 3) {
          throw new GameError('Вдвоём менять направление незачем');
        }
        this.direction = this.direction === 1 ? -1 : 1;
        return;
      }
    }
  }

  private startReveal(inspector: Player, turn: Turn): void {
    // Стеклянная карта на проверке проходит за любое достоинство.
    const truthful = turn.cards.every((card) => card.rank === turn.rank || card.type === 'Glass');
    const owner = this.players.find((p) => p.id === turn.playerId);
    const loserId = truthful ? inspector.id : owner !== undefined && !owner.left ? owner.id : null;
    this.reveal = {
      inspectorId: inspector.id,
      ownerId: turn.playerId,
      declared: turn.rank,
      cards: turn.cards,
      truthful,
      loserId,
    };
    this.phase = 'reveal';
    this.scouted.clear();
    this.spied.clear();
    this.addLog(`${inspector.name} проверяет: ${truthful ? 'правда' : 'блеф'}`);
  }

  private advanceTurn(fromId: string): void {
    this.stamp += 1;
    this.scouted.delete(fromId);
    this.spied.delete(fromId);
    this.checkBlocked = false;
    const next = this.nextAfter(fromId);
    const lastOwner = this.turns.at(-1)?.playerId;

    // Карты остались только у автора последнего хода: проверить его некому, и стол уходит из игры.
    if (next === null || next === lastOwner) {
      if (this.tableCards.length > 0) this.addLog('Проверить некому: стол уходит из игры');
      this.nextRound(next ?? fromId);
      return;
    }
    this.currentId = next;
  }

  private nextRound(starterId: string | null): void {
    this.stamp += 1;
    this.turns = [];
    this.tableRank = null;
    this.scouted.clear();
    this.spied.clear();
    this.checkBlocked = false;
    this.round += 1;

    const seated = this.players.filter((p) => !p.left);
    const from = Math.max(
      0,
      seated.findIndex((p) => p.id === starterId),
    );
    for (let i = 0; i < seated.length; i++) {
      const player = seated[(from + i) % seated.length]!;
      if (!player.isOut) this.draw(player, HAND_SIZE - player.hand.length);
    }
    for (const player of seated) {
      if (!player.isOut && player.hand.length === 0) {
        player.isOut = true;
        this.placements.push(player.id);
        this.addLog(`${player.name} избавился от карт`);
      }
    }
    const income = roundIncome(this.round);
    for (const player of seated) {
      if (!player.isOut) player.coins += income;
    }
    this.addLog(`Раунд ${this.round}: +${income} монет`);
    if (this.withCards().length <= 1) {
      this.finish();
      return;
    }
    const starter = seated.find((p) => p.id === starterId);
    this.currentId =
      starter !== undefined && starter.hand.length > 0
        ? starter.id
        : this.nextAfter(starterId ?? seated[0]!.id);
  }

  private finish(): void {
    this.shop = null;
    this.deadlineAt = null;
    for (const player of this.withCards()) this.placements.push(player.id);
    this.phase = 'finished';
    this.currentId = null;
    const winner = this.placements[0];
    if (winner !== undefined) this.addLog(`Победитель: ${this.player(winner).name}`);
  }

  /** Следующий по кругу игрок с картами; сам `fromId` — последний кандидат. */
  private nextAfter(fromId: string): string | null {
    const seats = this.players;
    const from = seats.findIndex((p) => p.id === fromId);
    for (let step = 1; step <= seats.length; step++) {
      const player =
        seats[(from + step * this.direction + seats.length * seats.length) % seats.length]!;
      if (!player.left && !player.isOut && player.hand.length > 0) return player.id;
    }
    return null;
  }

  private withCards(): Player[] {
    return this.players.filter((p) => !p.left && !p.isOut && p.hand.length > 0);
  }

  private requireTurn(id: string): Player {
    if (this.phase !== 'playing') throw new GameError('Сейчас нельзя ходить');
    if (this.currentId !== id) throw new GameError('Сейчас не ваш ход');
    return this.player(id);
  }

  private oneCard(player: Player, cardIds: number[]): Card {
    if (cardIds.length !== 1) throw new GameError('Выберите одну карту');
    return this.findInHand(player, cardIds)[0]!;
  }

  private findInHand(player: Player, cardIds: number[]): Card[] {
    if (new Set(cardIds).size !== cardIds.length) throw new GameError('Карты повторяются');
    return cardIds.map((id) => {
      const card = player.hand.find((c) => c.id === id);
      if (card === undefined) throw new GameError('Такой карты нет в руке');
      return card;
    });
  }

  private takeFromHand(player: Player, cardIds: number[]): Card[] {
    const cards = this.findInHand(player, cardIds);
    player.hand = player.hand.filter((card) => !cards.includes(card));
    return cards;
  }

  private draw(player: Player, count: number): void {
    for (let i = 0; i < count; i++) {
      const card = this.deck.pop();
      if (card === undefined) return;
      player.hand.push(card);
    }
  }

  private createCard(suit: CardSuit, rank: CardRank, type: CardType): Card {
    return { id: this.nextCardId++, suit, rank, type };
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(this.random() * items.length)]!;
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }

  private addLog(line: string): void {
    this.log = [...this.log, line].slice(-LOG_SIZE);
  }
}
