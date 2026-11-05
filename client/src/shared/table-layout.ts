import type { Card, PlayerView } from '../../../server/src/game/protocol.types.ts';
import type { MatchSnapshot } from './net/match.store.ts';
import { CARD_HEIGHT, CARD_WIDTH, rankOrder } from './card-art.ts';

export const VIEW_WIDTH = 854;
export const VIEW_HEIGHT = 480;

export const TABLE_CENTER = { x: 340, y: 195 };
export const DECK_POSITION = { x: 70, y: 195 };
const SCOUT_POSITION = { x: 480, y: 195 };
const SPY_X = 545;
const SPY_STEP = 60;
const HAND_CENTER_X = 340;
const HAND_Y = 418;
const HAND_WIDTH = 500;
const HAND_SELECTED_LIFT = 22;
const OPPONENT_Y = 62;
const OPPONENT_SCALE = 0.55;
const OPPONENT_WIDTH = 100;
const TABLE_SCALE = 0.75;
/** Больше карт на столе и у соперников не рисуем: число показывает подпись. */
const MAX_DRAWN = 14;
const FAN_ANGLE = 0.022;
const FAN_DROP = 0.5;
const GLOW_SELECTED = 0xf0c040;
const GLOW_TRUTH = 0x50e090;
const GLOW_BLUFF = 0xf05848;

export interface CardSlot {
  key: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  z: number;
  /** null — рубашка. */
  card: Card | null;
  /** Цвет контура; null — без контура. */
  glow: number | null;
}

export function opponentColumn(index: number, count: number): number {
  return 40 + ((index + 0.5) * 600) / count;
}

/** Где на экране сидит игрок. */
export function seatPosition(view: PlayerView, id: string): { x: number; y: number } {
  if (id === view.youId) return { x: HAND_CENTER_X, y: HAND_Y };
  const opponents = view.seats.filter((seat) => seat.id !== view.youId);
  const index = Math.max(0, opponents.findIndex((seat) => seat.id === id));
  return { x: opponentColumn(index, opponents.length), y: OPPONENT_Y };
}

/** Участники обмена по кругу: кто в игре, в порядке мест. */
export function exchangeRing(view: PlayerView): string[] {
  const ring = view.seats.filter((seat) => !seat.isOut && seat.cardCount > 0).map((seat) => seat.id);
  return view.direction === 1 ? ring : ring.reverse();
}

/** Стабильный разброс: карта стола не дёргается при каждом обновлении вида. */
function jitter(seed: number): number {
  return ((seed * 2654435761) % 1000) / 1000 - 0.5;
}

export function sortedHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank) || a.id - b.id);
}

export function layoutTable(snapshot: MatchSnapshot): CardSlot[] {
  const { view, selected } = snapshot;
  if (view === null || view.phase === 'lobby') return [];
  const slots: CardSlot[] = [];

  const hand = sortedHand(view.hand);
  const step = hand.length > 1 ? Math.min(60, HAND_WIDTH / (hand.length - 1)) : 0;
  hand.forEach((card, index) => {
    const fan = index - (hand.length - 1) / 2;
    slots.push({
      key: `hand-${card.id}`,
      x: HAND_CENTER_X + (index - (hand.length - 1) / 2) * step,
      y: HAND_Y + fan * fan * FAN_DROP - (selected.includes(card.id) ? HAND_SELECTED_LIFT : 0),
      scale: 1,
      rotation: fan * FAN_ANGLE,
      z: 100 + index,
      card,
      glow: selected.includes(card.id) ? GLOW_SELECTED : null,
    });
  });

  const opponents = view.seats.filter((seat) => seat.id !== view.youId);
  opponents.forEach((seat, seatIndex) => {
    const center = opponentColumn(seatIndex, opponents.length);
    const drawn = Math.min(seat.cardCount, MAX_DRAWN);
    const spread = drawn > 1 ? Math.min(14, OPPONENT_WIDTH / (drawn - 1)) : 0;
    for (let i = 0; i < drawn; i++) {
      slots.push({
        key: `enemy-${seat.id}-${i}`,
        x: center + (i - (drawn - 1) / 2) * spread,
        y: OPPONENT_Y,
        scale: OPPONENT_SCALE,
        rotation: 0,
        z: 10 + i,
        card: null,
        glow: null,
      });
    }
  });

  if (view.deckCount > 0) {
    for (let i = 0; i < Math.min(view.deckCount, 4); i++) {
      slots.push({
        key: `deck-${i}`,
        x: DECK_POSITION.x - i,
        y: DECK_POSITION.y - i,
        scale: TABLE_SCALE,
        rotation: 0,
        z: 20 + i,
        card: null,
        glow: null,
      });
    }
  }

  const revealed = view.reveal?.cards.length ?? 0;
  const closed = Math.min(view.tableCount - revealed, MAX_DRAWN);
  for (let i = 0; i < closed; i++) {
    slots.push({
      key: `table-${i}`,
      x: TABLE_CENTER.x + jitter(i + 1) * 40,
      y: TABLE_CENTER.y + jitter(i + 7) * 20,
      scale: TABLE_SCALE,
      rotation: jitter(i + 3) * 0.5,
      z: 30 + i,
      card: null,
      glow: null,
    });
  }

  view.reveal?.cards.forEach((card, index) => {
    slots.push({
      key: `reveal-${card.id}`,
      x: TABLE_CENTER.x + (index - (revealed - 1) / 2) * (CARD_WIDTH + 6),
      y: TABLE_CENTER.y,
      scale: 1,
      rotation: 0,
      z: 60 + index,
      card,
      glow: view.reveal!.truthful ? GLOW_TRUTH : GLOW_BLUFF,
    });
  });

  if (view.scouted !== null) {
    // Карту разведки рисует та же система, что и остальные: основа и лицо совпадают.
    slots.push({
      key: `scout-${view.scouted.id}`,
      x: SCOUT_POSITION.x,
      y: SCOUT_POSITION.y,
      scale: TABLE_SCALE,
      rotation: 0,
      z: 80,
      card: view.scouted,
      glow: GLOW_SELECTED,
    });
  }

  view.spied?.cards.forEach((card, index) => {
    slots.push({
      key: `spy-${card.id}`,
      x: SPY_X + index * SPY_STEP,
      y: SCOUT_POSITION.y,
      scale: TABLE_SCALE,
      rotation: 0,
      z: 80 + index,
      card,
      glow: GLOW_SELECTED,
    });
  });

  return slots;
}

/** Верхняя карта своей руки под точкой; руки лежат внахлёст, поэтому обход справа налево. */
export function handCardAt(snapshot: MatchSnapshot, x: number, y: number): number | null {
  const slots = layoutTable(snapshot).filter((slot) => slot.key.startsWith('hand-'));
  for (let i = slots.length - 1; i >= 0; i--) {
    const slot = slots[i]!;
    if (Math.abs(x - slot.x) <= CARD_WIDTH / 2 && Math.abs(y - slot.y) <= CARD_HEIGHT / 2) {
      return slot.card!.id;
    }
  }
  return null;
}
