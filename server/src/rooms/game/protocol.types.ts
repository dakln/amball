// Общий договор с клиентом: клиент импортирует этот файл только как типы.

export type Suit = 'Hearts' | 'Clubs' | 'Diamonds' | 'Spades';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'Jack'
  | 'Queen'
  | 'King'
  | 'Ace';
export type CardType = 'Default' | 'Glass' | 'Mono' | 'Gold';
export type DeckType = '36' | '52';

export type JokerName =
  | 'Joker'
  | 'Textiler'
  | 'Cheater'
  | 'Scout'
  | 'Exchanger'
  | 'TaxCollector'
  | 'Dealer'
  | 'IKnew'
  | 'NewBreathe'
  | 'Additive'
  | 'Thief'
  | 'Elector'
  | 'Reverse'
  | 'Spy'
  | 'Hourglass'
  | 'Monochrome'
  | 'Alchemist';

export interface Card {
  id: number;
  suit: Suit;
  rank: Rank;
  type: CardType;
}

export interface JokerCard {
  id: number;
  name: JokerName;
}

/** Откуда прилетают новые карты руки. */
export type CardOrigin = 'card' | 'table' | 'deck' | 'seat';

export interface JokerEvent {
  seq: number;
  name: JokerName;
  playerId: string;
  origin: CardOrigin;
  /** Только применившему: карта, рядом с которой появляется копия. */
  originCardId: number | null;
  /** Новые карты руки этого игрока. */
  newCardIds: number[];
  /** Сколько карт стола забрал попавший в монохромную ловушку; 0 — ловушки не было. */
  trapCount: number;
}

export type Phase = 'lobby' | 'playing' | 'reveal' | 'shop' | 'finished';

export interface ShopView {
  /** null — место уже куплено. */
  offers: ({ name: JokerName; cost: number } | null)[];
  /** 0 — бесплатный реролл ещё не потрачен. */
  rerollCost: number;
  ready: boolean;
  readyCount: number;
  total: number;
}

export interface SeatView {
  id: string;
  name: string;
  cardCount: number;
  jokerCount: number;
  isOut: boolean;
}

export interface RevealView {
  inspectorId: string;
  ownerId: string;
  declared: Rank;
  cards: Card[];
  truthful: boolean;
  /** null — владелец карт вышел из комнаты: стол уходит из игры. */
  loserId: string | null;
}

/** Вид игры для одного игрока: чужих рук и закрытых карт стола здесь нет. */
export interface PlayerView {
  /** 1 — ход по порядку мест, -1 — в обратную сторону. */
  direction: 1 | -1;
  phase: Phase;
  youId: string;
  hostId: string | null;
  deckType: DeckType;
  ranks: Rank[];
  round: number;
  seats: SeatView[];
  currentId: string | null;
  hand: Card[];
  jokers: JokerCard[];
  deckCount: number;
  tableCount: number;
  tableRank: Rank | null;
  lastTurn: { playerId: string; rank: Rank; count: number } | null;
  canCheck: boolean;
  canCheckPrevious: boolean;
  reveal: RevealView | null;
  scouted: Card | null;
  /** Карты соперника, которые видит только применивший «Шпиона». */
  spied: { ownerName: string; ownerId: string; cards: Card[] } | null;
  jokerEvent: JokerEvent | null;
  coins: number;
  /** Монеты за золотые карты последнего хода; видит только сам игрок, чтобы не выдать карты. */
  goldPayout: { seq: number; amount: number } | null;
  /** null — у участника витрины нет; такой игрок ждёт остальных. */
  shop: ShopView | null;
  /** Сколько секунд осталось на ход или витрину; null — отсчёта нет. */
  secondsLeft: number | null;
  /** id игроков от первого вышедшего до последнего оставшегося с картами. */
  placements: string[];
  log: string[];
}

export interface PlayMessage {
  cardIds: number[];
  rank: Rank;
}

export interface DropMessage {
  cardIds: number[];
}

export interface ShopSlotMessage {
  slot: number;
}

export interface JokerMessage {
  jokerId: number;
  cardIds?: number[];
  rank?: Rank;
}

export const MessageType = {
  Ready: 'ready',
  Start: 'start',
  Play: 'play',
  Check: 'check',
  Drop: 'drop',
  Joker: 'joker',
  Rematch: 'rematch',
  ShopBuy: 'shopBuy',
  ShopReroll: 'shopReroll',
  ShopReady: 'shopReady',
  View: 'view',
  Refused: 'refused',
} as const;
