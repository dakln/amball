import { Room, Client } from "@colyseus/core";
import { GameRoomState } from "./schema/GameRoomState";
import { Card } from "./schema/Card";
import { DELAY_BEFORE_GAME_START } from "./schema/Delays";

export type CreateRoomOptions = {
  room: GameRoom;
  deckType: string;
}

export class GameRoom extends Room<GameRoomState> {
  GAME_SPEED = 1;
  playersToStart = 1;
  maxClients = 4;

  onCreate (options: any) {
    this.autoDispose = true;
    //this.patchRate = 0.1;
    const CreateRoomOptions: CreateRoomOptions = {
      room: this,
      deckType: (options.deckType !== undefined) ? options.deckType : "36" //"36"
    }
    this.setState(new GameRoomState(CreateRoomOptions));

    this.onMessage("selectCard", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      const card = new Card().assign({
        id: message.id,
        name: message.name,
        value: message.value,
        suit: message.suit,
        type: message.type
      })
      player.selectCard(card);
    });

    this.onMessage("deselectCard", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      const card = new Card().assign({
        id: message.id,
        name: message.name,
        value: message.value,
        suit: message.suit,
        type: message.type
      })
      player.deselectCard(card);
    });

    this.onMessage("playSelectedCards", (client, fakeValue) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.playSelectedCards(fakeValue);
      } 
    });

    this.onMessage("dropSelectedCards", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.dropSelectedCards();
      }
    });

    this.onMessage("checkCheckingTable", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        this.state.checkingTable.checkTable(client.sessionId);
      }
    });

    // Test
    this.onMessage("test_PlayRandomCards", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player.hand.cards.length > 0) {
        player.hand.cards.forEach(card => {
          player.selectCard(card);
        })
        player.playSelectedCards('10');
      }
    });

    this.onMessage("useJoker", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      player.useJoker(message.id, message.name)
    });

  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.state.addPlayer(client.sessionId, options, this);

    // Start game conditions
    if (this.state.players.size === this.playersToStart) {
      setTimeout(() => {
        this.lock();
        this.state.startGame();
      }, (DELAY_BEFORE_GAME_START * 1000) / this.GAME_SPEED);
    }
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.removePlayer(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing..");
  }

  

}
