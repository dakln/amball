import { Room, Client } from "@colyseus/core";
import { GameRoomState } from "./schema/GameRoomState";

export class GameRoom extends Room<GameRoomState> {

  maxClients = 2;

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

    this.onMessage("checkCheckingTable", (client, message) => {
      this.state.checkCheckingTable(client.sessionId);
    });
  }

  getPlayer(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (player !== null) {
      return player
    } else {
      return null}
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    this.state.createPlayer(client.sessionId, options, this);

    if (this.state.players.size === 2) {
      setTimeout(() => {
        this.state.startGame();
      }, 1000)
    }
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

}
