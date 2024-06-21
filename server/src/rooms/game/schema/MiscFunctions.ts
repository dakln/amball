import { MapSchema, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { Player } from "./Player";

export function findCardsByNameAndId(array: ArraySchema<Card>, name: string, id: number) {
    for (var i = 0; i < array.length; i++) {
        if (array[i]["name"] === name && array[i]["id"] === Number(id) ) {
            return array[i];
        }
    }
    return null;
}

export function increaseCardDelay(currentInterval: number) {
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

