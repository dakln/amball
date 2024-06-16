import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL, CARD_MIN_INTERVAL, CARD_SPEED_MULTIPLIER } from "./Card";
import { GameRoom } from "../GameRoom";
import { findCardByName, findCardByValue } from "./MiscFunctions";

export const START_CARDS_COUNT = 9;

export class Player extends Schema {
    private room: GameRoom;
    @type("number") playerNumber: number;
    @type("string") sessionId: string;
    @type("string") username: string;
    @type([ Card ]) cards = new ArraySchema<Card>();
    @type([ Card ]) selectedCards = new ArraySchema<Card>();

    constructor(sessionId: string, options: any, room: GameRoom) {
        super();
        this.sessionId = sessionId;
        this.username = options.username;
        this.room = room;
        
    }

    removeCard(cardIndex: number) {
        this.cards.splice(cardIndex, 1);

        this.room.broadcast('updatePlayerHand', this.sessionId);
    }

    addCard(card: Card) {
        this.cards.push(card);
        //console.log('Adding card to', this.sessionId);
        // send update my hand
        this.room.broadcast('addCardToPlayer', {sessionId: this.sessionId, cardName: card.name});
    } 

    selectCard(cardName: string) {
        const card = findCardByName(this.cards, cardName)
        if (card !== null) {
            //const cardIndex = this.cards.indexOf(card);
            //this.cards.splice(cardIndex, 1);
            this.selectedCards.push(card);
        }
    }

    deselectCard(cardName: string) {
        const card = findCardByName(this.selectedCards, cardName)
        if (card !== null) {
            const cardIndex = this.selectedCards.indexOf(card);
            this.selectedCards.splice(cardIndex, 1);
            //this.cards.push(card);
        }
    }

    playSelectedCards(fakeCardName: string) {
        this.room.state.playerTurn(this.sessionId, fakeCardName);

        const cardsCount = this.selectedCards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const playNextCard = () => {
            if (index < cardsCount) {
                const card = this.selectedCards[index];
                this.playCard(card);
                index++;

                if (index === cardsCount) {
                    this.selectedCards.clear();
                    this.room.state.nextTurn();
                }
    
                // Увеличиваем интервал с учетом количества карт
                interval *= CARD_SPEED_MULTIPLIER;
                if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
                //console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
                setTimeout(playNextCard, interval); // Планируем добавление следующей карты
            }
        }
    
        playNextCard(); // Запускаем процесс добавления карт
    }

    playCard(card: Card) {
        const cardIndex = this.cards.indexOf(card);
        const selectedCardIndex = this.selectedCards.indexOf(card);
        
        this.removeCard(cardIndex);

        this.room.state.table.addCard(card, this.sessionId);
        this.room.state.checkingTable.addCard(card, this.sessionId);
    }

    dropSelectedCards() {
        const cardsCount = this.selectedCards.length;
        let index = 0;
        let interval = CARD_MAX_INTERVAL;
    
        const dropNextCard = () => {
            if (index < cardsCount) {
                const card = this.selectedCards[index];
                this.dropCard(card);
                index++;
    
                if (index === cardsCount) this.selectedCards.clear();
                // Увеличиваем интервал с учетом количества карт
                interval *= CARD_SPEED_MULTIPLIER;
                if (interval < CARD_MIN_INTERVAL) interval = CARD_MIN_INTERVAL
                //console.log(`Next card will be added in ${interval.toFixed(2)} ms`);
                setTimeout(dropNextCard, interval); // Планируем добавление следующей карты
            }
        }
    
        dropNextCard(); // Запускаем процесс добавления карт
    }

    dropCard(card: Card) {
        this.room.broadcast("dropCard", card.name);

        const cardIndex = this.cards.indexOf(card);
        
        this.removeCard(cardIndex);

        this.room.state.droppedTable.addCard(card, this.sessionId);
    }

}