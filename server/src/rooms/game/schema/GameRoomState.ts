import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { CreatePlayerOptions, Player } from "./Player.js";
import { CreateRoomOptions, GameRoom } from "../GameRoom";
import { Deck } from "./Deck";
import { Table } from "./Tables/Table";
import { createDeck, generateRandomUsername, getNextPlayerNumber } from "./MiscFunctions";
import { CheckingTable } from "./Tables/CheckingTable";
import { DELAY_BEFORE_NEXT_TURN, DELAY_BEFORE_START_ROUND } from "./Delays";
import { Turn } from "./Turn";
import { DropsCollection } from "./Tables/DroppedTable";
import { Card } from "./Card";


export class GameRoomState extends Schema {
  room: GameRoom;
  cards: Card[];
  
  @type("boolean") gameStarted: boolean = false;
  @type(Deck) deck: Deck;

  @type(Table) table: Table;
  @type(CheckingTable) checkingTable: CheckingTable;

  @type(DropsCollection) dropsCollection = new DropsCollection();
  @type([ Turn ]) turns = new ArraySchema<Turn>();

  @type("string") previousTurnBy: string = ""; // SessionId of player
  @type("string") currentTurnBy: string = ""; // SessionId of player

  @type("number") round: number = 1;

  @type("boolean") isResetingRound: boolean = false;

  @type({ map: Player }) players = new MapSchema<Player>();

  
  constructor(options: CreateRoomOptions) {
      super();
      this.room = options.room;
      this.deck = new Deck(options.deckType, this.room, this);
      this.table = new Table(this.room, this);
      this.checkingTable = new CheckingTable(this.room, this);

  }

  startGame() {
    if (!this.gameStarted) {
      const playersArray: Player[] = [];
      this.players.forEach((player) => {
        playersArray.push(player);
      })
      // Deal cards for each player with delay between them
      const interval = 1800 / this.room.GAME_SPEED
      let index = 0
      const dealToNextPlayer = () => {
        this.deck.dealCards(playersArray[index], Player.DEFAULT_HAND_SIZE);
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

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }
  addPlayer(sessionId: string, options: any, room: GameRoom) {
    const createOptions: CreatePlayerOptions = {
      sessionId: sessionId,
      username: (options.username !== undefined) ? options.username : generateRandomUsername(),

      room: room,
      state: this
    }
    const player = new Player(createOptions);
    this.players.set(sessionId, player);
    
    this.updatePlayerNumbers();
  }

  playerTurn(sessionId: string, fakeCardValue: string, cards: ArraySchema) {
    this.table.lastTurnBy = sessionId;
    this.checkingTable.lastTurnBy = sessionId;
    this.checkingTable.fakeCardValue = fakeCardValue;

    this.checkingTable.clearCardCollection();
    const turn = new Turn().assign({
      sessionId: sessionId,
      fakeCardValue: fakeCardValue,
      cards: cards
    })
    if (this.table.fakeCardValue === "") this.table.setFakeCardValue(fakeCardValue);
    this.turns.push(turn);
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
      if (player.hand.cards.length > 0) playersWithCards++
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
      if (!player.isLeftFromTable) this.deck.dealCards(player, Player.DEFAULT_HAND_SIZE)
    })
    this.room.broadcast("nextRound");
    this.checkingTable.reset();
    this.table.reset();
    this.turns = new ArraySchema();
    this.round += 1;
    this.setCurrentTurnBy(nextTurnByPlayerNumber);
    this.isResetingRound = false;
  }

  endGame() {
    console.log('Game has ended!');
  }

}

