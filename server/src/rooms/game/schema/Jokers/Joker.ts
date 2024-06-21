import { Schema, type } from "@colyseus/schema";
import { Player } from "../Player";

const enum JokerConditions {
    CardValueToPlayHasChosen, TableHasCards,
    PlayerHasCards, TableHasTurns, DeckHasCards
}
export const enum JokerEvents {
    LikeAnyCard, DuplicateCard, ChangeCardType,
    ShowTableCards, ExchangeAllPlayers, DestroyRandomCardsFromHand,
    ShuffleTableCards, CheckPreviousPlayerCards, ChangeTableFakeCardName,
    AddCardsFromDeck, AddCardsFromTable, DestroySelectedCards
}

const enum Buffs {
    DisablePossibilityToCheck
}

interface JokerType {
    name: string;
    rarity: number;
    eventType: JokerEvents;
    config: Object;
    conditions: JokerConditions[];
    conditionsData: Object;
    buffs: Buffs[];
}

export const Jokers: JokerType[] = [
    {name: "Joker", rarity: 1, eventType: JokerEvents.LikeAnyCard, config: {}, conditions: [JokerConditions.CardValueToPlayHasChosen], conditionsData: {}, buffs: []}, // Джокер
    {name: "Textiler", rarity: 1, eventType: JokerEvents.DuplicateCard, config: {}, conditions: [], conditionsData: {}, buffs: []}, // Текстильщик
    {name: "Cheater", rarity: 1, eventType: JokerEvents.ChangeCardType, config: {newCardType: "glass"}, conditions: [], conditionsData: {}, buffs: []}, // Шуелёр
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

function findJokerByName(name: string) {
    return Jokers.find(joker => joker.name === name);
}

export class Joker extends Schema {
    player: Player;
    @type("string") name: string;
    @type("number") rarity: number;
    eventType: JokerEvents;
    
    constructor(name: string, player: Player) {
        super();
        this.name = name;
        this.player = player
        this.init();
    }
    init() {
        const joker = findJokerByName(this.name);
        this.eventType = joker.eventType;
    }

    use(data: any) {
        switch (this.eventType) {
            case JokerEvents.DuplicateCard:
                this.player.room.state.createNewCard(data.card, this.player.sessionId);
                break;
        }
    }
}