import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL} from "./Card";
import { GameRoom } from "../GameRoom";
import { CardCollection } from "./CardCollection";
import { GameRoomState } from "./GameRoomState";
import { Joker } from "./Jokers/Joker";
import { createJoker } from "./Jokers/Jokers";
import { increaseCardDelay } from "./MiscFunctions";

export type CreatePlayerOptions = {
    sessionId: string;
    username: string;

    room: GameRoom;
    state: GameRoomState;
}


export class Player extends Schema {
    @type("number") MAX_SELECTION_SIZE = 4; // Max selected cards available
    static readonly DEFAULT_HAND_SIZE = 9; // Max selected cards
    room: GameRoom;
    roomState: GameRoomState;

    @type("number") playerNumber: number;
    @type("string") sessionId: string;
    @type("string") username: string;

    @type(CardCollection) hand = new CardCollection();
    @type ([ Card ]) selectedCards = new ArraySchema<Card>();

    @type([ Joker ]) jokers = new ArraySchema<Joker>();

    @type("boolean") isLeftFromTable: boolean = false;

    constructor(options: CreatePlayerOptions) {
        super();
        this.sessionId = options.sessionId;
        this.username = options.username;
        this.room = options.room;
        this.roomState = options.state;

        this.addJoker(createJoker('Textiler', 0, this));
        // this.addJoker(createJoker('Textiler', 1, this));
        // this.addJoker(createJoker('Textiler', 2, this));
    }
    // Player hand
    addCardToHand(card: Card) {
        this.hand.addCard(card);
    }

    removeCardFromHand(card: Card) {
        this.hand.removeCard(card);

        if (this.hand.cards.length === 0 && this.roomState.deck.cards.length === 0) {
            this.isLeftFromTable = true;
        } else this.isLeftFromTable = false;
    }
    
    playSelectedCards(fakeCardValue: string) {
        this.roomState.playerTurn(this.sessionId, fakeCardValue, this.selectedCards);
        const cardsCount = this.selectedCards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const playNextCard = () => {
            if (index < cardsCount) {
                const card = this.selectedCards[index];
                this.dropCardToTable(card);
                index++;
                // When all cards were played
                if (index === cardsCount) {
                    this.selectedCards = new ArraySchema();
                    this.roomState.endTurn(this.sessionId);
                }
    
                interval = increaseCardDelay(interval);
                setTimeout(playNextCard, interval);
            }
        }
    
        playNextCard();
    }

    dropCardToTable(card: Card) {
        this.hand.removeCard(card);
        this.roomState.table.addCard(card);
        
        this.roomState.table.addCard(card);
        this.roomState.checkingTable.addCard(card);
    }

    dropSelectedCards() {
        this.roomState.dropsCollection.addDrop(this.sessionId, this.selectedCards);
        const cardsCount = this.selectedCards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const dropNextCard = () => {
            if (index < cardsCount) {
                const card = this.selectedCards[index];
                this.dropCard(card);
                index++;
    
                if (index === cardsCount) {
                    this.selectedCards = new ArraySchema();
                }

                interval = interval = increaseCardDelay(interval);
                setTimeout(dropNextCard, interval);
            }
        }

        dropNextCard();
    }

    dropCard(card: Card) {
        this.removeCardFromHand(card);
        this.room.broadcast("dropCard", card);
    }

    // Player jokers
    createJoker(name: string): Joker {
        const jokerId = 0;
        return createJoker(name, jokerId, this)
    }

    addJoker(joker: Joker) {
        this.jokers.push(joker);
    }

    removeJoker(joker: Joker) {
        const index = this.jokers.findIndex(j => j.id === joker.id && joker.name === joker.name)
        if (index > -1) {
            this.jokers.splice(index, 1);
        }
    }

    useJoker(id: number, name: string, data?: any) {
        const joker = this.jokers.find(j => j.id === id && j.name === name)
        if (joker) {
            if (data !== undefined) {
                joker.use(data);
            }
            else {
                joker.use()
            }
            this.removeJoker(joker);
        } 
        else {
            console.log(`Player have no Joker {id: ${id}, name: ${name}}`);
        }
    }

    buyJoker(joker: Joker) {

    }

    sellJoker(joker: Joker) {

    }

    // Card selection
    selectCard(card: Card) {
        if (this.selectedCards.length < this.MAX_SELECTION_SIZE) {
            this.selectedCards.push(card);
        }
    }

    deselectCard(card: Card) {
        const index = this.selectedCards.findIndex(c => c.id === card.id && c.name === card.name)
        if (index > -1) {
            this.selectedCards.splice(index, 1);
        }
    }

    clearSelectedCards() {
        this.selectedCards = new ArraySchema<Card>();
    }
}