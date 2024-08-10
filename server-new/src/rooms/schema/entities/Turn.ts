import { type, ArraySchema } from "@colyseus/schema";
import { Entity } from "../Entity";
import { CardRanks } from "../../../enums/CardEnums";
import { Card } from "./Card";

export class Turn extends Entity {
    @type("string") sessionId: string;
    @type("string") playingRank: CardRanks;
    @type([ Card ]) cards: Card[];

    constructor(sessionId: string, playingRank: CardRanks, cards: Card[]) {
        super();
        this.sessionId = sessionId;
        this.playingRank = playingRank;
        this.cards = cards;
    }
}