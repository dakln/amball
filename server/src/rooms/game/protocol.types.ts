import type { CardRank } from '@amball/contracts';

export interface PlayMessage {
  cardIds: number[];
  rank: CardRank;
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
  rank?: CardRank;
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
