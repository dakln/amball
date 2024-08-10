import { CardRanks } from "../enums/CardEnums.js"

export interface IPlayCardMessage {
    playingRank: CardRanks;
    cardIds: number[];
}

export const message: IPlayCardMessage = {
    playingRank: CardRanks.Ace,
    cardIds: [0, 1, 2]
}

