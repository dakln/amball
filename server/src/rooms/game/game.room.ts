import { Room, type Client } from 'colyseus';

import type { DeckType } from '@amball/contracts';

import { AmballGame, GameError } from './amball-game.ts';
import {
  MessageType,
  type DropMessage,
  type JokerMessage,
  type PlayMessage,
  type ShopSlotMessage,
} from './protocol.types.ts';

const MAX_PLAYERS = 4;
const MAX_NAME_LENGTH = 16;
/** Сколько все видят вскрытые карты, прежде чем стол уйдёт проигравшему. */
export const REVEAL_MS = 2500;
export const TURN_MS = 30000;
export const SHOP_MS = 30000;

interface JoinOptions {
  username?: unknown;
  deckType?: unknown;
}

function cleanName(raw: unknown, fallback: string): string {
  const name = typeof raw === 'string' ? raw.trim().slice(0, MAX_NAME_LENGTH) : '';
  return name.length > 0 ? name : fallback;
}

export class GameRoom extends Room {
  public override maxClients = MAX_PLAYERS;

  private game = new AmballGame();
  private guestCounter = 1;

  public override onCreate(options: JoinOptions): void {
    const deckType: DeckType = options?.deckType === '52' ? '52' : '36';
    this.game = new AmballGame(deckType);

    this.handle(MessageType.Ready, () => {});
    this.handle(MessageType.Start, (client) => {
      this.game.start(client.sessionId);
      void this.lock();
    });
    this.handle<PlayMessage>(MessageType.Play, (client, message) =>
      this.game.play(client.sessionId, numbers(message?.cardIds), message?.rank),
    );
    this.handle(MessageType.Check, (client) => {
      this.game.check(client.sessionId);
    });
    this.handle<DropMessage>(MessageType.Drop, (client, message) =>
      this.game.drop(client.sessionId, numbers(message?.cardIds)),
    );
    this.handle<JokerMessage>(MessageType.Joker, (client, message) =>
      this.game.useJoker(client.sessionId, {
        jokerId: Number(message?.jokerId),
        cardIds: numbers(message?.cardIds ?? []),
        ...(message?.rank === undefined ? {} : { rank: message.rank }),
      }),
    );
    this.handle<ShopSlotMessage>(MessageType.ShopBuy, (client, message) =>
      this.game.shopBuy(client.sessionId, Number(message?.slot)),
    );
    this.handle<ShopSlotMessage>(MessageType.ShopReroll, (client, message) =>
      this.game.shopReroll(client.sessionId, Number(message?.slot)),
    );
    this.handle(MessageType.ShopReady, (client) => {
      this.game.shopReady(client.sessionId);
    });
    this.handle(MessageType.Rematch, (client) => {
      this.game.rematch(client.sessionId);
    });
  }

  public override onJoin(client: Client, options: JoinOptions): void {
    this.game.addPlayer(
      client.sessionId,
      cleanName(options?.username, `Игрок ${this.guestCounter++}`),
    );
    this.publish();
  }

  public override onLeave(client: Client): void {
    this.game.removePlayer(client.sessionId);
    this.publish();
  }

  private handle<T>(type: string, action: (client: Client, message: T) => void): void {
    this.onMessage(type, (client: Client, message: T) => {
      try {
        action(client, message);
        this.publish();
      } catch (error) {
        // Ошибки правил — ответ игроку; всё остальное — сбой сервера, его не глотаем.
        if (!(error instanceof GameError)) throw error;
        client.send(MessageType.Refused, error.message);
      }
    });
  }

  private publish(): void {
    this.syncTimer();
    for (const client of this.clients) {
      client.send(MessageType.View, this.game.viewFor(client.sessionId));
    }
    if (this.game.phase === 'reveal') this.scheduleReveal();
  }

  private timerKey: string | null = null;
  private timer: { clear(): void } | null = null;

  /** Один отсчёт на ход или витрину; на новом ходу он начинается заново. */
  private syncTimer(): void {
    const { phase, stamp } = this.game;
    const timed = phase === 'playing' || phase === 'shop';
    const key = timed ? `${phase}-${stamp}` : null;
    if (key === this.timerKey) return;
    this.timerKey = key;
    this.timer?.clear();
    this.timer = null;
    this.game.deadlineAt = null;
    if (!timed) return;
    const ms = phase === 'shop' ? SHOP_MS : this.game.turnDuration(TURN_MS);
    this.game.deadlineAt = Date.now() + ms;
    this.timer = this.clock.setTimeout(() => {
      this.timerKey = null;
      if (this.game.phase === 'shop') this.game.closeShop();
      else this.game.autoPlay();
      this.publish();
    }, ms);
  }

  private revealPending = false;

  private scheduleReveal(): void {
    if (this.revealPending) return;
    this.revealPending = true;
    this.clock.setTimeout(() => {
      this.revealPending = false;
      this.game.resolveReveal();
      this.publish();
    }, REVEAL_MS);
  }
}

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number) : [];
}
