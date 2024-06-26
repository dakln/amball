import { Schema, type } from "@colyseus/schema";
import { Player } from "../Player.js";
import { GameRoom } from "../../GameRoom";
import { GameRoomState } from "../GameRoomState";

export type JokerData = {
    
}

export abstract class Joker extends Schema {
    player: Player;
    room: GameRoom;
    roomState: GameRoomState;
    @type("number") id: number;
    @type("string") name: string;
    @type("number") rarity: number;
    @type("boolean") availableToUse: boolean = false;
    constructor(id: number, player: Player) {
        super();
        this.player = player;
        this.room = this.player.room;
        this.roomState = this.player.roomState;
        this.id = id;
    }


    abstract use(data?: JokerData): void;
    // use(data: any) {
    //     switch (this.eventType) {
    //         case JokerEvents.DuplicateCard:
    //             this.player.room.state.createNewCard(data.card, this.player.sessionId);
    //             break;
    //     }
    // }
}