import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL } from "./Card";
import { Player } from "./Player";
import { increaseCardDelay } from "./MiscFunctions";
import { GameRoomState } from "./GameRoomState";
import { GameRoom } from "../GameRoom";

const SUITS: string[] = ["Hearts", "Clubs", "Diamonds", "Spades"];
const VALUES: string[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];

export class Deck extends Schema {
    room: GameRoom;
    roomState: GameRoomState;
    lastCreatedCard: Card;

    @type("string") type: string;
    @type([ Card ]) cards = new ArraySchema<Card>();

    constructor(deckType: string, room: GameRoom, state: GameRoomState) {
        super();
        this.type = deckType;
        this.room = room;
        this.roomState = state;
        this.init();
    }

    init() {
        for (let SuitId = 0; SuitId < SUITS.length; SuitId++) {
            let suit: string = SUITS[SuitId];
            for (let ValueId = 0; ValueId < VALUES.length; ValueId++) {
                let value: string = VALUES[ValueId];
                switch (this.type) {
                    case "36":
                        if (value !== "2" && value !== "3" && value !== "4" && value !== "5") {
                            this.createCard(suit, value, "Default", 0);
                        }
                        break;
                    case "52":
                        this.createCard(suit,value,"Default", 0);
                        break;
                    default:
                        break;
                }
            }
        }
    }

    getCardsCountByName(name: string) {
        let cardsCount: number = 0;
        const allCards: Card[] = [];
        this.roomState.players.forEach(player => {
            player.hand.cards.forEach(card => {
                allCards.push(card);
            })
        })
        
        allCards.forEach(card => {
            if (card.name === name) cardsCount++;
        })
        return cardsCount;
    }

    addCard(card: Card) {
        this.cards.push(card);
    }
    createCard(suit: string, value: string, type: string, customId?: number) {
        let name: string = `${value} of ${suit}`
        let id: number = this.getCardsCountByName(name);
        let card = new Card().assign({
            id: (customId) ? customId : id,
            name: name,
            suit: suit,
            value: value,
            type: type
        })
        this.cards.push(card);
        this.lastCreatedCard = card;
        if (customId !== 0) this.room.broadcast("createNewCard", card);
    }

    getCard(lastCreated?: boolean) {
        if (this.cards.length > 0) {
            let card: Card;
            let index: number;
            if (lastCreated) {
                const lc_card = this.lastCreatedCard;
                index = this.cards.findIndex(c => c.id === lc_card.id && c.name === lc_card.name);
                card = this.cards[index];
                this.cards.splice(index, 1);
                return card;
            } else {
                index = Math.floor(Math.random() * this.cards.length);
                card = this.cards[index];
                this.cards.splice(index, 1);
                return card;
            }
        } else return null
    }

    dealCards(player: Player, cardsCount: number) {
        if (player) {
            let index = 0;
            let interval = CARD_MAX_INTERVAL;
        
            const dealNextCard = () => {
              if ((index < cardsCount) && (this.cards.length > 0) && player.hand.cards.length < Player.DEFAULT_HAND_SIZE) {
                const card = this.getCard();
                player.addCardToHand(card);
                index++;
        
                interval = increaseCardDelay(interval);
                setTimeout(dealNextCard, interval);
              }
        
            }
            dealNextCard();
        }
      }
}