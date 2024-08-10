import { type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";
import { Entity } from "../Entity";
import { Deck } from "./Deck";
import { Table } from "./Table";


export class Player extends Entity {
    static MAX_HAND_SIZE: number = 9;
    @type("number") id: number = -1;
    @type("string") sessionId: string;
    @type("string") username: string;
    @type([ Card ]) hand = new ArraySchema<Card>();
    @type("boolean") isLeftFromTable = false;

    constructor(sessionId: string, username: string) {
        super();
        this.sessionId = sessionId;
        this.username = username;
    }
    // add card to hand from deck
    draw(deck: Deck, count: number = 1) {
        for (let i = 0; i < count; i++) {
            const card = deck.drawCard();
            if (card !== null) {
                this.hand.push(card);
            }
        }
    }
    takeFromTable(table: Table) {
        const cards = table.takeCards();
        cards.forEach(card => {
            this.hand.push(card);
        })
    }
    playCards(cardIds: number[]): Card[] {
        const playedCards: Card[] = [];
        if (typeof cardIds !== 'undefined' &&cardIds.length > 0) {
            cardIds.forEach(cardId => {
                const index = this.hand.findIndex(card => card.id === cardId);
                if (index !== -1) {
                    const card = this.hand.splice(index, 1)[0];
                    playedCards.push(card);
                }
            })
        }
        return playedCards;
    }
    getHand() {
        return this.hand;
    }

    // FOR DEV ONLY
    test_getRandomCardFromHand() {
        return this.hand[this.hand.length - 1].id;
    }
}