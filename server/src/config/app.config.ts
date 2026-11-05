import { defineRoom, defineServer } from 'colyseus';

import { GameRoom } from '#rooms/game/game.room.ts';

export const server = defineServer({
  rooms: { game: defineRoom(GameRoom) },
});
