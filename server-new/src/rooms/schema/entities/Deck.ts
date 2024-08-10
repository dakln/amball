import seedrandom from "seedrandom";
import { type, ArraySchema } from "@colyseus/schema";
import { Entity } from "../Entity";
import { Card } from "./Card";
import { CardRanks, CardSuits, CardTypes } from "../../../enums/CardEnums";

export class Deck extends Entity {
    @type([ Card ]) private cards = new ArraySchema<Card>();
    private rng: () => number;
    constructor(seed: string) {
        super();
        this.rng = seedrandom(seed);
        this.initializeDeck();
    }

    private initializeDeck() {
        for (let suit in CardSuits) {
            for (let rank in CardRanks) {
                this.addCard(
                    CardSuits[suit as keyof typeof CardSuits],
                    CardRanks[rank as keyof typeof CardRanks],
                    CardTypes.Default
                )
            }
        }
    }
    drawCard(): Card | null {
        if (this.cards.length > 0) {
            return this.cards.pop();
        } else return null
    }
    addCard(suit: CardSuits, rank: CardRanks, type: CardTypes) {
        const card = new Card(suit, rank, type);
        this.cards.push(card)
    }
    remainingCards() {
        return this.cards.length;
    }
}