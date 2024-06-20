import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player, START_CARDS_COUNT } from "./Player";
import { Card, CARD_MAX_INTERVAL, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { GameRoom } from "../GameRoom";
import { Deck } from "./Deck";
import { Table } from "./Table";
import { getNextPlayerNumber, increaseCardDelay } from "./MiscFunctions";
import { CheckingTable } from "./CheckingTable";
import { DELAY_BEFORE_GAME_START, DELAY_BEFORE_NEXT_TURN, DELAY_BEFORE_START_ROUND } from "./Delays";
import { Turn } from "./Turn";
import { DroppedTable } from "./DroppedTable";

const delayBeforeNextRound: number = 1; 

export class GameRoomState extends Schema {
  public room: GameRoom;

  @type("boolean") gameStarted: boolean = false;
  @type(Deck) deck: Deck;
  @type (Table) table = new Table();
  @type(CheckingTable) checkingTable = new CheckingTable();
  @type(DroppedTable) droppedTable = new DroppedTable();
  @type([ Turn ]) turns = new ArraySchema<Turn>();

  @type("string") previousTurnBy: string = ""; // SessionId of player
  @type("string") currentTurnBy: string = ""; // SessionId of player

  @type("number") round: number = 1;

  @type("boolean") isResetingRound: boolean = false;

  @type({ map: Player }) players = new MapSchema<Player>();

  
  constructor(room: GameRoom, deckType: string) {
      super();
      this.deck = new Deck(deckType);
      this.room = room;
      this.checkingTable.setup(this);
      this.table.setup(this);

  }

  startGame() {
    if (!this.gameStarted) {
      const playersArray: Player[] = [];
      this.players.forEach((player) => {
        playersArray.push(player);
      })
      // Deal cards for each player with delay between them
      const interval = 0 / this.room.GAME_SPEED
      let index = 0
      const dealToNextPlayer = () => {
        this.deck.dealCards(playersArray[index], START_CARDS_COUNT);
        index++

        if (index === playersArray.length) setTimeout(() => {
          this.gameStarted = true;
          this.setCurrentTurnBy(1);
        }, interval);
        
        setTimeout(dealToNextPlayer, interval);
      }
      dealToNextPlayer();
    }
  }

  setCurrentTurnBy(input: string, reset?: boolean): void
  setCurrentTurnBy(input: number): void
  setCurrentTurnBy(input: string | number, reset?: boolean) {
    if (typeof input === 'string') {
      this.previousTurnBy = this.currentTurnBy;
      this.currentTurnBy = input;
      if (reset) {
        this.previousTurnBy = input
        this.currentTurnBy = input
      }
    } else if (typeof input === 'number') {
      this.previousTurnBy = this.currentTurnBy;
      if (input !== -1) {
        this.players.forEach((player) => {
          if (player.playerNumber === input) this.currentTurnBy = player.sessionId;
      })
      } else {
        console.log('Unavailable to set turn to player with playerNumber: -1');
      }
    }
    this.room.broadcast('newTurnAvailable', this.currentTurnBy);
  }

  updatePlayerNumbers() {
    let i = 1;
    this.players.forEach(player => {
      player.playerNumber = i;
      i++
    })
  }

  destroyPlayer(sessionId: string) {
    const player = this.players.get(sessionId);
    if (player) this.players.delete(sessionId);
  }

  createPlayer(sessionId: string, options: any, room: GameRoom) {
    const player = new Player(sessionId, options, room);
    this.players.set(sessionId, player);
    
    this.updatePlayerNumbers();

    if (this.players.size === this.room.playersToStart) {
      setTimeout(() => {
        this.startGame();
      }, (DELAY_BEFORE_GAME_START * 1000) / this.room.GAME_SPEED);
    }
  }

  playerTurn(sessionId: string, fakeCardValue: string, cards: ArraySchema<Card>) {
    this.checkingTable.clear();
    const turn = new Turn().assign({
      sessionId: sessionId,
      fakeCardValue: fakeCardValue,
      cards: cards
    })
    if (this.table.fakeCardValue === "") this.table.setFakeCardValue(fakeCardValue);
    this.turns.push(turn); // КАРТЫ НЕ РЕГАЮТСЯ
  }

  endTurn(sessionId: string) {
    let nextTurnPlayerNumber: number;
    const player = this.players.get(sessionId);
    if (player) {
      nextTurnPlayerNumber = getNextPlayerNumber(this.players, player.playerNumber);
      this.setCurrentTurnBy("");
      setTimeout(() => {
        this.setCurrentTurnBy(nextTurnPlayerNumber);
      }, (DELAY_BEFORE_NEXT_TURN * 1000) / this.room.GAME_SPEED)
    }
  }

  endRound() {
    this.isResetingRound = true;
    const loser = this.players.get(this.checkingTable.loser)
    this.table.transferAllCardsToPlayer(loser)
  }

  prepareNextRound() {
    const loser = this.players.get(this.checkingTable.loser)
    const winner = this.players.get(this.checkingTable.winner)

    let nextTurnByPlayerNumber: number;
    if (this.checkingTable.winner === this.checkingTable.lastTurnBy) {
      nextTurnByPlayerNumber = getNextPlayerNumber(this.players, loser.playerNumber);
    } else if (this.checkingTable.winner === this.checkingTable.checker) {
      nextTurnByPlayerNumber = winner.playerNumber;
    }
    let playersWithCards: number = 0;
    this.players.forEach(player => {
      if (player.cards.length > 0) playersWithCards++
    })
    // Check to end game
    setTimeout(() => {
      if (playersWithCards > 1) {
        this.nextRound(nextTurnByPlayerNumber);
      } else if (playersWithCards <= 1) {
        this.endGame();
      }
    }, (DELAY_BEFORE_START_ROUND * 1000) / this.room.GAME_SPEED)
    this.checkingTable.reset();
  }

  nextRound(nextTurnByPlayerNumber: number) {
    //this.room.broadcast("shuffleEnemyCards");
    this.players.forEach(player => {
      if (!player.isLeftFromTable) this.deck.dealCards(player, START_CARDS_COUNT)
    })
    this.room.broadcast("nextRound");
    this.checkingTable.reset();
    this.table.reset();
    this.turns.clear();
    this.round += 1;
    this.setCurrentTurnBy(nextTurnByPlayerNumber);
    this.isResetingRound = false;
  }

  endGame() {
    console.log('Game has ended!');
  }

}

