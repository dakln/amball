import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card, CARD_MAX_INTERVAL } from "./Card";
import { Player, START_CARDS_COUNT } from "./Player";
import { findCardByName, findCardsByNameAndId, increaseCardDelay } from "./MiscFunctions";

const DECK_TYPES: string[] = ["36","52"];
const SUITS: string[] = ["Hearts", "Clubs", "Diamonds", "Spades"];
const VALUES: string[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];
const CARD_TYPES: string[] = ["Default", "Glass"];

export class Deck extends Schema {
    @type("string") type: string;
    @type([ Card ]) cards = new ArraySchema<Card>();

    constructor(type: string) {
        super();
        this.type = type;
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
                            this.addCard(suit, value, "Default");
                        }
                        break;
                    case "52":
                        this.addCard(suit,value,"Default");
                        break;
                    default:
                        break;
                }
            }
        }
    }

    getCardsCountByName(name: string) {
        let cardsCount: number = 0;
        this.cards.forEach(card => {
            if (card.name === name) cardsCount++;
        })
        return cardsCount;
    }

    addCard(suit: string, value: string, type: string) {
        let name: string = `${value} of ${suit}`
        let id: number = this.getCardsCountByName(name);
        let card = new Card().assign({
            id: id,
            name: name,
            suit: suit,
            value: value,
            type: type
        })
        this.cards.push(card);        
    }

    getCard(name?: string, id?: number) {
        if (this.cards.length > 0) {
            let card: Card;
            let index: number;
            if (name) {
                card = findCardsByNameAndId(this.cards, name, id)
                if (card) return card
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
              if ((index < cardsCount) && (this.cards.length > 0) && player.cards.length < START_CARDS_COUNT) {
                const card = this.getCard();
                player.addCard(card);
                index++;
        
                interval = increaseCardDelay(interval);
                setTimeout(dealNextCard, interval);
              }
        
            }
            dealNextCard();
        }
      }
}