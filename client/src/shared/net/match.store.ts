import { Client, type Room } from '@colyseus/sdk';

import {
  MessageType,
  type Card,
  type DeckType,
  type JokerCard,
  type JokerName,
  type PlayerView,
  type Rank,
} from '../../../server/src/game/protocol.types.ts';

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  `ws${location.protocol === 'https:' ? 's' : ''}://${location.host}/colyseus`;

const TOAST_MS = 2500;
const MAX_MONO_CARDS = 3;

/** Каким джокерам нужны выбранные карты и сколько. */
const JOKER_CARD_COUNT: Partial<Record<JokerName, number>> = {
  Joker: 1,
  Textiler: 1,
  Cheater: 1,
  Elector: 2,
  Alchemist: 2,
};

export interface MatchSnapshot {
  view: PlayerView | null;
  selected: number[];
  pickedRank: Rank | null;
  toast: string | null;
  connecting: boolean;
  inRoom: boolean;
  /** Джокер «Новое дыхание», ждущий выбора достоинства. */
  breathing: JokerCard | null;
}

const EMPTY: MatchSnapshot = {
  view: null,
  selected: [],
  pickedRank: null,
  toast: null,
  connecting: false,
  inRoom: false,
  breathing: null,
};

/** Состояние матча вне ECS: его пишет сеть, читают React и система карт. */
class MatchStore {
  public snapshot: MatchSnapshot = EMPTY;

  private room: Room | null = null;
  private listeners = new Set<() => void>();
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): MatchSnapshot => this.snapshot;

  public async enter(mode: 'create' | 'find', username: string, deckType: DeckType): Promise<boolean> {
    this.set({ connecting: true });
    try {
      const client = new Client(SERVER_URL);
      const options = { username, deckType };
      const room = await (mode === 'create'
        ? client.create('game', options)
        : client.joinOrCreate('game', options));
      this.room = room;
      room.onMessage(MessageType.View, (view: PlayerView) => this.receive(view));
      room.onMessage(MessageType.Refused, (text: string) => this.showToast(text));
      room.onLeave(() => {
        if (this.room === room) this.reset();
      });
      this.set({ connecting: false, inRoom: true });
      // Вид, отправленный до подписки, мог потеряться.
      room.send(MessageType.Ready);
      return true;
    } catch {
      this.set({ connecting: false });
      this.showToast('Не удалось подключиться к серверу');
      return false;
    }
  }

  public leave(): void {
    const room = this.room;
    this.room = null;
    this.reset();
    void room?.leave();
  }

  public toggleCard(id: number): void {
    if (this.snapshot.view?.phase === 'shop') return;
    const { selected } = this.snapshot;
    this.set({
      selected: selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id],
    });
  }

  public pickRank(rank: Rank): void {
    const { breathing, view } = this.snapshot;
    if (breathing !== null) {
      this.room?.send(MessageType.Joker, { jokerId: breathing.id, cardIds: [], rank });
      this.set({ breathing: null });
      return;
    }
    if (view?.tableRank != null) return;
    this.set({ pickedRank: rank });
  }

  public shopBuy(slot: number): void {
    this.room?.send(MessageType.ShopBuy, { slot });
  }

  public shopReroll(slot: number): void {
    this.room?.send(MessageType.ShopReroll, { slot });
  }

  public shopReady(): void {
    this.room?.send(MessageType.ShopReady);
  }

  public start(): void {
    this.room?.send(MessageType.Start);
  }

  public rematch(): void {
    this.room?.send(MessageType.Rematch);
  }

  public check(): void {
    this.room?.send(MessageType.Check);
  }

  public play(): void {
    const { view, selected, pickedRank } = this.snapshot;
    const rank = view?.tableRank ?? pickedRank;
    if (rank === null || rank === undefined) {
      this.showToast('Выберите достоинство');
      return;
    }
    this.room?.send(MessageType.Play, { cardIds: selected, rank });
    this.set({ selected: [] });
  }

  public drop(): void {
    this.room?.send(MessageType.Drop, { cardIds: this.snapshot.selected });
    this.set({ selected: [] });
  }

  public useJoker(joker: JokerCard): void {
    const { selected } = this.snapshot;
    if (joker.name === 'Monochrome') {
      if (selected.length < 1 || selected.length > MAX_MONO_CARDS) {
        this.showToast(`Сначала выберите карты: от 1 до ${MAX_MONO_CARDS}`);
        return;
      }
      this.room?.send(MessageType.Joker, { jokerId: joker.id, cardIds: selected });
      this.set({ selected: [] });
      return;
    }
    const needed = JOKER_CARD_COUNT[joker.name];
    if (needed !== undefined && selected.length !== needed) {
      this.showToast(`Сначала выберите карты: ${needed}`);
      return;
    }
    if (joker.name === 'NewBreathe') {
      this.set({ breathing: joker });
      this.showToast('Выберите новое достоинство');
      return;
    }
    this.room?.send(MessageType.Joker, {
      jokerId: joker.id,
      cardIds: needed === undefined ? [] : selected,
    });
    if (needed !== undefined) this.set({ selected: [] });
  }

  private receive(view: PlayerView): void {
    const inHand = new Set<number>(view.hand.map((card: Card) => card.id));
    this.set({
      view,
      breathing: view.currentId === view.youId ? this.snapshot.breathing : null,
      selected: this.snapshot.selected.filter((id) => inHand.has(id)),
      pickedRank: view.tableRank === null && this.snapshot.view?.tableRank !== null ? null : this.snapshot.pickedRank,
    });
  }

  private showToast(toast: string): void {
    this.set({ toast });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.set({ toast: null }), TOAST_MS);
  }

  private reset(): void {
    this.room = null;
    this.snapshot = EMPTY;
    this.emit();
  }

  private set(patch: Partial<MatchSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const match = new MatchStore();
