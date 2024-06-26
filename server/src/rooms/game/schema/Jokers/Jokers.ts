import { GameRoom } from "../../GameRoom";
import { Player } from "../Player";
import { Joker, JokerData } from "./Joker";
import { Card, CARD_TYPES } from "../Card";

const enum JokerConditions {
    CardValueToPlayHasChosen, TableHasCards,
    PlayerHasCards, TableHasTurns, DeckHasCards
}

const enum JokerEvents {
    LikeAnyCard, DuplicateCard, ChangeCardType,
    ShowTableCards, ExchangeAllPlayers, DestroyRandomCardsFromHand,
    ShuffleTableCards, CheckPreviousPlayerCards, ChangeTableFakeCardName,
    AddCardsFromDeck, AddCardsFromTable, DestroySelectedCards
}

const enum Buffs {
    DisablePossibilityToCheck
}

type JokerType = {
    name: string;
    rarity: number;
    eventType: JokerEvents;
    config: {cardsCount?: number, newCardType?: CARD_TYPES};
    conditions: JokerConditions[];
    conditionsData: {cardsCount?: number, turnsCount?: number};
    buffs: Buffs[];
}


export function createJoker(name: string, id: number, player: Player): Joker {
    switch (name) {
        case "Joker":
            return new J_Joker(id, player);
        case "Textiler":
            return new J_Textiler(id, player);
        case "Cheater":
            return new J_Cheater(id, player);
        case "Scout":
            return new J_Scout(id, player);
        case "Exchanger":
            return new J_Exchanger(id, player);
        case "Tax collector":
            return new J_TaxCollector(id, player);
        case "Dealer":
            return new J_Dealer(id, player);
        case "I knew...":
            return new J_IKnew(id, player);
        case "New breathe":
            return new J_NewBreathe(id, player);
        case "Additive":
            return new J_Additive(id, player);
        case "Thief":
            return new J_Thief(id, player);
        case "Elector":
            return new J_Elector(id, player);
        default:
            return null;
    }
}

export const Jokers: JokerType[] = [
    {name: "Joker", rarity: 1, eventType: JokerEvents.LikeAnyCard, config: {}, conditions: [JokerConditions.CardValueToPlayHasChosen], conditionsData: {}, buffs: []}, // Джокер
    {name: "Textiler", rarity: 1, eventType: JokerEvents.DuplicateCard, config: {}, conditions: [], conditionsData: {}, buffs: []}, // Текстильщик
    {name: "Cheater", rarity: 1, eventType: JokerEvents.ChangeCardType, config: {newCardType: CARD_TYPES.Glass}, conditions: [], conditionsData: {}, buffs: []}, // Шуелёр
    {name: "Scout", rarity: 1, eventType: JokerEvents.ShowTableCards, config: {cardsCount: 1}, conditions: [JokerConditions.TableHasCards], conditionsData: {cardsCount: 1}, buffs: []}, // Разведчик
    {name: "Exchanger", rarity: 1, eventType: JokerEvents.ExchangeAllPlayers, config: {}, conditions: [], conditionsData: {}, buffs: []}, // Обменщик
    {name: "Tax collector", rarity: 1, eventType: JokerEvents.DestroyRandomCardsFromHand, config: {cardsCount: 1}, conditions: [JokerConditions.PlayerHasCards], conditionsData: {cardsCount: 1}, buffs: []}, // Налогосборщик
    {name: "Dealer", rarity: 1, eventType: JokerEvents.ShuffleTableCards, config: {}, conditions: [JokerConditions.TableHasCards], conditionsData: {cardsCount: 3}, buffs: []}, // Дилер
    {name: "I knew...", rarity: 1, eventType: JokerEvents.CheckPreviousPlayerCards, config: {}, conditions: [JokerConditions.TableHasTurns], conditionsData: {turnsCount: 2}, buffs: []}, // А я знал....
    {name: "New breathe", rarity: 1, eventType: JokerEvents.ChangeTableFakeCardName, config: {}, conditions: [JokerConditions.TableHasCards], conditionsData: {cardsCount: 1}, buffs: []}, // Новое дыхание
    {name: "Additive", rarity: 1, eventType: JokerEvents.AddCardsFromDeck, config: {cardsCount: 2}, conditions: [JokerConditions.DeckHasCards], conditionsData: {cardsCount: 2}, buffs: []}, // Добавка
    {name: "Thief", rarity: 1, eventType: JokerEvents.AddCardsFromTable, config: {cardsCount: 2}, conditions: [JokerConditions.TableHasCards], conditionsData: {cardsCount: 2}, buffs: [Buffs.DisablePossibilityToCheck]}, // Вор
    {name: "Elector", rarity: 1, eventType: JokerEvents.DestroySelectedCards, config: {cardsCount: 3}, conditions: [JokerConditions.PlayerHasCards], conditionsData: {cardsCount: 3}, buffs: []}, // Избиратель
]

interface JJokerData extends JokerData {

}
class J_Joker extends Joker {
    value: string;
    suit: string;
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Joker";
    }
    use(data?: JokerData) {

    }
}


class J_Textiler extends Joker {
    private duplicatesCount = 1; // NOT WORKING WITH MORE
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Textiler";
    }
    use(data?: JokerData) {
        if (this.player.selectedCards.length > 0) {
            for (let i = 0; i < this.duplicatesCount; i++) {
                console.log(i, this.player.selectedCards[i].name);
                this.duplicateCard(this.player.selectedCards[i]);
            }
        }
        else {
            console.log(`Selected wrong cards count[${this.player.selectedCards.length}], need(${this.duplicatesCount})`)
        }
    }
    duplicateCard(card: Card) {
        this.roomState.deck.createCard(card.suit, card.value, card.type);
        const duplicated_card = this.roomState.deck.getCard(true);
        // assign card to player
        setTimeout(() => this.player.addCardToHand(duplicated_card), 100)
    }
}
class J_Cheater extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Cheater";
    }
    use(data?: any) {

    }
}
class J_Scout extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Scout";
    }
    use(data?: any) {

    }
}
class J_Exchanger extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Exchanger";
    }
    use(data?: any) {

    }
}
class J_TaxCollector extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Tax collector";
    }
    use(data?: any) {

    }
}
class J_Dealer extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Dealer";
    }
    use(data?: any) {

    }
}
class J_IKnew extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "I knew...";
    }
    use(data?: any) {

    }
}
class J_NewBreathe extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "New breathe";
    }
    use(data?: any) {

    }
}
class J_Additive extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Additive";
    }
    use(data?: any) {

    }
}
class J_Thief extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Thief";
    }
    use(data?: any) {

    }
}
class J_Elector extends Joker {
    constructor(id: number, player: Player) {
        super(id, player);
        this.name = "Elector";
    }
    use(data?: any) {

    }
}
