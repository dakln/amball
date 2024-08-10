import { CardRanks } from "../enums/CardEnums"

export interface IMakeTurnMessage {
    playingRank: CardRanks;
    cardIds: number[];    
}