import { Room, Client } from "@colyseus/core";
import { GameRoomState } from "./schema/GameRoomState";

export class GameRoom extends Room<GameRoomState> {
  playersToStart = 4;
  maxClients = 4;

  onCreate (options: any) {
    
    this.autoDispose = true;
    this.patchRate = 1;
    this.setState(new GameRoomState(this));
    
    this.onMessage("selectCard", (client, cardName) => {
      const player = this.state.players.get(client.sessionId)
      player.selectCard(cardName);
    });

    this.onMessage("deselectCard", (client, cardName) => {
      const player = this.state.players.get(client.sessionId)
      player.deselectCard(cardName);
    });

    this.onMessage("playSelectedCards", (client, fakeName) => {
      const player = this.state.players.get(client.sessionId)
      player.playSelectedCards(fakeName);
    });

    this.onMessage("dropSelectedCards", (client, message) => {
      const player = this.state.players.get(client.sessionId)
      player.dropSelectedCards();
    });

    this.onMessage("checkCheckingTable", (client, message) => {
      this.state.checkCheckingTable(client.sessionId);
    });

    // Test messages
    this.onMessage("test_selectRandomCardsAndDrop", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player.cards.length > 0) {
        for (let i = 0; i < 9; i++) {
          player.selectCard(player.cards[i].name);
        }
      }
      player.playSelectedCards('10');
    });
    //this.setSimulationInterval((deltaTime) => this.update(), 16)
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.state.createPlayer(client.sessionId, options, this);

    if (this.state.players.size === this.playersToStart) {
      setTimeout(() => {
        this.state.startGame();
      }, 1000)
    }
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.destroyPlayer(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing..");
  }

  

}
