import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL} from "./Card";
import { GameRoom } from "../GameRoom";
import { increaseCardDelay } from "./MiscFunctions";
import { Joker } from "./Jokers/Joker";
//import { Joker } from "./Joker";

export const START_CARDS_COUNT = 9;
const MAX_SELECTED_CARDS = 4;

export class Player extends Schema {
    room: GameRoom;
    @type("number") playerNumber: number;
    @type("string") sessionId: string;
    @type("string") username: string;
    //@type([ Joker ]) jokers = new ArraySchema<Joker>();
    @type([ Card ]) cards  = new ArraySchema<Card>();
    @type([ Card ]) selectedCards = new ArraySchema<Card>();
    @type("boolean") isLeftFromTable: boolean = false;

    constructor(sessionId: string, options: any, room: GameRoom) {
        super();
        this.sessionId = sessionId;
        this.username = (options.username !== undefined) ? options.username : "User" + Math.round(Math.random() * 100);
        this.room = room;
        
    }

    removeCard(card: Card) {
        const cardIndex = this.cards.findIndex(c => c.id === card.id && c.name === card.name)
        this.cards.splice(cardIndex, 1);
        if (this.cards.length === 0 && this.room.state.deck.cards.length === 0) {
            this.isLeftFromTable = true;
        } else this.isLeftFromTable = false;
    }

    addCard(card: Card) {
        this.cards.push(card);
        this.isLeftFromTable = false;
    } 

    selectCard(card: Card) {
        if (this.selectedCards.length < MAX_SELECTED_CARDS) {
            this.selectedCards.push(card);
        }
    }

    deselectCard(card: Card) {
        const cardIndex = this.selectedCards.findIndex(c => c.id === card.id && c.name === card.name)
        this.selectedCards.splice(cardIndex, 1);
    }

    playSelectedCards(fakeCardValue: string) {
        this.room.state.playerTurn(this.sessionId, fakeCardValue, this.selectedCards);
        const cardsCount = this.selectedCards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const playNextCard = () => {
            if (index < cardsCount) {
                const card = this.selectedCards[index];
                this.playCard(card);
                index++;
                // When all cards were played
                if (index === cardsCount) {
                    this.selectedCards = new ArraySchema();
                    this.room.state.endTurn(this.sessionId);
                }
    
                interval = increaseCardDelay(interval);
                setTimeout(playNextCard, interval);
            }
        }
    
        playNextCard();
    }

    playCard(card: Card) {
        this.removeCard(card);

        this.room.state.table.addCard(card, this.sessionId);
        this.room.state.checkingTable.addCard(card, this.sessionId);
    }

    dropSelectedCards() {
        this.room.state.droppedTable.addDrop(this.sessionId, this.selectedCards);
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
        this.removeCard(card);
        this.room.broadcast("dropCard", card);
    }

    useJoker(name: string, data: any) {
        const joker = new Joker(name, this)
        joker.use(data);
    }

}