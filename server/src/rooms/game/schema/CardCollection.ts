import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";

export class CardCollection extends Schema {
    @type([ Card ]) cards = new ArraySchema<Card>();

    addCard(card: Card) {
        if (!this.cards.includes(card)) {
            this.cards.push(card);
        }
    }

    removeCard(card: Card) {
        const index = this.cards.findIndex(c => c.id === card.id && c.name === card.name)
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }

    clearCardCollection() {
        this.cards = new ArraySchema<Card>();
    }
}