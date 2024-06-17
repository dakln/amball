import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL } from "./Card";
import { Cards } from "./Cards";
import { Player, START_CARDS_COUNT } from "./Player";
import { increaseCardDelay } from "./MiscFunctions";

export class Deck extends Schema {
    @type([ Card ]) cards = new ArraySchema<Card>();

    constructor() {
        super();
        this.init();
    }

    init() {
        Cards.forEach(options => {
            const card = new Card().assign({
                name: options.name,
                value: options.value,
                suit: options.suit
            })
            this.cards.push(card);
        })
    }

    getCard() {
        if (this.cards.length > 0) {
            let card;
            const randomCardIndex = Math.floor(Math.random() * this.cards.length);
            card = this.cards[randomCardIndex];
            this.cards.splice(randomCardIndex, 1);
            return card;
        } else return null
    }

    dealCards(player: Player, cardsCount: number) {
        if (player) {
            let index = 0;
            let interval = CARD_MAX_INTERVAL;
        
            const dealNextCard = () => {
              if ((index < cardsCount) && (this.cards.length > 0) && player.cards.length < START_CARDS_COUNT) {
                const card = this.getCard();
                player.addCard(card);
                index++;
        
                interval = increaseCardDelay(interval);
                setTimeout(dealNextCard, interval);
              }
        
            }
            dealNextCard();
        }
      }
}