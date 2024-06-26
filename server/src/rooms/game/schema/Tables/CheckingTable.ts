import { type } from "@colyseus/schema";
import { CARD_MAX_INTERVAL } from "../Card";
import { increaseCardDelay } from "../MiscFunctions";
import { GameRoomState } from "../GameRoomState";
import { DELAY_BEFORE_END_ROUND } from "../Delays";
import { CardCollection } from "../CardCollection";
import { GameRoom } from "../../GameRoom";

export class CheckingTable extends CardCollection {
    room: GameRoom;
    roomState: GameRoomState;

    public fakeCardValue: string = "";
    @type("string") checker: string = "" // SessionId

    @type("string") winner: string = ""; // SessionId
    @type("string") loser: string = ""; // SessionId
    
    @type("string") lastTurnBy: string = ""; // SessionId
    
    constructor(room: GameRoom, state: GameRoomState) {
        super();
        this.room = room;
        this.roomState = state;
    }

    reset() {
        this.fakeCardValue = ""
        this.checker = "",
        this.winner = "",
        this.loser = "",
        this.lastTurnBy = "",
        this.clearCardCollection();
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
                this.room.broadcast("checkCard", card);
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
                        this.roomState.endRound();
                    }, (DELAY_BEFORE_END_ROUND * 1000) / this.room.GAME_SPEED)
                }
    
                interval = increaseCardDelay(interval);
                setTimeout(checkNextCard, interval);
            }
        }
    
        checkNextCard();
    }

}