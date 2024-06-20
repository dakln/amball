import { MapSchema, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { Player } from "./Player";

export function findCardByName(array: ArraySchema<Card>, name: string) {
    for (var i = 0; i < array.length; i++) {
        if (array[i]["name"] === name) {
            return array[i];
        }
    }
    return null;
}
export function findCardsByNameAndId(array: ArraySchema<Card>, name: string, id: number) {
    for (var i = 0; i < array.length; i++) {
        if (array[i]["name"] === name && array[i]["id"] === Number(id) ) {
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

export function getNextPlayerNumber(players: MapSchema<Player>, currentPlayerNumber: number) {
    const maxPlayers = players.size;

    // Проходим по игрокам начиная с текущего игрока + 1 и до текущего игрока + 4
    for (let i = 1; i <= maxPlayers; i++) {
        // Вычисляем следующий номер игрока циклически
        const nextPlayerNumber = (currentPlayerNumber + i > maxPlayers) ? 1 : currentPlayerNumber + i
        let nextPlayerSessionId;
        players.forEach(player => {
          if (player.playerNumber === nextPlayerNumber) nextPlayerSessionId = player.sessionId;
        })
        const nextPlayer = players.get(nextPlayerSessionId);
        if (nextPlayer && !nextPlayer.isLeftFromTable) {
            return nextPlayer.playerNumber;
        }
    }

    return -1;
  }

export function getCardIndexInArray(cards: ArraySchema<Card>, card: Card) {
    const cardIndex = cards.findIndex(
        c => c.id === card.id && 
        c.name === card.name &&
        c.value === card.value &&
        c.suit === card.suit &&
        c.type === card.type
    )
    return cardIndex;
}

