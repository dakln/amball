import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL } from "../Card";
import { increaseCardDelay } from "../MiscFunctions";
import { GameRoomState } from "../GameRoomState";
import { DELAY_BEFORE_END_ROUND } from "../Delays";

export class CheckingTable extends Schema {
    private state: GameRoomState;
    public fakeCardValue: string = "";
    @type("string") checker: string = "" // SessionId

    @type("string") winner: string = ""; // SessionId
    @type("string") loser: string = ""; // SessionId
    
    @type("string") lastTurnBy: string = ""; // SessionId
    @type([ Card ]) cards = new ArraySchema<Card>();
    
    constructor() {
        super();
    }
    setup(state: GameRoomState) {
        this.state = state;
    }

    reset() {
        this.fakeCardValue = ""
        this.checker = "",
        this.winner = "",
        this.loser = "",
        this.lastTurnBy = "",
        this.cards.clear();
    }

    clear() {
        this.cards.clear();
    }

    addCard(card: Card, sessionId: string) {
        this.lastTurnBy = sessionId;
        this.cards.push(card);
        if (this.fakeCardValue === "") {
            this.fakeCardValue = card.value;
        }
    }

    checkTable(sessionId: string) {
        this.checker = sessionId;
        const cardsCount = this.cards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
        let correctCards = 0;
    
        const checkNextCard = () => {
            if (index < cardsCount) {
                const card = this.cards[index];
    
                // Check card
                this.state.room.broadcast("checkCard", card);
                if (card.value === this.fakeCardValue) correctCards++
    
                index++;
    
                if (index === cardsCount) {
                    if (correctCards === this.cards.length) {
                        this.winner = this.lastTurnBy;
                        this.loser = this.checker;
                    } else {
                        this.winner = this.checker;
                        this.loser = this.lastTurnBy;
                    }
                    setTimeout(() => {
                        this.state.endRound();
                    }, (DELAY_BEFORE_END_ROUND * 1000) / this.state.room.GAME_SPEED)
                }
    
                interval = increaseCardDelay(interval);
                setTimeout(checkNextCard, interval);
            }
        }
    
        checkNextCard();
    }

}