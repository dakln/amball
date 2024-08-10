import { Schema, Context, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./entities/Player";
import { Deck } from "./entities/Deck";
import { IJoinOptions } from "../../interfaces/GameInterfaces";
import { CardRanks } from "../../enums/CardEnums";
import { Table } from "./entities/Table";
import { TurnsHistory } from "./entities/TurnsHistory";
import { Turn } from "./entities/Turn";
import { Card } from "./entities/Card";

export class GameRoomState extends Schema {

  @type("boolean") isGameStarted: boolean = false;
  @type("number") currentTurnPlayerId: number = -1;
  @type("number") currentRound: number = 1;
  @type("number") currentTurnNumber: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Deck) deck = new Deck("amball");
  @type(Table) table = new Table();
  @type(TurnsHistory) turnsHistory = new TurnsHistory();

  addPlayer(sessionId: string, options: IJoinOptions) {
    const player = new Player(sessionId, options.username)
    this.players.set(sessionId, player);
    return player;
  }
  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
    //this.redistributeIds();
  }
  getPlayerById(id: number): Player | null {
    this.players.forEach(player => {
      if (player.id === id) {
        return player;
      }
    })
    return null;
  }
  dealInitialCards() {
    this.players.forEach(player => player.draw(this.deck, Player.MAX_HAND_SIZE));
  }
  setCurrentTurnPlayerId(playerId: number) {
    this.currentTurnPlayerId = playerId;
    this.currentTurnNumber++;
  }
  addNewTurn(sessionId: string, playingRank: CardRanks, playedCards: Card[]) {
    if (this.currentTurnNumber === 1) {
      this.table.setCurrentRank(playingRank);
    }
    const turn = new Turn(sessionId, playingRank, playedCards);
    this.turnsHistory.add(turn);
    this.table.placeCards(playedCards);
    console.log('New turn', turn);
  }
  checkTable() {

  }
}