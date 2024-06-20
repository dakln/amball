import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";

export class Turn extends Schema {
    @type("string") sessionId: string = ""; // SessionId
    @type("string") fakeCardValue: string = ""
    @type([ Card ]) cards = new ArraySchema<Card>();
}