export type CardSuit = 'Hearts' | 'Clubs' | 'Diamonds' | 'Spades';
export type CardRank =
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

export interface Card {
  id: number;
  suit: CardSuit;
  rank: CardRank;
  type: CardType;
}
