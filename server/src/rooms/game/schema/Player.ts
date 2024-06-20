import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { GameRoom } from "../GameRoom";
import { findCardByName, findCardsByNameAndId, getCardIndexInArray, increaseCardDelay } from "./MiscFunctions";
import { Joker } from "./Joker";

export const START_CARDS_COUNT = 9;
const MAX_SELECTED_CARDS = 4;
export class Player extends Schema {
    private room: GameRoom;
    @type("number") playerNumber: number;
    @type("string") sessionId: string;
    @type("string") username: string;
    @type([ Card ]) cards: ArraySchema<Card> = new ArraySchema<Card>();
    //@type([ Joker ]) jokers = new ArraySchema<Joker>();
    @type([ Card ]) selectedCards: ArraySchema<Card> = new ArraySchema<Card>();
    @type("boolean") isLeftFromTable: boolean = false;

    constructor(sessionId: string, options: any, room: GameRoom) {
        super();
        this.sessionId = sessionId;
        this.username = (options.username !== undefined) ? options.username : "User" + Math.round(Math.random() * 100);
        this.room = room;
        
    }

    removeCard(card: Card, cards: ArraySchema<Card>) {
        const cardIndex = getCardIndexInArray(cards, card);
        if (cardIndex !== -1) {
            cards.splice(cardIndex, 1);
            if (this.cards.length === 0 && this.room.state.deck.cards.length === 0) {
                this.isLeftFromTable = true;
            } else this.isLeftFromTable = false;
        }
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
        const cardIndex = getCardIndexInArray(this.selectedCards, card);
        if (cardIndex !== -1) {
            this.selectedCards.splice(cardIndex, 1);
        }
    }

    playCards(fakeCardValue: string, cards: ArraySchema<Card>) {
        this.room.state.playerTurn(this.sessionId, fakeCardValue, cards);
        const cardsCount = cards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const playNextCard = () => {
            if (index < cardsCount) {
                const card = cards[index];
                this.playCard(card);
                index++;
                // When all cards were played
                if (index === cardsCount) {
                    this.room.state.endTurn(this.sessionId);
                }
    
                interval = increaseCardDelay(interval);
                setTimeout(playNextCard, interval);
            }
        }
    
        playNextCard();
    }

    playCard(card: Card) {
        this.removeCard(card, this.cards);
        //this.removeCard(card, this.selectedCards);

        this.room.state.table.addCard(card, this.sessionId);
        this.room.state.checkingTable.addCard(card, this.sessionId);
    }

    dropCards(cards: ArraySchema<Card>) {
        const cardsCount = cards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const dropNextCard = () => {
            if (index < cardsCount) {
                const card = cards[index];
                this.dropCard(card);
                index++;
    
                if (index === cardsCount) {
                    cards.clear();
                }

                interval = interval = increaseCardDelay(interval);
                setTimeout(dropNextCard, interval);
            }
        }

        dropNextCard();

        this.room.state.droppedTable.addDrop(this.sessionId, this.selectedCards);
    }

    dropCard(card: Card) {
        this.room.broadcast("dropCard", card.name);
    }

}