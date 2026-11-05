import type { CardOrigin } from './common.ts';

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

export interface JokerCard {
  id: number;
  name: JokerName;
}

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
