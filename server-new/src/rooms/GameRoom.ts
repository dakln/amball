import { Room, Client } from "@colyseus/core";
import { GameRoomState } from "./schema/GameRoomState";
import { IJoinOptions } from "../interfaces/GameInterfaces";
import { IMakeTurnMessage } from "../interfaces/GameMessages";
import { Player } from "./schema/entities/Player";

export class GameRoom extends Room<GameRoomState> {

  maxClients = 4;

  onCreate (options: {maxPlayers: number}) {
    // {"maxPlayers": 2}
    this.maxClients = Math.min(options.maxPlayers, 4) || 4;
    this.autoDispose = true;

    this.setState(new GameRoomState());

    this.onMessage("makeTurn", (client, message: IMakeTurnMessage) => {

      const player = this.state.players.get(client.sessionId);

      if (this.state.currentTurnPlayerId === player.id) {

        // const playedCards = player.playCards(message.cardIds);
        const playedCards = player.playCards([player.test_getRandomCardFromHand()]); // FOR DEV ONLY

        if (playedCards.length > 0) {

          this.state.addNewTurn(player.sessionId, message.playingRank, playedCards);
          this.clock.setTimeout(() => this.nextTurn(), 1000);

        }
      }
    });

    this.onMessage("checkLastTableCards", (client, message) => {

      const inspectorPlayer = this.state.players.get(client.sessionId);

      const lastTurnPlayer = this.getLastTurnPlayer();

      if (lastTurnPlayer !== null) {

        const isCardsCorrect = this.isLastTableCardsCorrect();

        // Give all cards to checker
        if (isCardsCorrect) {
          inspectorPlayer.takeFromTable(this.state.table);
        } else {
          // Give all cards to owner
          lastTurnPlayer.takeFromTable(this.state.table);
        }

        this.endRound();

      }
    });

    this.onMessage("nextTurn", (client, message) => {
      this.nextTurn();
    });

    console.log('Create room')

    this.clock.setTimeout(() => {
      this.startGame();
    }, 2000)
  }

  onJoin (client: Client, options: IJoinOptions) {
    const player = this.state.addPlayer(client.sessionId, options);
    this.redistributeIds();
  }

  onLeave (client: Client, consented: boolean) {
    const player = this.state.removePlayer(client.sessionId);
    this.redistributeIds();
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private redistributeIds() {
    const sortedPlayers = Array.from(this.state.players.values()).sort((a, b) => a.id - b.id);
    sortedPlayers.forEach((player, index) => {
      player.id = index;
    })
    //console.log('-------')
    //this.state.players.forEach(p => console.log(p.id));
  }
  private startGame() {
    console.log('Starting game...')
    this.state.isGameStarted = true;
    this.state.dealInitialCards();
    this.startRound();
  }
  private startRound() {
    const nextTurnPlayer = this.getNextTurnPlayer();
    if (nextTurnPlayer !== null) {
      this.state.setCurrentTurnPlayerId(nextTurnPlayer.id);
      console.log('Current turn:', this.state.currentTurnPlayerId);
    }
  }
  private endRound() {
    this.state.turnsHistory.clear();
    setTimeout(() => this.nextRound(), 1000)
  }
  private nextRound() {
    this.state.currentRound++;
    this.state.table.clear();
  }
  private nextTurn() {

    const nextTurnPlayer = this.getNextTurnPlayer();

    if (nextTurnPlayer !== null) {

      this.state.setCurrentTurnPlayerId(nextTurnPlayer.id);

      console.log('Next turn:', this.state.currentTurnPlayerId);

    }

  }
  private getNextTurnPlayer(): Player | null {
    // First round
    if (this.state.currentTurnPlayerId === -1) {

      const playerWithIdZero = Array.from(this.state.players.values()).find(player => player.id === 0 && !player.isLeftFromTable);
      return playerWithIdZero || null;
    }

    const playerIds = Array.from(this.state.players.values()).filter(player => !player.isLeftFromTable).map(player => player.id); // Список доступных ID игроков
    const currentIndex = playerIds.indexOf(this.state.currentTurnPlayerId);
    if (currentIndex === -1 || playerIds.length === 0) {
      return null;
    }

    let nextIndex = (currentIndex + 1) % playerIds.length;

    while (playerIds.length > 0) {
      const nextPlayerId = playerIds[nextIndex];
      const nextPlayer = Array.from(this.state.players.values()).find(player => player.id === nextPlayerId);

      if (nextPlayer) {
        return nextPlayer;
      }

      nextIndex = (nextIndex + 1) % playerIds.length;
    }

    return null;

  }
  private isLastTableCardsCorrect() {

    const lastTurn = this.state.turnsHistory.getLastTurn();

    let correctCards = 0;

    lastTurn.cards.forEach(card => {

      if (card.rank === this.state.table.currentRank) {

        correctCards++

      }
    });

    if (correctCards === lastTurn.cards.length) {
      return true;
    } else return false;
  }
  private getLastTurnPlayer(): Player | null {

    const lastTurn = this.state.turnsHistory.getLastTurn();
    const player = this.state.players.get(lastTurn.sessionId);

    if (player) {

      return player;

    } else return null;

  }
}
