import { ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";

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