import { Schema, type } from "@colyseus/schema";

export const CARD_MAX_INTERVAL = 195;
export const CARD_MIN_INTERVAL = 60; // Минимальный интервал в миллисекундах
export const CARD_SPEED_MULTIPLIER = 0.95; // Множитель скорости для увеличения интервала с количеством карт

export class Card extends Schema {
    @type("number") id: number;
    @type("string") name: string;
    @type("string") value: string;
    @type("string") suit: string;
    @type("string") type: string;
    constructor() {
        super();
    }

}