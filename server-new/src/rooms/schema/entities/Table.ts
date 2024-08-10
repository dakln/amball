import { ArraySchema, type } from "@colyseus/schema";
import { Entity } from "../Entity";
import { Card } from "./Card";
import { CardRanks } from "../../../enums/CardEnums";

export class Table extends Entity {
    @type("string") currentRank: CardRanks;
    @type([ Card ]) cards = new ArraySchema<Card>();

    clear() {
        this.cards = new ArraySchema<Card>();
    }
    takeCards() {
        const allCards = this.cards.slice();
        this.cards = new ArraySchema<Card>()
        return allCards;
    }
    placeCards(playedCards: Card[]) {
        if (playedCards && playedCards.length > 0) {
            playedCards.forEach(card => {
                this.cards.push(card);
            })
        }
    }
    setCurrentRank(rank: CardRanks) {
        this.currentRank = rank;
    }
}