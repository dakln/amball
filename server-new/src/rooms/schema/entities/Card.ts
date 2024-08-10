import { Schema, Context, type } from "@colyseus/schema";
import { Entity } from "../Entity";
import { CardRanks, CardSuits, CardTypes } from "../../../enums/CardEnums";

export class Card extends Entity {
    private static count: number = 0;
    @type("number") readonly id: number;
    @type("string") readonly name: string;
    @type("string") suit: CardSuits;
    @type("string") rank: CardRanks;
    @type("string") type: CardTypes;

    constructor(suit: CardSuits, rank: CardRanks, type: CardTypes) {
        super();
        this.id = Card.count++
        this.suit = suit;
        this.rank = rank;
        this.type = type;
        this.name = `${rank} of ${suit}`;
    }

    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    getSuit() {
        return this.suit.toString();
    }
    getRank() {
        return this.rank.toString();
    }
    getType() {
        return this.type.toString();
    }
    changeSuit(newSuit: CardSuits) {
        this.suit = newSuit;
        return this;        
    }
    changeRank(newRank: CardRanks) {
        this.rank = newRank;
        return this;        
    }
    changeType(newType: CardTypes): Card {
        this.type = newType;
        return this;
    }
}