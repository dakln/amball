import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player, START_CARDS_COUNT } from "./Player";
import { Card, CARD_MAX_INTERVAL, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { GameRoom } from "../GameRoom";
import { Deck } from "./Deck";
import { Table } from "./Table";


export class GameRoomState extends Schema {
  private room: GameRoom;

  @type("boolean") gameStarted: boolean = false;
  @type(Deck) deck = new Deck();
  @type (Table) table = new Table();
  @type(Table) checkingTable = new Table();
  @type(Table) droppedTable = new Table();
  @type(["string"]) droppedCardValues = new ArraySchema<string>();
  @type("string") currentFakeCardName: string = "";

  @type("string") previousTurnBy: string = ""; // SessionId of player
  @type("string") currentTurnBy: string = ""; // SessionId of player

  @type("number") round: number = 1;
  @type("number") turnNumber: number = 1;
  @type("string") roundWinner: string = "" // SessionId

  @type("boolean") isResetingRound: boolean = false;

  @type({ map: Player }) players = new MapSchema<Player>();

  
  constructor(room: GameRoom) {
      super();
      this.room = room;

  }

  startGame() {
    if (!this.gameStarted) {
      this.gameStarted = true;
      const availablePlayers: string[] = [];

      this.players.forEach(player =>  {
        availablePlayers.push(player.sessionId);
        this.dealCardsToPlayer(START_CARDS_COUNT, player.sessionId);
      });

      // const interval = 1500;
      // let index = 0
      // const dealToNextPlayer = () => {
      //   const playerSessionId = availablePlayers[index];
      //   this.dealCardsToPlayer(START_CARDS_COUNT, playerSessionId);
      //   index++

      //   setTimeout(dealToNextPlayer, interval);
      // }

      // dealToNextPlayer();
      
      //this.currentTurnBy = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

      // set turn to 1st player
      this.players.forEach(player => {
          if (player.playerNumber === 1) {
            this.currentTurnBy = player.sessionId;
          }
      })
    }
  }

  updatePlayerNumbers() {
    // renumber all players
    let i = 0;
    this.players.forEach(player => {
      player.playerNumber = i + 1;
      i++
    })
  }

  destroyPlayer(sessionId: string) {
    const player = this.players.get(sessionId);
    if (player !== undefined) this.players.delete(sessionId);
  }

  createPlayer(sessionId: string, options: any, room: GameRoom) {
    const player = new Player(sessionId, options, room);
    this.players.set(sessionId, player);
    
    this.updatePlayerNumbers();
  }

  dealCardsToPlayer(cardsCount: number, sessionId: string) {
    //console.log('Deal cards to', sessionId);
    const player = this.players.get(sessionId);
    let index = 0;
    let interval = CARD_MAX_INTERVAL;

    const dealNextCard = () => {
      if ((index < cardsCount) && (this.deck.cards.length > 0) && player.cards.length < START_CARDS_COUNT) {
        const card = this.deck.getRandomCard();
        player.addCard(card);
        index++;

        interval *= CARD_SPEED_MULTIPLIER;
        if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
        setTimeout(dealNextCard, interval);
      }

    }

    dealNextCard();
  }

  playerTurn(sessionId: string, fakeCardName: string) {
    this.checkingTable.clear();
    this.currentFakeCardName = fakeCardName;
    this.table.lastTurnBy = sessionId;
  }

  checkCheckingTable(sessionId: string) {
    const cardsCount = this.checkingTable.cards.length;
    let index = 0;
    let interval = CARD_MAX_INTERVAL;
    let correctCards = 0;

    const checkNextCard = () => {
        if (index < cardsCount) {
            const card = this.checkingTable.cards[index];

            // Check card
            this.room.broadcast("checkCard", card.name);
            if (card.value === this.currentFakeCardName) correctCards++

            index++;

            if (index === cardsCount) {
              setTimeout(() => {
                if (correctCards === cardsCount) {
                  // All cards were correct
                  // Checker get all of table cards
                  this.transferAllTableCardsToPlayer(sessionId);
                  this.roundWinner = this.checkingTable.lastTurnBy;
                } else {
                  // All or most of all cards were wrong
                  // The player that was checked will get all of table cards
                  this.transferAllTableCardsToPlayer(this.checkingTable.lastTurnBy);
                  this.roundWinner = sessionId;
                }
              }, 2000)
            }

            // Увеличиваем интервал с учетом количества карт
            interval *= CARD_SPEED_MULTIPLIER;
            if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
            //console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
            setTimeout(checkNextCard, interval); // Планируем добавление следующей карты
        }
    }

    checkNextCard(); // Запускаем процесс добавления карт
  }

  transferAllTableCardsToPlayer(sessionId: string) {

    const cardsCount = this.table.cards.length;
    let index = 0;
    let interval = CARD_MAX_INTERVAL;

    const transferNextCard = () => {
        if (index < cardsCount) {
            const player = this.players.get(sessionId);
            const card = this.table.cards[index];
            player.addCard(card);
            index++;

            if (index === cardsCount) {
              setTimeout(() => {
                this.table.clear();
                this.endRound();
              }, 1000)
            }

            // Увеличиваем интервал с учетом количества карт
            interval *= CARD_SPEED_MULTIPLIER;
            if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
            //console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
            setTimeout(transferNextCard, interval); // Планируем добавление следующей карты
        }
    }

    transferNextCard(); // Запускаем процесс добавления карт
  }

  nextTurn() {
    this.previousTurnBy = this.currentTurnBy;
    this.currentTurnBy = "";
    this.turnNumber += 1;
    const previousTurnPlayerNumber = this.players.get(this.previousTurnBy).playerNumber;

    let nextTurnPlayerNumber = previousTurnPlayerNumber + 1
    if (nextTurnPlayerNumber > 4) nextTurnPlayerNumber = 1 

    this.players.forEach(player => {
      if (player.playerNumber === nextTurnPlayerNumber) {
        const nextTurnBy = player.sessionId;
        // Next turn will start after 500 ms.
        setTimeout(() => {
          this.currentTurnBy = nextTurnBy;
        }, 500)
      }
    })
  }

  endRound() {
    //console.log(`Round ${this.round} ended. Winner: ${this.roundWinner}`)
    this.isResetingRound = true;
    this.currentTurnBy = "";
    this.previousTurnBy = "";
    setTimeout(() => {
      // Give cards from deck for each player
      this.players.forEach(player => {
        this.dealCardsToPlayer(9, player.sessionId);
      })
      this.nextRound();
    }, 500)
  }

  nextRound() {

    //this.room.broadcast("shuffleEnemyCards");
    this.room.broadcast("nextRound");
    this.checkingTable.clear();
    this.table.clear();
    this.currentFakeCardName = ""
    this.turnNumber = 1;
    this.round += 1;

    // Wait 1 s. then start new round
    setTimeout(() => {
      
      this.currentTurnBy = this.roundWinner;

      setTimeout(() => {
        this.isResetingRound = false;
      }, 500)
    }, 1500)
  }
  

}

