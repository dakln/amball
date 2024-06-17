import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";

export class Table extends Schema {
    @type("string") lastTurnBy: string = ""; // SessionId
    @type([ Card ]) cards = new ArraySchema<Card>();

    constructor() {
        super();
    }

    clear() {
        this.cards.clear();
    }

    addCard(card: Card, sessionId: string) {
        this.lastTurnBy = sessionId;
        this.cards.push(card);
    }

}