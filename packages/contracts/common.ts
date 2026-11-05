import type { Card, CardRank } from './card.ts';
import type { JokerCard, JokerEvent, JokerName } from './joker.ts';

export type DeckType = '36' | '52';

/** Откуда прилетают новые карты руки. */
export type CardOrigin = 'card' | 'table' | 'deck' | 'seat';

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
  declared: CardRank;
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
  ranks: CardRank[];
  round: number;
  seats: SeatView[];
  currentId: string | null;
  hand: Card[];
  jokers: JokerCard[];
  deckCount: number;
  tableCount: number;
  tableRank: CardRank | null;
  lastTurn: { playerId: string; rank: CardRank; count: number } | null;
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
