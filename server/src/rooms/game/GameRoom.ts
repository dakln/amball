import { Room, Client } from "@colyseus/core";
import { GameRoomState } from "./schema/GameRoomState";
import { Card } from "./schema/Card";

export class GameRoom extends Room<GameRoomState> {
  GAME_SPEED = 1;
  playersToStart = 2;
  maxClients = 4;

  onCreate (options: any) {
    this.autoDispose = true;
    //this.patchRate = 0.1;
    this.setState(new GameRoomState(this, "36"));

    this.onMessage("selectCard", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      const json = JSON.parse(message);
      const card = new Card().assign({
        id: json.id,
        name: json.name,
        value: json.value,
        suit: json.suit,
        type: json.type
      })
      player.selectCard(card);
    });

    this.onMessage("deselectCard", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      const json = JSON.parse(message);
      const card = new Card().assign({
        id: json.id,
        name: json.name,
        value: json.value,
        suit: json.suit,
        type: json.type
      })
      player.deselectCard(card);
    });

    this.onMessage("playSelectedCards", (client, fakeValue) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.playCards(fakeValue, player.selectedCards);
        player.selectedCards.clear();
      } 
    });

    this.onMessage("dropSelectedCards", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      if (player) {
        player.dropCards(player.selectedCards);
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
      if (player.cards.length > 0) {
        player.cards.forEach(card => {
          player.selectCard(card);
        })
        player.playCards('10', player.selectedCards);
      }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.state.createPlayer(client.sessionId, options, this);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.destroyPlayer(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing..");
  }

  

}
