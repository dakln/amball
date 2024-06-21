import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL } from "../Card";
import { Player } from "../Player";
import { increaseCardDelay } from "../MiscFunctions";
import { GameRoomState } from "../GameRoomState";

export class Table extends Schema {
    private state: GameRoomState;
    @type("string") lastTurnBy: string = ""; // SessionId
    @type("string") fakeCardValue: string = "";
    @type([ Card ]) cards = new ArraySchema<Card>();

    constructor() {
        super();
    }

    setup(state: GameRoomState) {
        this.state = state;
    }

    reset() {
        this.cards.clear();
        this.lastTurnBy = "";
        this.fakeCardValue = "";
    }
    setFakeCardValue(fakeCardValue: string) {
        this.fakeCardValue = fakeCardValue;
    }

    addCard(card: Card, sessionId: string) {
        this.lastTurnBy = sessionId;
        this.cards.push(card);
    }

    transferAllCardsToPlayer(player: Player) {
        if (player) {
            const cardsCount = this.cards.length;
            let index = 0;
            let interval = CARD_MAX_INTERVAL;
        
            const transferNextCard = () => {
                if (index < cardsCount) {
                    const card = this.cards[index];
                    player.addCard(card);
                    index++;
        
                    if (index === cardsCount) {
                      this.reset();
                      this.state.prepareNextRound();
                    }
        
                    interval = increaseCardDelay(interval);
                    setTimeout(transferNextCard, interval);
                }
            }
        
            transferNextCard();
        }
    }

}