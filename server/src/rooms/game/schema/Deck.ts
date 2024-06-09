import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";
import { Cards } from "./Cards";

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

    getRandomCard() {
        if (this.cards.length > 0) {
            let card;
            const randomCardIndex = Math.floor(Math.random() * this.cards.length);
            card = this.cards[randomCardIndex];
            this.cards.splice(randomCardIndex, 1);
            return card;
        } else return null
    }
}