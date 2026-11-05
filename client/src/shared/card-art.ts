import type { Card, JokerName, Rank, Suit } from '@amball/server';

export const CARD_WIDTH = 71;
export const CARD_HEIGHT = 95;

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

const RANK_COLUMNS: Rank[] = [
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
const SUIT_ROWS: Suit[] = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];

function cell(column: number, row: number): Region {
  return { x: column * CARD_WIDTH, y: row * CARD_HEIGHT, width: CARD_WIDTH, height: CARD_HEIGHT };
}

export const BACK_REGION = cell(0, 0);

export function baseRegion(card: Card): Region {
  if (card.type === 'Glass') return cell(5, 1);
  return card.type === 'Gold' ? cell(6, 0) : cell(1, 0);
}

export function faceRegion(card: Card): Region {
  return cell(RANK_COLUMNS.indexOf(card.rank), SUIT_ROWS.indexOf(card.suit));
}

export function rankOrder(rank: Rank): number {
  return RANK_COLUMNS.indexOf(rank);
}

export const RANK_LABELS: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  Jack: 'В',
  Queen: 'Д',
  King: 'К',
  Ace: 'Т',
};

export const JOKERS: Record<JokerName, { title: string; text: string; art: Region }> = {
  Joker: {
    title: 'Джокер',
    text: 'Выбранная карта становится объявленного достоинства',
    art: cell(0, 0),
  },
  Textiler: {
    title: 'Текстильщик',
    text: 'Добавляет в руку копию выбранной карты',
    art: cell(5, 10),
  },
  Cheater: {
    title: 'Шулер',
    text: 'Выбранная карта становится стеклянной: на проверке она проходит за любое достоинство',
    art: cell(1, 1),
  },
  Scout: { title: 'Разведчик', text: 'Показывает вам случайную карту со стола', art: cell(3, 6) },
  Exchanger: {
    title: 'Обменщик',
    text: 'Все руки сдвигаются по кругу к следующему игроку',
    art: cell(4, 2),
  },
  TaxCollector: {
    title: 'Налогосборщик',
    text: 'Уничтожает случайную карту из вашей руки',
    art: cell(7, 5),
  },
  Dealer: {
    title: 'Дилер',
    text: 'Перемешивает стол (минимум 3 карты): проверка вскроет уже другие карты',
    art: cell(6, 3),
  },
  IKnew: {
    title: 'А я знал...',
    text: 'Проверяет предпоследний ход другого игрока',
    art: cell(0, 4),
  },
  NewBreathe: {
    title: 'Новое дыхание',
    text: 'Меняет достоинство стола на выбранное',
    art: cell(5, 6),
  },
  Additive: { title: 'Добавка', text: 'Берёт 2 карты из колоды', art: cell(7, 6) },
  Thief: {
    title: 'Вор',
    text: 'Забирает 2 случайные карты со стола, но до конца хода проверять нельзя',
    art: cell(1, 10),
  },
  Elector: { title: 'Избиратель', text: 'Уничтожает 2 выбранные карты', art: cell(9, 6) },
  Reverse: { title: 'Разворот', text: 'Меняет направление хода на обратное', art: cell(8, 2) },
  Alchemist: {
    title: 'Алхимик',
    text: '2 выбранные карты становятся золотыми: каждая на столе принесёт 5 монет',
    art: cell(5, 1),
  },
  Monochrome: {
    title: 'Монохром',
    text: 'От 1 до 3 выбранных карт становятся монохромными. Кто увидит такую карту Разведчиком, заберёт весь стол',
    art: cell(3, 1),
  },
  Hourglass: {
    title: 'Песочные часы',
    text: 'Следующий игрок получит вдвое меньше времени на следующий ход',
    art: cell(4, 3),
  },
  Spy: {
    title: 'Шпион',
    text: 'Показывает вам 2 случайные карты случайного соперника',
    art: cell(6, 11),
  },
};
