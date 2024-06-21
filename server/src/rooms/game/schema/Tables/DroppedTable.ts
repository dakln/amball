import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "../Card";

export class Drop extends Schema {
    @type("string") sessionId: string;
    @type([ Card ]) cards = new ArraySchema<Card>();

}

export class DroppedTable extends Schema {
    @type([ Drop ]) drops = new ArraySchema<Drop>();

    reset() {
        this.drops.clear();
    }

    addDrop(sessionId: string, cards: ArraySchema) {
        const drop = new Drop().assign({
            sessionId: sessionId,
            cards: cards
        })
        this.drops.push(drop);
    }

}