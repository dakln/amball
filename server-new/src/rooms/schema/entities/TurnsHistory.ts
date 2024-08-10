import { Schema, Context, type, ArraySchema } from "@colyseus/schema";
import { Entity } from "../Entity";
import { Turn } from "./Turn";

export class TurnsHistory extends Entity {
    @type([ Turn ]) turns = new ArraySchema<Turn>();

    add(turn: Turn) {
        this.turns.push(turn);
    }
    getTurnsCount() {
        return this.turns.length;
    }
    getLastTurn() {
        return this.turns[this.turns.length - 1];
    }
    clear() {
        this.turns = new ArraySchema<Turn>();
    }
}