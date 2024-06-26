import { type } from "@colyseus/schema";
import { CARD_MAX_INTERVAL } from "../Card";
import { Player } from "../Player";
import { increaseCardDelay } from "../MiscFunctions";
import { GameRoomState } from "../GameRoomState";
import { CardCollection } from "../CardCollection";
import { GameRoom } from "../../GameRoom";

export class Table extends CardCollection {
    room: GameRoom;
    roomState: GameRoomState;

    @type("string") lastTurnBy: string = ""; // SessionId
    @type("string") fakeCardValue: string = "";

    constructor(room: GameRoom, state: GameRoomState) {
        super()
        this.room = room;
        this.roomState = state;
    }

    reset() {
        this.clearCardCollection();
        this.lastTurnBy = "";
        this.fakeCardValue = "";
    }
    setFakeCardValue(fakeCardValue: string) {
        this.fakeCardValue = fakeCardValue;
    }

    transferAllCardsToPlayer(player: Player) {
        if (player) {
            const cardsCount = this.cards.length;
            let index = 0;
            let interval = CARD_MAX_INTERVAL;
        
            const transferNextCard = () => {
                if (index < cardsCount) {
                    const card = this.cards[index];
                    player.addCardToHand(card);
                    index++;
        
                    if (index === cardsCount) {
                      this.reset();
                      this.roomState.prepareNextRound();
                    }
        
                    interval = increaseCardDelay(interval);
                    setTimeout(transferNextCard, interval);
                }
            }
        
            transferNextCard();
        }
    }

}