import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player, START_CARDS_COUNT } from "./Player";
import { CARD_MAX_INTERVAL, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { GameRoom } from "../GameRoom";
import { Deck } from "./Deck";
import { Table } from "./Table";
import { increaseCardDelay } from "./MiscFunctions";


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
  @type("string") roundLoser: string = "" // SessionId

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

      this.players.forEach((player) => {
        availablePlayers.push(player.sessionId);
      })
      //console.log(availablePlayers);
      // Deal cards for each player with delay between them
      let index = 0
      const dealToNextPlayer = () => {
        const playerSessionId = availablePlayers[index];
        this.dealCardsToPlayer(playerSessionId, START_CARDS_COUNT);
        index++

        setTimeout(dealToNextPlayer, 1500);
      }
      dealToNextPlayer();
      
      this.setCurrentTurnBy(1);
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
      this.players.forEach((player) => {
          if (player.playerNumber === input) this.currentTurnBy = player.sessionId;
      })
    }
    this.room.broadcast('setNewTurnBy', this.currentTurnBy);
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
    if (player !== undefined) this.players.delete(sessionId);
  }

  createPlayer(sessionId: string, options: any, room: GameRoom) {
    const player = new Player(sessionId, options, room);
    this.players.set(sessionId, player);
    
    this.updatePlayerNumbers();
  }

  dealCardsToPlayer(sessionId: string, cardsCount: number) {
    const player = this.players.get(sessionId);
    let index = 0;
    let interval = CARD_MAX_INTERVAL;

    const dealNextCard = () => {
      if ((index < cardsCount) && (this.deck.cards.length > 0) && player.cards.length < START_CARDS_COUNT) {
        const card = this.deck.getRandomCard();
        player.addCard(card);
        index++;

        interval = increaseCardDelay(interval);
        setTimeout(dealNextCard, interval);
      }

    }
    dealNextCard();
  }

  playerTurn(sessionId: string, fakeCardName: string) {
    this.checkingTable.clear();
    this.currentFakeCardName = fakeCardName;
  }

  getNextPlayerNumber(currentPlayerNumber: number) {
    const maxPlayers = this.players.size;

    // Проходим по игрокам начиная с текущего игрока + 1 и до текущего игрока + 4
    for (let i = 1; i <= maxPlayers; i++) {
        // Вычисляем следующий номер игрока циклически
        const nextPlayerNumber = (currentPlayerNumber + i > maxPlayers) ? 1 : currentPlayerNumber + i
        let nextPlayerSessionId;
        this.players.forEach(player => {
          if (player.playerNumber === nextPlayerNumber) nextPlayerSessionId = player.sessionId;
        })
        const nextPlayer = this.players.get(nextPlayerSessionId);
        if (nextPlayer && !nextPlayer.isLeftFromTable) {
            return nextPlayer.playerNumber;
        }
    }

    return -1; // Если нет доступных игроков
  }

  checkWinner(checkerPlayerSessionId: string, checkingPlayerSessionId: string, correctCards: number, cardsCount: number) {
    let nextTurnByPlayerNumber: number;
    if (correctCards === cardsCount) {
      // All cards were correct
      // Checker get all of table cards
      this.transferAllTableCardsToPlayer(checkerPlayerSessionId);
      this.roundWinner = checkingPlayerSessionId;
      this.roundLoser = checkerPlayerSessionId;

      const player = this.players.get(checkerPlayerSessionId)
      nextTurnByPlayerNumber = this.getNextPlayerNumber(player.playerNumber);
    } else {
      // All or most of all cards were wrong
      // The player that was checked will get all of table cards
      this.transferAllTableCardsToPlayer(checkingPlayerSessionId);
      this.roundWinner = checkerPlayerSessionId;
      this.roundLoser = checkingPlayerSessionId;

      const player = this.players.get(checkerPlayerSessionId)
      nextTurnByPlayerNumber = player.playerNumber
    }

    setTimeout(() => {
      this.setCurrentTurnBy(nextTurnByPlayerNumber);
    }, 1000)
  }

  checkCheckingTable(sessionId: string) {
    const checkingPlayerSessionId = this.checkingTable.lastTurnBy;
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
                this.checkWinner(sessionId, checkingPlayerSessionId, correctCards, cardsCount);
              }, 2000)
            }

            interval = increaseCardDelay(interval);
            setTimeout(checkNextCard, interval);
        }
    }

    checkNextCard();
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
              this.table.clear();
              setTimeout(() => {
                this.endRound();
              }, 1000)
            }

            interval = increaseCardDelay(interval);
            setTimeout(transferNextCard, interval);
        }
    }

    transferNextCard();
  }

  nextTurn() {
    this.setCurrentTurnBy("");
    this.turnNumber += 1;

    const player = this.players.get(this.previousTurnBy);
    const nextTurnPlayerNumber = this.getNextPlayerNumber(player.playerNumber);;

    // Next turn will start after 500 ms.
    setTimeout(() => {
      this.setCurrentTurnBy(nextTurnPlayerNumber);
    }, 500)
  }

  endRound() {
    this.isResetingRound = true;
    setTimeout(() => {
      this.players.forEach(player => {
          if (!player.isLeftFromTable) this.dealCardsToPlayer(player.sessionId, START_CARDS_COUNT);
      })
      this.nextRound();
    }, 1000)
  }

  nextRound() {

    //this.room.broadcast("shuffleEnemyCards");
    this.room.broadcast("nextRound");
    this.checkingTable.clear();
    this.table.clear();
    this.currentFakeCardName = ""
    this.turnNumber = 1;
    this.round += 1;

    // Wait 1 s. then start next round
    setTimeout(() => {
      this.isResetingRound = false;
    }, 1000)
  }
  

}

