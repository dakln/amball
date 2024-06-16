import { ArraySchema } from "@colyseus/schema";
import { Card, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";

export function findCardByName(array: ArraySchema<Card>, name: string) {
    for (var i = 0; i < array.length; i++) {
        if (array[i]["name"] === name) {
            return array[i];
        }
    }
    return null;
}

export function findCardByValue(array: ArraySchema<Card>, value: string) {
    for (var i = 0; i < array.length; i++) {
        if (array[i]["value"] === value) {
            return array[i];
        }
    }
    return null;
}


export function increaseCardDelay(currentInterval: number) {
    // Увеличиваем интервал
    let interval = currentInterval * CARD_SPEED_MULTIPLIER
    if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
    //console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
    return interval
}
